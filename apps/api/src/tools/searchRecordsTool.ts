import { z } from "zod";
import type { ToolContext, ToolResult } from "@lab/shared";
import { query as defaultQuery } from "../db/client";
import type { BusinessTool } from "./types";

/** DB アクセスを差し替え可能にして、テストを DB 非依存にする。 */
export type QueryFn = <T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[],
) => Promise<{ rows: T[]; rowCount: number | null }>;

const Input = z.object({
  query: z.string().min(1, "検索語は必須です"),
  limit: z.number().int().min(1).max(20).default(5),
  status: z.string().optional(),
  department: z.string().optional(),
});
export type SearchRecordsInput = z.infer<typeof Input>;

export type RecordHit = {
  id: string;
  occurredOn: string;
  department: string;
  category: string;
  title: string;
  status: string;
  priority: string;
};

/**
 * 業務レコードをキーワードで検索する Tool (引き継ぎドキュメント §9.3)。
 * 読み取り専用なので riskLevel = low（承認不要）。
 */
export function createSearchRecordsTool(
  query: QueryFn = defaultQuery as unknown as QueryFn,
): BusinessTool<SearchRecordsInput, { records: RecordHit[] }> {
  return {
    name: "searchRecords",
    description:
      "業務レコード(business_records)をキーワードで検索する。title/body の部分一致。",
    inputSchema: Input,
    riskLevel: "low",
    async execute(input, ctx: ToolContext): Promise<ToolResult<{ records: RecordHit[] }>> {
      const like = `%${input.query}%`;
      const params: unknown[] = [ctx.workspaceId, like];
      let where = "workspace_id = $1 AND (title ILIKE $2 OR body ILIKE $2)";
      if (input.status) {
        params.push(input.status);
        where += ` AND status = $${params.length}`;
      }
      if (input.department) {
        params.push(input.department);
        where += ` AND department = $${params.length}`;
      }
      params.push(input.limit);
      const result = await query<RecordHit & Record<string, unknown>>(
        `SELECT id, occurred_on AS "occurredOn", department, category, title, status, priority
         FROM business_records
         WHERE ${where}
         ORDER BY occurred_on DESC
         LIMIT $${params.length}`,
        params,
      );
      return { ok: true, data: { records: result.rows as RecordHit[] } };
    },
  };
}
