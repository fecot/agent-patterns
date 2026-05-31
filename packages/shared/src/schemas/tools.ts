import { z } from "zod";

/**
 * Tool のリスクレベル。
 * high は必ず Human Approval を通す (引き継ぎドキュメント §9.2, §15.2)。
 */
export const RiskLevel = z.enum(["low", "medium", "high"]);
export type RiskLevel = z.infer<typeof RiskLevel>;

/** Tool 実行時のコンテキスト (引き継ぎドキュメント §9.2)。 */
export const ToolContext = z.object({
  userId: z.string(),
  workspaceId: z.string(),
  requestId: z.string(),
  dryRun: z.boolean().optional(),
});
export type ToolContext = z.infer<typeof ToolContext>;

/** Tool 実行結果 (引き継ぎドキュメント §9.2)。 */
export const ToolError = z.object({
  code: z.string(),
  message: z.string(),
});
export type ToolError = z.infer<typeof ToolError>;

export interface ToolResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: z.infer<typeof ToolError>;
  /** approval が必要な場合 true (Phase 6 で利用)。 */
  requiresApproval?: boolean;
  /** 実行前プレビュー。書き込み系 Tool は必須。 */
  preview?: unknown;
}
