import { z } from "zod";
import type { ToolContext, ToolResult } from "@lab/shared";
import { query as defaultQuery } from "../db/client";
import { loadApprovalRequirement } from "./approvalRule";
import type { QueryFn } from "./searchRecordsTool";
import type { BusinessTool } from "./types";

const Input = z.object({
  targetName: z.string().min(1, "通知先名は必須です"),
  subject: z.string().min(1, "件名は必須です"),
  body: z.string().min(1, "本文は必須です"),
});
export type CreateNotificationInput = z.infer<typeof Input>;

export type NotificationPreview = {
  targetName: string;
  channel: string | null;
  address: string | null;
  resolved: boolean;
  subject: string;
  body: string;
};

const NAME = "createNotificationDraft";

/**
 * 通知の下書きを作る Tool (引き継ぎドキュメント §9.3, §10)。
 *
 * execute は副作用を起こさず、宛先を解決した preview を返すだけ。
 * 実送信は承認後に executeApproved で行う。riskLevel = high。
 */
export function createNotificationDraftTool(
  query: QueryFn = defaultQuery as unknown as QueryFn,
): BusinessTool<CreateNotificationInput, NotificationPreview> {
  return {
    name: NAME,
    description:
      "指定した通知先へ送る通知の下書きを作成する（送信は人間の承認後）。",
    inputSchema: Input,
    riskLevel: "high",

    async execute(input, ctx): Promise<ToolResult<NotificationPreview>> {
      const target = await resolveTarget(query, ctx.workspaceId, input.targetName);
      const preview: NotificationPreview = {
        targetName: input.targetName,
        channel: target?.channel ?? null,
        address: target?.address ?? null,
        resolved: target != null,
        subject: input.subject,
        body: input.body,
      };
      const requiresApproval = await loadApprovalRequirement(query, ctx.workspaceId, NAME);
      return { ok: true, data: preview, preview, requiresApproval };
    },

    async executeApproved(input, ctx): Promise<ToolResult<NotificationPreview>> {
      const target = await resolveTarget(query, ctx.workspaceId, input.targetName);
      if (!target) {
        return {
          ok: false,
          error: { code: "target_not_found", message: `通知先が見つかりません: ${input.targetName}` },
        };
      }
      await query(
        `INSERT INTO notifications(workspace_id, target_name, channel, subject, body, status)
         VALUES ($1, $2, $3, $4, $5, 'sent')`,
        [ctx.workspaceId, input.targetName, target.channel, input.subject, input.body],
      );
      return {
        ok: true,
        data: {
          targetName: input.targetName,
          channel: target.channel,
          address: target.address,
          resolved: true,
          subject: input.subject,
          body: input.body,
        },
      };
    },
  };
}

async function resolveTarget(
  query: QueryFn,
  workspaceId: string,
  name: string,
): Promise<{ channel: string; address: string } | null> {
  const result = await query<{ channel: string; address: string }>(
    `SELECT channel, address FROM notification_targets
     WHERE workspace_id = $1 AND name = $2 LIMIT 1`,
    [workspaceId, name],
  );
  return result.rows[0] ?? null;
}
