import { z } from "zod";
import type { ToolContext, ToolResult } from "@lab/shared";
import { query as defaultQuery } from "../db/client";
import { embedder as defaultEmbedder, type Embedder } from "../llm/embedder";
import { retrieveChunks } from "../rag/retriever";
import type { QueryFn } from "./searchRecordsTool";
import type { BusinessTool } from "./types";

const Input = z.object({
  query: z.string().min(1, "検索語は必須です"),
  limit: z.number().int().min(1).max(10).default(5),
});
export type SearchDocumentsInput = z.infer<typeof Input>;

export type DocumentHit = {
  documentId: string;
  title: string;
  sourcePath: string;
  snippet: string;
  similarity: number;
};

export type SearchDocumentsDeps = {
  query?: QueryFn;
  embedder?: Embedder;
};

/**
 * Knowledge Base のドキュメントを検索する Tool (引き継ぎドキュメント §9.3, §12)。
 *
 * Phase 5: pgvector による意味検索（RAG）。クエリを embedding 化し、
 * document_chunks を cosine 距離で近い順に返す。根拠が無ければ空で返す。
 * 読み取り専用なので riskLevel = low。
 */
export function createSearchDocumentsTool(
  deps: SearchDocumentsDeps = {},
): BusinessTool<SearchDocumentsInput, { documents: DocumentHit[] }> {
  const query = deps.query ?? (defaultQuery as unknown as QueryFn);
  const embedder = deps.embedder ?? defaultEmbedder;

  return {
    name: "searchDocuments",
    description:
      "Knowledge Base のドキュメントを意味検索し、根拠として使える抜粋を返す。",
    inputSchema: Input,
    riskLevel: "low",
    async execute(
      input,
      _ctx: ToolContext,
    ): Promise<ToolResult<{ documents: DocumentHit[] }>> {
      const chunks = await retrieveChunks(
        { query, embedder },
        { query: input.query, limit: input.limit },
      );
      const documents: DocumentHit[] = chunks.map((c) => ({
        documentId: c.documentId,
        title: c.title,
        sourcePath: c.sourcePath,
        snippet: c.snippet.length > 300 ? `${c.snippet.slice(0, 300)}…` : c.snippet,
        similarity: c.similarity,
      }));
      return { ok: true, data: { documents } };
    },
  };
}
