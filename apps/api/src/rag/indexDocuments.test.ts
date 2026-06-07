import { test } from "node:test";
import assert from "node:assert/strict";
import { MockEmbedder } from "../llm/embedder";
import type { QueryFn } from "../tools/searchRecordsTool";
import { indexAllDocuments } from "./indexDocuments";

test("documents を chunk + embedding して document_chunks に INSERT する", async () => {
  const inserts: unknown[][] = [];
  let deleted = false;
  const query: QueryFn = async (text, params) => {
    if (/SELECT id, content FROM documents/.test(text)) {
      return {
        rows: [{ id: "doc1", content: "段落A。\n\n段落B。" }] as never[],
        rowCount: 1,
      };
    }
    if (/DELETE FROM document_chunks/.test(text)) {
      deleted = true;
      return { rows: [] as never[], rowCount: 0 };
    }
    if (/INSERT INTO document_chunks/.test(text)) {
      inserts.push(params!);
      return { rows: [] as never[], rowCount: 1 };
    }
    return { rows: [] as never[], rowCount: 0 };
  };

  const summary = await indexAllDocuments({
    query,
    embedder: new MockEmbedder(),
    chunkOptions: { maxChars: 8, overlap: 0 },
  });

  assert.equal(deleted, true); // 冪等のため既存を消す
  assert.equal(summary.documents, 1);
  assert.ok(summary.chunks >= 2);
  assert.equal(inserts.length, summary.chunks);
  // INSERT params: [document_id, chunk_index, content, vectorLiteral]
  assert.equal(inserts[0]![0], "doc1");
  assert.equal(inserts[0]![1], 0);
  assert.match(String(inserts[0]![3]), /^\[.+\]$/);
});
