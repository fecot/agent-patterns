import type { JobStatus } from "@lab/shared";
import { aggregateRecords, type AggregateResult } from "./aggregate";

export type WorkerQueryFn = <T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[],
) => Promise<{ rows: T[]; rowCount: number | null }>;

/** 集計結果からファイルを生成・保存し、保存キーを返す（生成しない場合は null）。 */
export type GenerateFileFn = (args: {
  jobId: string;
  workspaceId: string;
  result: AggregateResult;
  meta: { periodFrom: string; periodTo: string; note?: string };
}) => Promise<{ fileKey: string; contentType: string } | null>;

export type ProcessDeps = {
  query: WorkerQueryFn;
  /** Phase 8: ファイル生成を注入。未指定なら集計のみ（テスト用）。 */
  generateFile?: GenerateFileFn;
};

export type ProcessOutcome = {
  status: JobStatus;
  result?: AggregateResult;
  fileKey?: string;
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
      note?: string;
    };
    const records = await deps.query(
      `SELECT department, category, status, priority
       FROM business_records
       WHERE workspace_id = $1 AND occurred_on BETWEEN $2 AND $3`,
      [input.workspaceId, input.periodFrom, input.periodTo],
    );
    const result = aggregateRecords(records.rows, input.groupBy ?? []);

    // Phase 8: 集計結果をファイル化して保存し、generated_files に記録する。
    let fileKey: string | null = null;
    if (deps.generateFile) {
      const file = await deps.generateFile({
        jobId,
        workspaceId: input.workspaceId,
        result,
        meta: { periodFrom: input.periodFrom, periodTo: input.periodTo, note: input.note },
      });
      if (file) {
        fileKey = file.fileKey;
        await deps.query(
          `INSERT INTO generated_files(workspace_id, job_id, file_key, content_type)
           VALUES ($1, $2, $3, $4)`,
          [input.workspaceId, jobId, file.fileKey, file.contentType],
        );
      }
    }

    await deps.query(
      `UPDATE report_jobs
         SET status = 'success', result_json = $2, result_file_key = $3,
             finished_at = now(), updated_at = now()
       WHERE id = $1`,
      [jobId, JSON.stringify(result), fileKey],
    );
    return { status: "success", result, fileKey: fileKey ?? undefined };
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
