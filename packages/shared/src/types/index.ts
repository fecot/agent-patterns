import { z } from "zod";

/**
 * audit_logs の event_type (引き継ぎドキュメント §11.3)。
 * すべての AI 関連操作はこのいずれかとして記録する。
 */
export const AuditEventType = z.enum([
  "user_message_received",
  "assistant_selected",
  "context_retrieved",
  "llm_requested",
  "llm_responded",
  "tool_call_requested",
  "tool_call_completed",
  "approval_created",
  "approval_approved",
  "approval_rejected",
  "action_executed",
  "job_created",
  "job_completed",
  "job_failed",
  "guardrail_triggered",
]);
export type AuditEventType = z.infer<typeof AuditEventType>;

/** 業務レコード (business_records, 引き継ぎドキュメント §17.1)。 */
export interface BusinessRecord {
  id: string;
  workspaceId: string;
  occurredOn: string;
  department: string;
  category: string;
  title: string;
  body: string;
  status: string;
  priority: string;
  assignee: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/** Knowledge Base のドキュメント (documents, 引き継ぎドキュメント §12.3)。 */
export interface DocumentRecord {
  id: string;
  title: string;
  sourcePath: string;
  content: string;
  createdAt: string;
}
