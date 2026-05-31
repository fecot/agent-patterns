import { Worker } from "bullmq";
import IORedis from "ioredis";
import { REPORT_QUEUE_NAME, redisConnection } from "./queues/reportQueue.js";

/**
 * Background Worker のエントリポイント。
 *
 * Phase 0 では「Redis に繋がり、BullMQ Worker が起動する」ことの確認だけを行う。
 * 集計・LLM 分析・docx 生成・MinIO 保存などの本処理は Phase 7 で実装する。
 */
const connection = new IORedis(redisConnection.url, {
  maxRetriesPerRequest: null, // BullMQ の要件
});

const worker = new Worker(
  REPORT_QUEUE_NAME,
  async (job) => {
    // Phase 7 で generateReportJob に差し替える。
    console.log(`[worker] received job ${job.id} (まだ未実装)`);
    return { ok: true, note: "stub" };
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
  await connection.quit();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
