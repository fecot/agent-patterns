import { toVectorLiteral, type Embedder } from "../llm/embedder";
import type { QueryFn } from "../tools/searchRecordsTool";

export type RetrievedChunk = {
  documentId: string;
  title: string;
  sourcePath: string;
  snippet: string;
  similarity: number;
};

export type RetrieveOptions = {
  query: string;
  limit?: number;
  /** この cosine 類似度を下回る結果は根拠として採用しない（回答不能判定）。 */
  minSimilarity?: number;
};

export type RetrieverDeps = {
  query: QueryFn;
  embedder: Embedder;
};

/**
 * pgvector による意味検索 (引き継ぎドキュメント §12.4)。
 *
 * クエリを embedding 化し、document_chunks を cosine 距離で近い順に取得する。
 * minSimilarity 未満は除外し、根拠が無いときは空配列を返す（回答不能の入口）。
 * DB / embedder を注入できるのでテストは外部依存なしで回せる。
 */
export async function retrieveChunks(
  deps: RetrieverDeps,
  options: RetrieveOptions,
): Promise<RetrievedChunk[]> {
  const limit = options.limit ?? 5;
  const minSimilarity = options.minSimilarity ?? 0.1;

  const [vector] = await deps.embedder.embed([options.query]);
  const literal = toVectorLiteral(vector ?? []);

  const result = await deps.query<RetrievedChunk & Record<string, unknown>>(
    `SELECT d.id AS "documentId", d.title, d.source_path AS "sourcePath",
            c.content AS snippet,
            1 - (c.embedding <=> $1::vector) AS similarity
     FROM document_chunks c
     JOIN documents d ON d.id = c.document_id
     ORDER BY c.embedding <=> $1::vector
     LIMIT $2`,
    [literal, limit],
  );

  return result.rows
    .map((r) => ({
      documentId: r.documentId,
      title: r.title,
      sourcePath: r.sourcePath,
      snippet: r.snippet,
      similarity: Number(r.similarity),
    }))
    .filter((r) => r.similarity >= minSimilarity);
}
