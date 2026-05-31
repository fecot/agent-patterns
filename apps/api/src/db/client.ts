import pg from "pg";
import { env } from "../config/env.js";

/**
 * PostgreSQL 接続プール。アプリ全体で 1 つを共有する。
 * 学習用なので最小限の設定。
 */
export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
});

/** クエリのショートハンド。 */
export function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params as never[]);
}
