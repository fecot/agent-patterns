import type { JobStatus } from "@lab/shared";
import { aggregateRecords, type AggregateResult } from "./aggregate";

export type WorkerQueryFn = <T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[],
) => Promise<{ rows: T[]; rowCount: number | null }>;

export type ProcessDeps = {
  query: WorkerQueryFn;
};

export type ProcessOutcome = {
  status: JobStatus;
  result?: AggregateResult;
  error?: string;
};

/**
 * report Job を 1 件処理する (引き継ぎドキュメント §13.6)。
 *
 * running へ更新 → 期間内の business_records を集計 → success + result_json。
 * 例外時は error + error_message。DB を注入できるのでテストは外部依存なしで回せる。
 */
export async function processReportJob(
  deps: ProcessDeps,
  jobId: string,
): Promise<ProcessOutcome> {
  const job = await loadJob(deps.query, jobId);
  if (!job) throw new Error(`report_job が見つかりません: ${jobId}`);

  await deps.query(
    `UPDATE report_jobs SET status = 'running', started_at = now(), updated_at = now() WHERE id = $1`,
    [jobId],
  );

  try {
    const input = job.inputJson as {
      workspaceId: string;
      periodFrom: string;
      periodTo: string;
      groupBy?: string[];
    };
    const records = await deps.query(
      `SELECT department, category, status, priority
       FROM business_records
       WHERE workspace_id = $1 AND occurred_on BETWEEN $2 AND $3`,
      [input.workspaceId, input.periodFrom, input.periodTo],
    );
    const result = aggregateRecords(records.rows, input.groupBy ?? []);

    await deps.query(
      `UPDATE report_jobs
         SET status = 'success', result_json = $2, finished_at = now(), updated_at = now()
       WHERE id = $1`,
      [jobId, JSON.stringify(result)],
    );
    return { status: "success", result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await deps.query(
      `UPDATE report_jobs
         SET status = 'error', error_message = $2, finished_at = now(), updated_at = now()
       WHERE id = $1`,
      [jobId, message],
    );
    return { status: "error", error: message };
  }
}

async function loadJob(
  query: WorkerQueryFn,
  jobId: string,
): Promise<{ status: JobStatus; inputJson: unknown } | null> {
  const result = await query<{ status: JobStatus; inputJson: unknown }>(
    `SELECT status, input_json AS "inputJson" FROM report_jobs WHERE id = $1`,
    [jobId],
  );
  return result.rows[0] ?? null;
}
