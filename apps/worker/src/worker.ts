import { Worker } from "bullmq";
import { REPORT_QUEUE_NAME, redisConnection } from "./queues/reportQueue";
import { query } from "./db";
import { processReportJob } from "./reports/processReportJob";

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
    const outcome = await processReportJob({ query }, jobId);
    console.log(`[worker] job ${jobId} -> ${outcome.status}`);
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
