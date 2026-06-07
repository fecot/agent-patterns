import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReportLines, renderReportDocx } from "./renderReport";
import type { AggregateResult } from "./aggregate";

const result: AggregateResult = {
  total: 3,
  groupBy: ["department"],
  groups: [
    { key: "IT", values: { department: "IT" }, count: 2 },
    { key: "Sales", values: { department: "Sales" }, count: 1 },
  ],
};
const meta = { periodFrom: "2026-01-01", periodTo: "2026-03-31", note: "Q1" };

test("buildReportLines: タイトル・期間・総件数・内訳を含む", () => {
  const lines = buildReportLines(result, meta);
  assert.equal(lines[0], "業務レポート");
  assert.ok(lines.some((l) => l.includes("2026-01-01 〜 2026-03-31")));
  assert.ok(lines.some((l) => l.includes("総件数: 3")));
  assert.ok(lines.some((l) => l === "- IT: 2 件"));
  assert.ok(lines.some((l) => l === "- Sales: 1 件"));
  assert.ok(lines.some((l) => l.includes("メモ: Q1")));
});

test("groupBy 空なら集計軸=なし", () => {
  const lines = buildReportLines(
    { total: 5, groupBy: [], groups: [{ key: "all", values: {}, count: 5 }] },
    { periodFrom: "a", periodTo: "b" },
  );
  assert.ok(lines.some((l) => l.includes("集計軸: なし")));
});

test("renderReportDocx: docx の Buffer(PK ヘッダ) を返す", async () => {
  const buf = await renderReportDocx(result, meta);
  assert.ok(Buffer.isBuffer(buf));
  assert.ok(buf.length > 0);
  // docx(zip) は "PK" で始まる。
  assert.equal(buf.subarray(0, 2).toString("latin1"), "PK");
});
