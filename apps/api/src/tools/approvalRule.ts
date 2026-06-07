import type { QueryFn } from "./searchRecordsTool";

/**
 * approval_rules を参照して Tool の承認要否を返す (引き継ぎドキュメント §10.4)。
 * 行が無ければ「承認必須」をデフォルトにする（安全側に倒す）。
 */
export async function loadApprovalRequirement(
  query: QueryFn,
  workspaceId: string,
  toolName: string,
): Promise<boolean> {
  const result = await query<{ requiresApproval: boolean }>(
    `SELECT requires_approval AS "requiresApproval"
     FROM approval_rules
     WHERE workspace_id = $1 AND tool_name = $2`,
    [workspaceId, toolName],
  );
  return result.rows[0]?.requiresApproval ?? true;
}
