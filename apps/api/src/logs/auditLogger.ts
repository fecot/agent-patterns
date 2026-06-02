import type { AuditEventType } from "@lab/shared";
import { query } from "../db/client";

/**
 * Audit Logger (引き継ぎドキュメント §11)。
 * すべての AI 関連操作を audit_logs に記録する。
 * request_id 単位で 1 リクエストの流れを後から追跡できる。
 */
export async function logAudit(params: {
  workspaceId: string;
  userId?: string | null;
  requestId: string;
  eventType: AuditEventType;
  payload: unknown;
}): Promise<void> {
  await query(
    `INSERT INTO audit_logs(workspace_id, user_id, request_id, event_type, event_payload)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      params.workspaceId,
      params.userId ?? null,
      params.requestId,
      params.eventType,
      JSON.stringify(params.payload),
    ],
  );
}
