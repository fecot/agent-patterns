import type { ApprovalStatus } from "@lab/shared";

/**
 * Approval の状態遷移を司る純粋関数 (引き継ぎドキュメント §10.2)。
 *
 *   pending ──approve──▶ (executed | failed)
 *   pending ──reject───▶ rejected
 *
 * 既に終端（executed/failed/rejected）なら再操作を弾く。
 */
export type ApprovalAction = "approve" | "reject";

const TERMINAL: ApprovalStatus[] = ["executed", "failed", "rejected"];

export function canTransition(current: ApprovalStatus, action: ApprovalAction): boolean {
  if (TERMINAL.includes(current)) return false;
  return current === "pending";
}

/** approve 実行後の状態。Tool 実行が成功なら executed、失敗なら failed。 */
export function statusAfterApprove(executionOk: boolean): ApprovalStatus {
  return executionOk ? "executed" : "failed";
}

export function assertTransition(current: ApprovalStatus, action: ApprovalAction): void {
  if (!canTransition(current, action)) {
    throw new Error(`状態 "${current}" に対して "${action}" はできません`);
  }
}
