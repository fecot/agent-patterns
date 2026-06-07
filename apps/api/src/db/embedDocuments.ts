import { pool, query } from "./client";
import { embedder } from "../llm/embedder";
import { indexAllDocuments } from "../rag/indexDocuments";
import type { QueryFn } from "../tools/searchRecordsTool";

/**
 * documents を chunk + embedding して document_chunks を作り直す再実行用スクリプト。
 * `pnpm db:index` で単体実行できる（seed をやり直さずに index だけ更新したいとき用）。
 */
async function main() {
  const summary = await indexAllDocuments({
    query: query as unknown as QueryFn,
    embedder,
  });
  console.log(
    `[index] done: documents=${summary.documents}, chunks=${summary.chunks}`,
  );
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
