import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { ChatRequest, type ChatResponse } from "@lab/shared";
import { query } from "../db/client";
import { llmGateway } from "../llm/llmGateway";
import { logAudit } from "../logs/auditLogger";

// 学習用の固定ユーザー (seed と一致)。認証は本リポジトリの対象外。
const TRAINEE_USER_ID = "00000000-0000-0000-0000-000000000010";

const SYSTEM_PROMPT =
  "あなたは社内業務を支援する Assistant です。簡潔・中立に、根拠があれば添えて回答してください。";

/**
 * POST /api/chat (引き継ぎドキュメント §20.1)。
 *
 * Phase 3 では Router を介さず、入力をそのまま LLM Gateway(mock) に渡して応答する。
 * 一連の流れ (入力受領・LLM要求・LLM応答) を Audit Log に残し、
 * 会話を conversations/messages に保存する。
 */
export async function chatRoutes(app: FastifyInstance) {
  app.post("/api/chat", async (req, reply) => {
    const parsed = ChatRequest.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { message, assistant, workspaceId } = parsed.data;
    const requestId = randomUUID();

    await logAudit({
      workspaceId,
      userId: TRAINEE_USER_ID,
      requestId,
      eventType: "user_message_received",
      payload: { message, assistant },
    });

    // 会話を作成し、ユーザー発言を保存。
    const conv = await query<{ id: string }>(
      `INSERT INTO conversations(workspace_id, user_id, assistant) VALUES ($1,$2,$3) RETURNING id`,
      [workspaceId, TRAINEE_USER_ID, assistant],
    );
    const conversationId = conv.rows[0]!.id;
    await query(
      `INSERT INTO messages(conversation_id, role, content) VALUES ($1,'user',$2)`,
      [conversationId, message],
    );

    // Router は Phase 9。現状は選択された assistant をそのまま記録する。
    await logAudit({
      workspaceId,
      userId: TRAINEE_USER_ID,
      requestId,
      eventType: "assistant_selected",
      payload: { assistant },
    });

    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      { role: "user" as const, content: message },
    ];

    await logAudit({
      workspaceId,
      userId: TRAINEE_USER_ID,
      requestId,
      eventType: "llm_requested",
      payload: { taskName: "chat.reply", messageCount: messages.length },
    });

    let result;
    try {
      result = await llmGateway.generate({ taskName: "chat.reply", messages });
    } catch (err) {
      await logAudit({
        workspaceId,
        userId: TRAINEE_USER_ID,
        requestId,
        eventType: "guardrail_triggered",
        payload: { stage: "llm", error: err instanceof Error ? err.message : String(err) },
      });
      return reply.code(502).send({
        error: "LLM 呼び出しに失敗しました",
        detail: err instanceof Error ? err.message : String(err),
      });
    }

    const replyText = result.text ?? "";

    await logAudit({
      workspaceId,
      userId: TRAINEE_USER_ID,
      requestId,
      eventType: "llm_responded",
      payload: { provider: result.provider, usage: result.usage },
    });

    await query(
      `INSERT INTO messages(conversation_id, role, content) VALUES ($1,'assistant',$2)`,
      [conversationId, replyText],
    );

    const response: ChatResponse = {
      requestId,
      conversationId,
      assistant,
      reply: replyText,
      sources: [], // RAG は Phase 5 で埋まる
    };
    return response;
  });
}
