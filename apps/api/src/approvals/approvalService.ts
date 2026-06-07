import type { ApprovalStatus, AuditEventType, ToolResult } from "@lab/shared";
import type { ToolRegistry } from "../tools/registry";
import type { QueryFn } from "../tools/searchRecordsTool";
import { assertTransition, statusAfterApprove } from "./approvalState";

export type ApprovalRow = {
  id: string;
  workspaceId: string;
  userId: string;
  toolName: string;
  riskLevel: string;
  inputJson: unknown;
  previewJson: unknown;
  status: ApprovalStatus;
  requestedByAgent: string;
  approvedBy: string | null;
  rejectedReason: string | null;
  executedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApprovalAudit = (
  eventType: Extract<
    AuditEventType,
    "approval_created" | "approval_approved" | "approval_rejected" | "action_executed" | "guardrail_triggered"
  >,
  payload: unknown,
) => void | Promise<void>;

export type ApprovalDeps = {
  query: QueryFn;
  registry: ToolRegistry;
  onEvent?: ApprovalAudit;
};

const COLUMNS = `id, workspace_id AS "workspaceId", user_id AS "userId",
  tool_name AS "toolName", risk_level AS "riskLevel", input_json AS "inputJson",
  preview_json AS "previewJson", status, requested_by_agent AS "requestedByAgent",
  approved_by AS "approvedBy", rejected_reason AS "rejectedReason",
  executed_at AS "executedAt", created_at AS "createdAt", updated_at AS "updatedAt"`;

/** Preview から承認待ち(pending)の Approval を作成する。 */
export async function createApproval(
  deps: ApprovalDeps,
  params: {
    workspaceId: string;
    userId: string;
    toolName: string;
    riskLevel: string;
    input: unknown;
    preview: unknown;
    requestedByAgent: string;
  },
): Promise<ApprovalRow> {
  const result = await deps.query<ApprovalRow>(
    `INSERT INTO approvals
       (workspace_id, user_id, tool_name, risk_level, input_json, preview_json, status, requested_by_agent)
     VALUES ($1,$2,$3,$4,$5,$6,'pending',$7)
     RETURNING ${COLUMNS}`,
    [
      params.workspaceId,
      params.userId,
      params.toolName,
      params.riskLevel,
      JSON.stringify(params.input),
      JSON.stringify(params.preview),
      params.requestedByAgent,
    ],
  );
  const row = result.rows[0]!;
  await deps.onEvent?.("approval_created", {
    approvalId: row.id,
    toolName: row.toolName,
    riskLevel: row.riskLevel,
  });
  return row;
}

export async function listApprovals(
  deps: ApprovalDeps,
  filter: { workspaceId: string; status?: ApprovalStatus },
): Promise<ApprovalRow[]> {
  const params: unknown[] = [filter.workspaceId];
  let where = "workspace_id = $1";
  if (filter.status) {
    params.push(filter.status);
    where += ` AND status = $2`;
  }
  const result = await deps.query<ApprovalRow>(
    `SELECT ${COLUMNS} FROM approvals WHERE ${where} ORDER BY created_at DESC LIMIT 100`,
    params,
  );
  return result.rows;
}

export async function getApproval(
  deps: ApprovalDeps,
  id: string,
): Promise<ApprovalRow | null> {
  const result = await deps.query<ApprovalRow>(
    `SELECT ${COLUMNS} FROM approvals WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

/** 承認 → Tool を実行 → 状態を executed/failed に更新する。 */
export async function approveApproval(
  deps: ApprovalDeps,
  params: { id: string; approvedBy: string },
): Promise<{ approval: ApprovalRow; result: ToolResult }> {
  const approval = await getApproval(deps, params.id);
  if (!approval) throw new Error(`approval が見つかりません: ${params.id}`);
  assertTransition(approval.status, "approve");

  const tool = deps.registry.get(approval.toolName);
  if (!tool || !tool.executeApproved) {
    throw new Error(`Tool "${approval.toolName}" は承認実行に対応していません`);
  }

  await deps.onEvent?.("approval_approved", {
    approvalId: approval.id,
    approvedBy: params.approvedBy,
  });

  let result: ToolResult;
  try {
    result = await tool.executeApproved(approval.inputJson, {
      userId: params.approvedBy,
      workspaceId: approval.workspaceId,
      requestId: approval.id,
      dryRun: false,
    });
  } catch (err) {
    result = {
      ok: false,
      error: { code: "execution_failed", message: err instanceof Error ? err.message : String(err) },
    };
  }

  const status = statusAfterApprove(result.ok);
  const updated = await deps.query<ApprovalRow>(
    `UPDATE approvals
       SET status = $2, approved_by = $3, executed_at = now(), updated_at = now()
     WHERE id = $1
     RETURNING ${COLUMNS}`,
    [approval.id, status, params.approvedBy],
  );

  await deps.onEvent?.(
    result.ok ? "action_executed" : "guardrail_triggered",
    { approvalId: approval.id, toolName: approval.toolName, ok: result.ok, error: result.error },
  );

  return { approval: updated.rows[0]!, result };
}

/** 却下 → 理由を保存して rejected に更新する。 */
export async function rejectApproval(
  deps: ApprovalDeps,
  params: { id: string; reason: string },
): Promise<ApprovalRow> {
  const approval = await getApproval(deps, params.id);
  if (!approval) throw new Error(`approval が見つかりません: ${params.id}`);
  assertTransition(approval.status, "reject");

  const updated = await deps.query<ApprovalRow>(
    `UPDATE approvals
       SET status = 'rejected', rejected_reason = $2, updated_at = now()
     WHERE id = $1
     RETURNING ${COLUMNS}`,
    [approval.id, params.reason],
  );
  await deps.onEvent?.("approval_rejected", { approvalId: approval.id, reason: params.reason });
  return updated.rows[0]!;
}
