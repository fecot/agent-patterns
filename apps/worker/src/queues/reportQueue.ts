// Report 生成 Job のキュー定義 (引き継ぎドキュメント §13)。
// Phase 0 ではキュー名と接続設定のみ。実際の Job 処理は Phase 7 で実装する。
export const REPORT_QUEUE_NAME = "report";

export const redisConnection = {
  // BullMQ は host/port 形式を好むため URL から組み立てる。
  url: process.env.REDIS_URL ?? "redis://redis:6379",
};
