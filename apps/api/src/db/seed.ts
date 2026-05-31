import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { pool } from "./client.js";

/**
 * seed ランナー。data/seed 配下の汎用サンプルデータを投入する。
 * 何度実行しても同じ状態になるよう、対象テーブルを一度空にしてから入れ直す。
 */

// 学習用の固定 Workspace / User。web の WORKSPACE_ID と一致させている。
const WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";
const USER_ID = "00000000-0000-0000-0000-000000000010";

const here = dirname(fileURLToPath(import.meta.url));
const seedDir = join(here, "../../../../data/seed");

function readJson<T>(rel: string): T {
  return JSON.parse(readFileSync(join(seedDir, rel), "utf8")) as T;
}

/** クォート無し前提の最小 CSV パーサ (学習用サンプルデータはカンマを含まない)。 */
function parseCsv(rel: string): Record<string, string>[] {
  const text = readFileSync(join(seedDir, rel), "utf8").trim();
  const [headerLine, ...lines] = text.split("\n");
  const headers = headerLine!.split(",");
  return lines.map((line) => {
    const cols = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cols[i] ?? ""));
    return row;
  });
}

async function seed() {
  // 1) Workspace / User を固定 ID で用意。
  await pool.query(
    `INSERT INTO workspaces(id, name) VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
    [WORKSPACE_ID, "Acme Operations Platform"],
  );
  await pool.query(
    `INSERT INTO users(id, workspace_id, display_name, email) VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name`,
    [USER_ID, WORKSPACE_ID, "Trainee", "trainee@example.com"],
  );

  // 2) 対象テーブルを空にする (再実行で重複しないように)。
  await pool.query(
    `TRUNCATE business_records, cases, contacts, usage_logs, document_chunks, documents RESTART IDENTITY CASCADE`,
  );

  // 3) business_records (CSV)。
  const records = parseCsv("records/business-records.csv");
  for (const r of records) {
    await pool.query(
      `INSERT INTO business_records
        (workspace_id, occurred_on, department, category, title, body, status, priority, assignee, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        WORKSPACE_ID,
        r.occurred_on,
        r.department,
        r.category,
        r.title,
        r.body,
        r.status,
        r.priority,
        r.assignee || null,
        (r.tags ?? "").split(";").filter(Boolean),
      ],
    );
  }

  // 4) documents (Markdown ファイル群)。
  const docFiles = [
    "onboarding-guide.md",
    "operation-policy.md",
    "notification-guide.md",
    "approval-policy.md",
    "data-handling-policy.md",
    "report-writing-guide.md",
  ];
  for (const file of docFiles) {
    const content = readFileSync(join(seedDir, "documents", file), "utf8");
    const firstLine = content.split("\n")[0] ?? file;
    const title = firstLine.replace(/^#\s*/, "").trim() || file;
    await pool.query(
      `INSERT INTO documents(title, source_path, content) VALUES ($1, $2, $3)`,
      [title, `documents/${file}`, content],
    );
  }

  // 5) cases (JSON)。
  const cases = readJson<
    { title: string; problem: string; action: string; result: string; tags: string[] }[]
  >("cases/sample-cases.json");
  for (const c of cases) {
    await pool.query(
      `INSERT INTO cases(workspace_id, title, problem, action, result, tags)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [WORKSPACE_ID, c.title, c.problem, c.action, c.result, c.tags],
    );
  }

  // 6) contacts (JSON)。
  const contacts = readJson<
    {
      display_name: string;
      organization: string;
      role: string;
      expertise_tags: string[];
      notes: string;
      score: number;
    }[]
  >("contacts/sample-contacts.json");
  for (const c of contacts) {
    await pool.query(
      `INSERT INTO contacts(workspace_id, display_name, organization, role, expertise_tags, notes, score)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [WORKSPACE_ID, c.display_name, c.organization, c.role, c.expertise_tags, c.notes, c.score],
    );
  }

  // 7) usage_logs (JSON)。
  const logs = readJson<{ occurred_on: string; kind: string; payload: unknown }[]>(
    "usage_logs/usage-logs.json",
  );
  for (const l of logs) {
    await pool.query(
      `INSERT INTO usage_logs(workspace_id, occurred_on, kind, payload)
       VALUES ($1,$2,$3,$4)`,
      [WORKSPACE_ID, l.occurred_on, l.kind, JSON.stringify(l.payload)],
    );
  }

  console.log(
    `[seed] done: records=${records.length}, documents=${docFiles.length}, cases=${cases.length}, contacts=${contacts.length}, usage_logs=${logs.length}`,
  );
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
