import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { ReportRequest } from "@lab/shared";
import { query } from "../db/client";
import { logAudit } from "../logs/auditLogger";
import { enqueueReportJob } from "../queue/reportQueue";
import { presignedDownloadUrl } from "../storage/fileStore";

const TRAINEE_USER_ID = "00000000-0000-0000-0000-000000000010";

/**
 * 非同期レポート API (引き継ぎドキュメント §20.7)。
 * POST で Job を作成して enqueue し、GET で進捗・結果を取得する。
 */
export async function reportRoutes(app: FastifyInstance) {
  app.post("/api/reports", async (req, reply) => {
    const parsed = ReportRequest.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const input = parsed.data;
    const requestId = randomUUID();

    const inserted = await query<{ id: string }>(
      `INSERT INTO report_jobs(workspace_id, user_id, status, input_json)
       VALUES ($1, $2, 'queued', $3) RETURNING id`,
      [input.workspaceId, TRAINEE_USER_ID, JSON.stringify(input)],
    );
    const jobId = inserted.rows[0]!.id;

    await enqueueReportJob(jobId);
    await logAudit({
      workspaceId: input.workspaceId,
      userId: TRAINEE_USER_ID,
      requestId,
      eventType: "job_created",
      payload: { jobId, kind: "report" },
    });

    return reply.code(202).send({ jobId, status: "queued" });
  });

  app.get("/api/reports/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = await query(
      `SELECT id, status, input_json AS "input", result_json AS "result",
              result_file_key AS "resultFileKey", error_message AS "errorMessage",
              started_at AS "startedAt", finished_at AS "finishedAt", created_at AS "createdAt"
       FROM report_jobs WHERE id = $1`,
      [id],
    );
    if (result.rowCount === 0) return reply.code(404).send({ error: "report job not found" });
    return { job: result.rows[0] };
  });

  // 生成物のダウンロード URL を発行する (Phase 8)。
  app.get("/api/reports/:id/download", async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = await query<{ resultFileKey: string | null }>(
      `SELECT result_file_key AS "resultFileKey" FROM report_jobs WHERE id = $1`,
      [id],
    );
    if (result.rowCount === 0) return reply.code(404).send({ error: "report job not found" });
    const key = result.rows[0]!.resultFileKey;
    if (!key) return reply.code(409).send({ error: "まだ生成物がありません（処理中/失敗）" });
    const url = await presignedDownloadUrl(key);
    return { url };
  });
}
