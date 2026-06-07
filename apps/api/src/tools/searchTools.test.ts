import { test } from "node:test";
import assert from "node:assert/strict";
import type { ToolContext } from "@lab/shared";
import { createSearchRecordsTool, type QueryFn } from "./searchRecordsTool";
import { createSearchDocumentsTool } from "./searchDocumentsTool";
import { MockEmbedder } from "../llm/embedder";

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

test("searchDocuments: RAG でベクトル検索し documents(similarity 付き) を返す", async () => {
  const { fn, calls } = spyQuery([
    {
      documentId: "d1",
      title: "承認ポリシー",
      sourcePath: "p.md",
      snippet: "危険操作は承認を通す",
      similarity: 0.9,
    },
  ]);
  const tool = createSearchDocumentsTool({ query: fn, embedder: new MockEmbedder() });
  const result = await tool.execute({ query: "承認", limit: 4 }, ctx);
  assert.equal(result.ok, true);
  // pgvector のベクトルリテラルと limit が渡る。
  assert.match(String(calls[0]!.params?.[0]), /^\[.+\]$/);
  assert.equal(calls[0]!.params?.[1], 4);
  const docs = (result.data as { documents: { similarity: number }[] }).documents;
  assert.equal(docs.length, 1);
  assert.equal(docs[0]!.similarity, 0.9);
});
