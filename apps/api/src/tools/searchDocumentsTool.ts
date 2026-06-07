import { z } from "zod";
import type { ToolContext, ToolResult } from "@lab/shared";
import { query as defaultQuery } from "../db/client";
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
};

/**
 * Knowledge Base のドキュメントを検索する Tool (引き継ぎドキュメント §9.3)。
 *
 * Phase 4 では content/title のキーワード一致で返す。
 * Phase 5 で pgvector による意味検索（RAG）に差し替える。
 * 読み取り専用なので riskLevel = low。
 */
export function createSearchDocumentsTool(
  query: QueryFn = defaultQuery as unknown as QueryFn,
): BusinessTool<SearchDocumentsInput, { documents: DocumentHit[] }> {
  return {
    name: "searchDocuments",
    description:
      "Knowledge Base のドキュメントをキーワードで検索し、根拠として使える抜粋を返す。",
    inputSchema: Input,
    riskLevel: "low",
    async execute(
      input,
      _ctx: ToolContext,
    ): Promise<ToolResult<{ documents: DocumentHit[] }>> {
      const like = `%${input.query}%`;
      const result = await query<DocumentHit & Record<string, unknown>>(
        `SELECT id AS "documentId", title, source_path AS "sourcePath",
                left(content, 300) AS snippet
         FROM documents
         WHERE content ILIKE $1 OR title ILIKE $1
         ORDER BY source_path ASC
         LIMIT $2`,
        [like, input.limit],
      );
      return { ok: true, data: { documents: result.rows as DocumentHit[] } };
    },
  };
}
