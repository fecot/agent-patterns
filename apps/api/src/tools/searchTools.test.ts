import { test } from "node:test";
import assert from "node:assert/strict";
import type { ToolContext } from "@lab/shared";
import { createSearchRecordsTool, type QueryFn } from "./searchRecordsTool";
import { createSearchDocumentsTool } from "./searchDocumentsTool";

const ctx: ToolContext = {
  userId: "u1",
  workspaceId: "ws1",
  requestId: "r1",
};

/** 呼ばれた SQL と params を記録する fake query。 */
function spyQuery(rows: Record<string, unknown>[]) {
  const calls: { text: string; params?: unknown[] }[] = [];
  const fn: QueryFn = async (text, params) => {
    calls.push({ text, params });
    return { rows: rows as never[], rowCount: rows.length };
  };
  return { fn, calls };
}

test("searchRecords: workspaceId と like を渡し data.records を返す", async () => {
  const { fn, calls } = spyQuery([{ id: "rec1", title: "障害対応" }]);
  const tool = createSearchRecordsTool(fn);
  const result = await tool.execute({ query: "障害", limit: 5 }, ctx);
  assert.equal(result.ok, true);
  assert.deepEqual((result.data as { records: unknown[] }).records, [
    { id: "rec1", title: "障害対応" },
  ]);
  assert.equal(calls[0]!.params?.[0], "ws1");
  assert.equal(calls[0]!.params?.[1], "%障害%");
});

test("searchRecords: status/department で WHERE を足す", async () => {
  const { fn, calls } = spyQuery([]);
  const tool = createSearchRecordsTool(fn);
  await tool.execute({ query: "x", limit: 3, status: "open", department: "IT" }, ctx);
  const params = calls[0]!.params!;
  assert.deepEqual(params, ["ws1", "%x%", "open", "IT", 3]);
  assert.match(calls[0]!.text, /status = \$3/);
  assert.match(calls[0]!.text, /department = \$4/);
});

test("searchRecords: riskLevel は low（承認不要）", () => {
  assert.equal(createSearchRecordsTool(spyQuery([]).fn).riskLevel, "low");
});

test("searchDocuments: like と limit を渡し documents を返す", async () => {
  const { fn, calls } = spyQuery([
    { documentId: "d1", title: "承認ポリシー", sourcePath: "p.md", snippet: "..." },
  ]);
  const tool = createSearchDocumentsTool(fn);
  const result = await tool.execute({ query: "承認", limit: 4 }, ctx);
  assert.equal(result.ok, true);
  assert.deepEqual(calls[0]!.params, ["%承認%", 4]);
  assert.equal((result.data as { documents: unknown[] }).documents.length, 1);
});
