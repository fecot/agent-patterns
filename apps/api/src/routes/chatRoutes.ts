import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { ChatRequest, type ChatResponse } from "@lab/shared";
import { query } from "../db/client";
import { llmGateway } from "../llm/llmGateway";
import { logAudit } from "../logs/auditLogger";
import { toolRegistry } from "../tools";
import { runToolLoop, type ToolInvocation } from "../agent/runToolLoop";
import type { DocumentHit } from "../tools/searchDocumentsTool";
import type { QueryFn } from "../tools/searchRecordsTool";
import { createApproval } from "../approvals/approvalService";
import { inputGuardrail, outputGuardrail, SAFE_FALLBACK_REPLY } from "../guardrails/guardrails";

// 学習用の固定ユーザー (seed と一致)。認証は本リポジトリの対象外。
const TRAINEE_USER_ID = "00000000-0000-0000-0000-000000000010";

const SYSTEM_PROMPT =
  "あなたは社内業務を支援する Assistant です。簡潔・中立に、根拠があれば添えて回答してください。" +
  "必要に応じて提供された Tool を使い、検索結果を踏まえて回答してください。";

/**
 * POST /api/chat (引き継ぎドキュメント §20.1)。
 *
 * Phase 4: Router を介さず、Tool Calling ループ (LLM→Tool 実行→再入力) を回す。
 * 一連の流れ (入力受領・LLM要求/応答・Tool 実行) を Audit Log に残し、
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

    // 入力ガードレール: LLM に渡す前に弾く (Phase 9)。
    const inputCheck = inputGuardrail(message);
    if (!inputCheck.ok) {
      await logAudit({
        workspaceId,
        userId: TRAINEE_USER_ID,
        requestId,
        eventType: "guardrail_triggered",
        payload: { stage: "input", violations: inputCheck.violations },
      });
      return reply.code(400).send({ error: "入力が安全性チェックに引っかかりました", violations: inputCheck.violations });
    }

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

    // Router は Phase 10。現状は選択された assistant をそのまま記録する。
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

    let loop;
    try {
      loop = await runToolLoop({
        gateway: llmGateway,
        registry: toolRegistry,
        taskName: "chat.reply",
        messages,
        ctx: { userId: TRAINEE_USER_ID, workspaceId, requestId },
        onEvent: (eventType, payload) =>
          logAudit({ workspaceId, userId: TRAINEE_USER_ID, requestId, eventType, payload }),
      });
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

    // 出力ガードレール: ユーザーへ返す前に検査し、違反時は安全文に差し替える (Phase 9)。
    let replyText = loop.text;
    const outputCheck = outputGuardrail(replyText);
    if (!outputCheck.ok) {
      await logAudit({
        workspaceId,
        userId: TRAINEE_USER_ID,
        requestId,
        eventType: "guardrail_triggered",
        payload: { stage: "output", violations: outputCheck.violations },
      });
      replyText = SAFE_FALLBACK_REPLY;
    }

    await logAudit({
      workspaceId,
      userId: TRAINEE_USER_ID,
      requestId,
      eventType: "llm_responded",
      payload: {
        provider: loop.provider,
        usage: loop.usage,
        toolsUsed: loop.invocations.map((i) => i.name),
      },
    });

    await query(
      `INSERT INTO messages(conversation_id, role, content) VALUES ($1,'assistant',$2)`,
      [conversationId, replyText],
    );

    // requiresApproval を返した Tool 呼び出しを承認待ち(pending)として記録する。
    const approvals: ChatResponse["approvals"] = [];
    for (const inv of loop.invocations) {
      if (!inv.result.requiresApproval) continue;
      const tool = toolRegistry.get(inv.name);
      const row = await createApproval(
        {
          query: query as unknown as QueryFn,
          registry: toolRegistry,
          onEvent: (eventType, payload) =>
            logAudit({ workspaceId, userId: TRAINEE_USER_ID, requestId, eventType, payload }),
        },
        {
          workspaceId,
          userId: TRAINEE_USER_ID,
          toolName: inv.name,
          riskLevel: tool?.riskLevel ?? "high",
          input: inv.arguments,
          preview: inv.result.preview,
          requestedByAgent: assistant,
        },
      );
      approvals.push({
        id: row.id,
        toolName: row.toolName,
        riskLevel: row.riskLevel,
        status: row.status,
        preview: row.previewJson,
      });
    }

    const response: ChatResponse = {
      requestId,
      conversationId,
      assistant,
      reply: replyText,
      sources: extractSources(loop.invocations),
      approvals,
    };
    return response;
  });
}

/** searchDocuments Tool の結果から回答の根拠 (sources) を組み立てる。 */
function extractSources(
  invocations: ToolInvocation[],
): { documentId: string; title: string }[] {
  const sources = new Map<string, string>();
  for (const inv of invocations) {
    if (inv.name !== "searchDocuments" || !inv.result.ok) continue;
    const data = inv.result.data as { documents?: DocumentHit[] } | undefined;
    for (const doc of data?.documents ?? []) {
      sources.set(doc.documentId, doc.title);
    }
  }
  return [...sources].map(([documentId, title]) => ({ documentId, title }));
}
