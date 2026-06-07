import type { Embedder } from "../llm/embedder";
import { toVectorLiteral } from "../llm/embedder";
import type { QueryFn } from "../tools/searchRecordsTool";
import { chunkMarkdown, type ChunkOptions } from "./chunk";

export type IndexDeps = {
  query: QueryFn;
  embedder: Embedder;
  chunkOptions?: ChunkOptions;
};

export type IndexSummary = {
  documents: number;
  chunks: number;
};

/**
 * documents を chunk 分割・embedding して document_chunks に格納する
 * (引き継ぎドキュメント §12.3)。再実行できるよう既存チャンクは作り直す。
 */
export async function indexAllDocuments(deps: IndexDeps): Promise<IndexSummary> {
  const docs = await deps.query<{ id: string; content: string }>(
    `SELECT id, content FROM documents ORDER BY source_path ASC`,
  );

  // 既存チャンクを一掃してから入れ直す（冪等）。
  await deps.query(`DELETE FROM document_chunks`);

  let totalChunks = 0;
  for (const doc of docs.rows) {
    const chunks = chunkMarkdown(doc.content, deps.chunkOptions);
    if (chunks.length === 0) continue;
    const vectors = await deps.embedder.embed(chunks);
    for (let i = 0; i < chunks.length; i++) {
      await deps.query(
        `INSERT INTO document_chunks(document_id, chunk_index, content, embedding)
         VALUES ($1, $2, $3, $4::vector)`,
        [doc.id, i, chunks[i], toVectorLiteral(vectors[i] ?? [])],
      );
      totalChunks++;
    }
  }

  return { documents: docs.rows.length, chunks: totalChunks };
}
