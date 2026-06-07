import { z } from "zod";
import type { ToolContext, ToolResult } from "@lab/shared";
import { query as defaultQuery } from "../db/client";
import { loadApprovalRequirement } from "./approvalRule";
import type { QueryFn } from "./searchRecordsTool";
import type { BusinessTool } from "./types";

const Input = z.object({
  key: z.string().min(1, "設定キーは必須です"),
  value: z.string().min(1, "設定値は必須です"),
});
export type UpdateSettingInput = z.infer<typeof Input>;

export type SettingPreview = {
  key: string;
  currentValue: string | null;
  newValue: string;
};

const NAME = "updateSettingDraft";

/**
 * ワークスペース設定の変更案を作る Tool (引き継ぎドキュメント §9.3, §10)。
 *
 * execute は現在値を読むだけで書き込まない。実変更は承認後に executeApproved で行う。
 * 設定変更は最も危険なので riskLevel = high。
 */
export function updateSettingDraftTool(
  query: QueryFn = defaultQuery as unknown as QueryFn,
): BusinessTool<UpdateSettingInput, SettingPreview> {
  return {
    name: NAME,
    description: "ワークスペース設定の変更案を作成する（適用は人間の承認後）。",
    inputSchema: Input,
    riskLevel: "high",

    async execute(input, ctx): Promise<ToolResult<SettingPreview>> {
      const current = await readSetting(query, ctx.workspaceId, input.key);
      const preview: SettingPreview = {
        key: input.key,
        currentValue: current,
        newValue: input.value,
      };
      const requiresApproval = await loadApprovalRequirement(query, ctx.workspaceId, NAME);
      return { ok: true, data: preview, preview, requiresApproval };
    },

    async executeApproved(input, ctx): Promise<ToolResult<SettingPreview>> {
      const current = await readSetting(query, ctx.workspaceId, input.key);
      await query(
        `INSERT INTO settings(workspace_id, key, value, updated_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (workspace_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [ctx.workspaceId, input.key, input.value],
      );
      return {
        ok: true,
        data: { key: input.key, currentValue: current, newValue: input.value },
      };
    },
  };
}

async function readSetting(
  query: QueryFn,
  workspaceId: string,
  key: string,
): Promise<string | null> {
  const result = await query<{ value: string }>(
    `SELECT value FROM settings WHERE workspace_id = $1 AND key = $2 LIMIT 1`,
    [workspaceId, key],
  );
  return result.rows[0]?.value ?? null;
}
