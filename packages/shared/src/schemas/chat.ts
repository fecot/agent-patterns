import { z } from "zod";

/**
 * Assistant の種類。
 * `auto` は Router Assistant に振り分けを任せるモード (本実装は Phase 9)。
 * 汎用語のみを使う方針 (引き継ぎドキュメント §2.3) に従う。
 */
export const AssistantKind = z.enum([
  "auto",
  "knowledge",
  "action",
  "report",
  "scoring",
]);
export type AssistantKind = z.infer<typeof AssistantKind>;

export const ChatRole = z.enum(["system", "user", "assistant", "tool"]);
export type ChatRole = z.infer<typeof ChatRole>;

export const ChatMessage = z.object({
  role: ChatRole,
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessage>;

/** POST /api/chat のリクエスト (引き継ぎドキュメント §20.1)。 */
export const ChatRequest = z.object({
  message: z.string().min(1, "message は必須です"),
  assistant: AssistantKind.default("auto"),
  workspaceId: z.string().min(1),
});
export type ChatRequest = z.infer<typeof ChatRequest>;

/** POST /api/chat のレスポンス。 */
export const ChatResponse = z.object({
  requestId: z.string(),
  conversationId: z.string(),
  assistant: AssistantKind,
  reply: z.string(),
  /** 回答の根拠 (RAG 実装後に埋まる。Phase 5)。 */
  sources: z
    .array(z.object({ documentId: z.string(), title: z.string() }))
    .default([]),
  /** 承認待ちになった実行案 (high risk Tool, Phase 6)。 */
  approvals: z
    .array(
      z.object({
        id: z.string(),
        toolName: z.string(),
        riskLevel: z.string(),
        status: z.string(),
        preview: z.unknown(),
      }),
    )
    .default([]),
});
export type ChatResponse = z.infer<typeof ChatResponse>;
