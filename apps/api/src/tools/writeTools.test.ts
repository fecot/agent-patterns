import { test } from "node:test";
import assert from "node:assert/strict";
import type { ToolContext } from "@lab/shared";
import { createNotificationDraftTool } from "./createNotificationDraftTool";
import { updateSettingDraftTool } from "./updateSettingDraftTool";
import type { QueryFn } from "./searchRecordsTool";

const ctx: ToolContext = { userId: "u1", workspaceId: "ws1", requestId: "r1" };

/** SELECT/INSERT/UPDATE を分岐して返す fake query。 */
function fakeQuery(handlers: {
  target?: { channel: string; address: string } | null;
  setting?: string | null;
  rule?: boolean;
}) {
  const writes: { text: string; params?: unknown[] }[] = [];
  const query: QueryFn = async (text, params) => {
    if (/FROM notification_targets/.test(text)) {
      return { rows: (handlers.target ? [handlers.target] : []) as never[], rowCount: handlers.target ? 1 : 0 };
    }
    if (/SELECT value FROM settings/.test(text)) {
      return {
        rows: (handlers.setting != null ? [{ value: handlers.setting }] : []) as never[],
        rowCount: handlers.setting != null ? 1 : 0,
      };
    }
    if (/FROM approval_rules/.test(text)) {
      return {
        rows: (handlers.rule != null ? [{ requiresApproval: handlers.rule }] : []) as never[],
        rowCount: handlers.rule != null ? 1 : 0,
      };
    }
    writes.push({ text, params });
    return { rows: [] as never[], rowCount: 1 };
  };
  return { query, writes };
}

test("createNotificationDraft.execute は送信せず preview+requiresApproval を返す", async () => {
  const { query, writes } = fakeQuery({
    target: { channel: "chat", address: "a@example.com" },
    rule: true,
  });
  const tool = createNotificationDraftTool(query);
  const res = await tool.execute({ targetName: "運用チーム", subject: "件名", body: "本文" }, ctx);
  assert.equal(res.ok, true);
  assert.equal(res.requiresApproval, true);
  assert.equal((res.preview as { resolved: boolean }).resolved, true);
  // execute では INSERT を行わない（副作用なし）。
  assert.equal(writes.length, 0);
});

test("createNotificationDraft.executeApproved は notifications に INSERT する", async () => {
  const { query, writes } = fakeQuery({ target: { channel: "chat", address: "a@example.com" } });
  const tool = createNotificationDraftTool(query);
  const res = await tool.executeApproved!(
    { targetName: "運用チーム", subject: "件名", body: "本文" },
    { ...ctx, dryRun: false },
  );
  assert.equal(res.ok, true);
  assert.equal(writes.length, 1);
  assert.match(writes[0]!.text, /INSERT INTO notifications/);
});

test("createNotificationDraft.executeApproved は宛先不明で失敗", async () => {
  const { query, writes } = fakeQuery({ target: null });
  const tool = createNotificationDraftTool(query);
  const res = await tool.executeApproved!(
    { targetName: "存在しない", subject: "s", body: "b" },
    { ...ctx, dryRun: false },
  );
  assert.equal(res.ok, false);
  assert.equal(res.error?.code, "target_not_found");
  assert.equal(writes.length, 0);
});

test("updateSettingDraft.execute は現在値を読み書き込まない", async () => {
  const { query, writes } = fakeQuery({ setting: "email", rule: true });
  const tool = updateSettingDraftTool(query);
  const res = await tool.execute({ key: "notification.default_channel", value: "chat" }, ctx);
  assert.equal(res.requiresApproval, true);
  assert.equal((res.preview as { currentValue: string | null }).currentValue, "email");
  assert.equal(writes.length, 0);
});

test("updateSettingDraft は riskLevel high", () => {
  assert.equal(updateSettingDraftTool(fakeQuery({}).query).riskLevel, "high");
});
