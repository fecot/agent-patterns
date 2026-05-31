import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { pool } from "./client.js";

/**
 * 生 SQL マイグレーションランナー。
 * migrations/*.sql をファイル名順に適用し、適用済みを schema_migrations で管理する。
 * 学習用に「何が起きているか」が読めるよう最小限の実装にしている。
 */
async function migrate() {
  const here = dirname(fileURLToPath(import.meta.url));
  const migrationsDir = join(here, "migrations");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT now()
    );
  `);

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const applied = new Set(
    (await pool.query<{ name: string }>("SELECT name FROM schema_migrations")).rows.map(
      (r) => r.name,
    ),
  );

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`[migrate] skip ${file} (適用済み)`);
      continue;
    }
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations(name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`[migrate] applied ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`[migrate] failed ${file}:`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log("[migrate] done");
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
