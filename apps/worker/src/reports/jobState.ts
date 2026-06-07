import type { JobStatus } from "@lab/shared";

/**
 * 非同期 Job の状態遷移 (引き継ぎドキュメント §13.3)。
 *
 *   queued ──▶ running ──▶ success
 *                    └────▶ error
 *   queued / running ──▶ cancelled
 */
const ALLOWED: Record<JobStatus, JobStatus[]> = {
  queued: ["running", "cancelled"],
  running: ["success", "error", "cancelled"],
  success: [],
  error: [],
  cancelled: [],
};

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function assertTransition(from: JobStatus, to: JobStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Job 状態 "${from}" から "${to}" へは遷移できません`);
  }
}
