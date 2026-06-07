import { test } from "node:test";
import assert from "node:assert/strict";
import { MockEmbedder } from "../llm/embedder";
import type { QueryFn } from "../tools/searchRecordsTool";
import { retrieveChunks } from "./retriever";

function spyQuery(rows: Record<string, unknown>[]) {
  const calls: { text: string; params?: unknown[] }[] = [];
  const fn: QueryFn = async (text, params) => {
    calls.push({ text, params });
    return { rows: rows as never[], rowCount: rows.length };
  };
  return { fn, calls };
}

const embedder = new MockEmbedder();

test("クエリを embedding 化し、ベクトルリテラルと limit を渡す", async () => {
  const { fn, calls } = spyQuery([
    { documentId: "d1", title: "t", sourcePath: "p", snippet: "s", similarity: 0.8 },
  ]);
  await retrieveChunks({ query: fn, embedder }, { query: "承認", limit: 3 });
  assert.match(String(calls[0]!.params?.[0]), /^\[.+\]$/);
  assert.equal(calls[0]!.params?.[1], 3);
  assert.match(calls[0]!.text, /<=>/); // cosine 距離演算子
});

test("minSimilarity 未満は除外する（回答不能の入口）", async () => {
  const { fn } = spyQuery([
    { documentId: "d1", title: "t1", sourcePath: "p1", snippet: "s1", similarity: 0.9 },
    { documentId: "d2", title: "t2", sourcePath: "p2", snippet: "s2", similarity: 0.05 },
  ]);
  const hits = await retrieveChunks(
    { query: fn, embedder },
    { query: "x", minSimilarity: 0.1 },
  );
  assert.equal(hits.length, 1);
  assert.equal(hits[0]!.documentId, "d1");
});

test("行を RetrievedChunk にマップし similarity を数値化する", async () => {
  const { fn } = spyQuery([
    { documentId: "d1", title: "t1", sourcePath: "p1", snippet: "s1", similarity: "0.7" },
  ]);
  const hits = await retrieveChunks({ query: fn, embedder }, { query: "x" });
  assert.equal(hits[0]!.similarity, 0.7);
  assert.equal(typeof hits[0]!.similarity, "number");
});
