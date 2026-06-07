import { test } from "node:test";
import assert from "node:assert/strict";
import { processReportJob, type WorkerQueryFn } from "./processReportJob";

/** report_jobs と business_records を模した fake query。 */
function fakeQuery(opts: {
  job?: { status: string; inputJson: unknown } | null;
  records?: Record<string, unknown>[];
  throwOnRecords?: boolean;
}) {
  const updates: { text: string; params?: unknown[] }[] = [];
  const query: WorkerQueryFn = async (text, params) => {
    if (/FROM report_jobs WHERE id/.test(text)) {
      return { rows: (opts.job ? [opts.job] : []) as never[], rowCount: opts.job ? 1 : 0 };
    }
    if (/FROM business_records/.test(text)) {
      if (opts.throwOnRecords) throw new Error("DB ダウン");
      return { rows: (opts.records ?? []) as never[], rowCount: (opts.records ?? []).length };
    }
    updates.push({ text, params });
    return { rows: [] as never[], rowCount: 1 };
  };
  return { query, updates };
}

const input = { workspaceId: "ws1", periodFrom: "2026-01-01", periodTo: "2026-12-31", groupBy: ["department"] };

test("成功時: running→success にし result_json を保存する", async () => {
  const { query, updates } = fakeQuery({
    job: { status: "queued", inputJson: input },
    records: [{ department: "IT" }, { department: "IT" }, { department: "Sales" }],
  });
  const outcome = await processReportJob({ query }, "job1");
  assert.equal(outcome.status, "success");
  assert.equal(outcome.result?.total, 3);
  assert.ok(updates.some((u) => /status = 'running'/.test(u.text)));
  const success = updates.find((u) => /status = 'success'/.test(u.text));
  assert.ok(success);
  assert.match(String(success!.params?.[1]), /"total":3/);
});

test("集計中の例外で error + error_message", async () => {
  const { query, updates } = fakeQuery({
    job: { status: "queued", inputJson: input },
    throwOnRecords: true,
  });
  const outcome = await processReportJob({ query }, "job1");
  assert.equal(outcome.status, "error");
  const err = updates.find((u) => /status = 'error'/.test(u.text));
  assert.equal(err?.params?.[1], "DB ダウン");
});

test("Job が無ければ例外", async () => {
  const { query } = fakeQuery({ job: null });
  await assert.rejects(processReportJob({ query }, "missing"), /見つかりません/);
});
