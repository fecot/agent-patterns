import { z } from "zod";
import { RiskLevel } from "./tools";

/** Approval の状態遷移 (引き継ぎドキュメント §10.2)。 */
export const ApprovalStatus = z.enum([
  "pending",
  "approved",
  "rejected",
  "executed",
  "failed",
]);
export type ApprovalStatus = z.infer<typeof ApprovalStatus>;

/** approvals テーブルに対応する型 (引き継ぎドキュメント §10.3)。本実装は Phase 6。 */
export const Approval = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  toolName: z.string(),
  riskLevel: RiskLevel,
  inputJson: z.unknown(),
  previewJson: z.unknown(),
  status: ApprovalStatus,
  requestedByAgent: z.string(),
  approvedBy: z.string().uuid().nullable().optional(),
  rejectedReason: z.string().nullable().optional(),
  executedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Approval = z.infer<typeof Approval>;
