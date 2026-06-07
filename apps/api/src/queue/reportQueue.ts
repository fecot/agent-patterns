import { Queue } from "bullmq";
import { REPORT_QUEUE_NAME } from "@lab/shared";
import { env } from "../config/env";

/**
 * report Job の producer (引き継ぎドキュメント §13.2)。
 * API は Job を enqueue するだけ。実処理は Worker（consumer）が行う。
 */
const url = new URL(env.REDIS_URL);
const connection = {
  host: url.hostname,
  port: Number(url.port || 6379),
  ...(url.password ? { password: url.password } : {}),
};

export const reportQueue = new Queue(REPORT_QUEUE_NAME, { connection });

export async function enqueueReportJob(jobId: string): Promise<void> {
  await reportQueue.add("generate", { jobId }, { removeOnComplete: 100, removeOnFail: 100 });
}
