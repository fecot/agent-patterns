import pg from "pg";

/**
 * Worker 用の PostgreSQL 接続プール。
 * API と同じ DB を見る。env は最小限（DATABASE_URL のみ）。
 */
export const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgres://postgres:postgres@postgres:5432/agent_training",
});

export function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params as never[]);
}
