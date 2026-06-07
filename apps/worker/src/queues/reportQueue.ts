// Report 生成 Job のキュー定義 (引き継ぎドキュメント §13)。
// キュー名は API(producer) と共有するため @lab/shared を唯一の出所にする。
export { REPORT_QUEUE_NAME } from "@lab/shared";

export const redisConnection = {
  // BullMQ は host/port 形式を好むため URL から組み立てる。
  url: process.env.REDIS_URL ?? "redis://redis:6379",
};
