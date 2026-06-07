import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregateRecords } from "./aggregate";

const rows = [
  { department: "IT", category: "incident", status: "open", priority: "high" },
  { department: "IT", category: "incident", status: "closed", priority: "low" },
  { department: "Sales", category: "request", status: "open", priority: "mid" },
];

test("groupBy 空なら全件を 1 グループに", () => {
  const r = aggregateRecords(rows, []);
  assert.equal(r.total, 3);
  assert.deepEqual(r.groups, [{ key: "all", values: {}, count: 3 }]);
});

test("単一フィールドで集計し件数降順に並ぶ", () => {
  const r = aggregateRecords(rows, ["department"]);
  assert.equal(r.total, 3);
  assert.equal(r.groups[0]!.key, "IT");
  assert.equal(r.groups[0]!.count, 2);
  assert.equal(r.groups[1]!.count, 1);
});

test("複合キーで集計する", () => {
  const r = aggregateRecords(rows, ["department", "category"]);
  const it = r.groups.find((g) => g.key === "IT / incident");
  assert.equal(it?.count, 2);
});

test("許可外フィールドは無視される", () => {
  const r = aggregateRecords(rows, ["assignee", "department"]);
  assert.deepEqual(r.groupBy, ["department"]);
});

test("欠損値は (none) になる", () => {
  const r = aggregateRecords([{ department: undefined }], ["department"]);
  assert.equal(r.groups[0]!.values.department, "(none)");
});
