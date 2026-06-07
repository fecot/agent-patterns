import { Worker } from "bullmq";
import { reportFileKey } from "@lab/shared";
import { REPORT_QUEUE_NAME, redisConnection } from "./queues/reportQueue";
import { query } from "./db";
import { processReportJob, type GenerateFileFn } from "./reports/processReportJob";
import { renderReportDocx, DOCX_CONTENT_TYPE } from "./reports/renderReport";
import { MinioFileStore } from "./storage/fileStore";

// docx を生成して MinIO に保存し、命名規約に沿ったキーを返す (Phase 8)。
const fileStore = new MinioFileStore();
const generateFile: GenerateFileFn = async ({ jobId, workspaceId, result, meta }) => {
  const buffer = await renderReportDocx(result, meta);
  const key = reportFileKey(workspaceId, jobId, "docx");
  await fileStore.put(key, DOCX_CONTENT_TYPE, buffer);
  return { fileKey: key, contentType: DOCX_CONTENT_TYPE };
};

/**
 * Background Worker のエントリポイント。
 *
 * Phase 7: report Job を受け取り、期間内の business_records を集計して
 * report_jobs.result_json に保存する。docx 生成・MinIO 保存は Phase 8。
 *
 * 接続は ioredis インスタンスを自前で作らず、接続情報を BullMQ に渡して
 * BullMQ 側に管理させる（ioredis の二重バージョン問題を避ける）。
 */
const url = new URL(redisConnection.url);
const connection = {
  host: url.hostname,
  port: Number(url.port || 6379),
  ...(url.password ? { password: url.password } : {}),
};

const worker = new Worker(
  REPORT_QUEUE_NAME,
  async (job) => {
    const jobId = String(job.data?.jobId ?? "");
    console.log(`[worker] processing report job ${jobId}`);
    const outcome = await processReportJob({ query, generateFile }, jobId);
    console.log(`[worker] job ${jobId} -> ${outcome.status} (file=${outcome.fileKey ?? "none"})`);
    return outcome;
  },
  { connection },
);

worker.on("ready", () => {
  console.log(`[worker] ready. queue="${REPORT_QUEUE_NAME}" に接続しました。`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] job ${job?.id} failed:`, err);
});

async function shutdown() {
  console.log("[worker] shutting down...");
  await worker.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
