import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import type { ToolContext, ToolResult } from "@lab/shared";
import { ToolRegistry } from "../tools/registry";
import type { BusinessTool } from "../tools/types";
import type { QueryFn } from "../tools/searchRecordsTool";
import { approveApproval, createApproval, rejectApproval, type ApprovalRow } from "./approvalService";

/** pending な approval 1 件を保持する fake DB。 */
function fakeDb(initial?: Partial<ApprovalRow>) {
  let row: ApprovalRow = {
    id: "ap1",
    workspaceId: "ws1",
    userId: "u1",
    toolName: "writeTool",
    riskLevel: "high",
    inputJson: { value: "x" },
    previewJson: { preview: true },
    status: "pending",
    requestedByAgent: "action",
    approvedBy: null,
    rejectedReason: null,
    executedAt: null,
    createdAt: "t0",
    updatedAt: "t0",
    ...initial,
  };
  const query: QueryFn = async (text, params) => {
    if (/INSERT INTO approvals/.test(text)) return { rows: [row] as never[], rowCount: 1 };
    if (/FROM approvals\s+WHERE id/.test(text)) return { rows: [row] as never[], rowCount: 1 };
    if (/UPDATE approvals/.test(text)) {
      if (/SET status = 'rejected'/.test(text)) {
        row = { ...row, status: "rejected", rejectedReason: String(params![1]) };
      } else {
        row = {
          ...row,
          status: String(params![1]) as ApprovalRow["status"],
          approvedBy: (params![2] as string) ?? row.approvedBy,
        };
      }
      return { rows: [row] as never[], rowCount: 1 };
    }
    return { rows: [] as never[], rowCount: 0 };
  };
  return { query, current: () => row };
}

function writeTool(opts: { ok: boolean }): BusinessTool {
  let executed = false;
  const tool: BusinessTool & { wasExecuted: () => boolean } = {
    name: "writeTool",
    description: "",
    inputSchema: z.object({ value: z.string() }),
    riskLevel: "high",
    async execute(): Promise<ToolResult> {
      return { ok: true, requiresApproval: true, preview: { preview: true } };
    },
    async executeApproved(_input, _ctx: ToolContext): Promise<ToolResult> {
      executed = true;
      return opts.ok
        ? { ok: true, data: { done: true } }
        : { ok: false, error: { code: "boom", message: "失敗" } };
    },
    wasExecuted: () => executed,
  };
  return tool;
}

test("createApproval は pending を作り approval_created を記録する", async () => {
  const db = fakeDb();
  const events: string[] = [];
  const row = await createApproval(
    { query: db.query, registry: new ToolRegistry(), onEvent: (e) => void events.push(e) },
    {
      workspaceId: "ws1",
      userId: "u1",
      toolName: "writeTool",
      riskLevel: "high",
      input: { value: "x" },
      preview: { preview: true },
      requestedByAgent: "action",
    },
  );
  assert.equal(row.status, "pending");
  assert.deepEqual(events, ["approval_created"]);
});

test("approve は Tool を実行し executed にする", async () => {
  const db = fakeDb();
  const tool = writeTool({ ok: true }) as ReturnType<typeof writeTool> & { wasExecuted: () => boolean };
  const registry = new ToolRegistry().register(tool);
  const events: string[] = [];
  const out = await approveApproval(
    { query: db.query, registry, onEvent: (e) => void events.push(e) },
    { id: "ap1", approvedBy: "approver" },
  );
  assert.equal(out.result.ok, true);
  assert.equal(out.approval.status, "executed");
  assert.equal(db.current().approvedBy, "approver");
  assert.deepEqual(events, ["approval_approved", "action_executed"]);
});

test("Tool 実行が失敗すると failed + guardrail_triggered", async () => {
  const db = fakeDb();
  const registry = new ToolRegistry().register(writeTool({ ok: false }));
  const events: string[] = [];
  const out = await approveApproval(
    { query: db.query, registry, onEvent: (e) => void events.push(e) },
    { id: "ap1", approvedBy: "approver" },
  );
  assert.equal(out.approval.status, "failed");
  assert.deepEqual(events, ["approval_approved", "guardrail_triggered"]);
});

test("既に終端の approval は承認できない", async () => {
  const db = fakeDb({ status: "executed" });
  const registry = new ToolRegistry().register(writeTool({ ok: true }));
  await assert.rejects(
    approveApproval({ query: db.query, registry }, { id: "ap1", approvedBy: "x" }),
    /できません/,
  );
});

test("reject は理由を保存して rejected にする", async () => {
  const db = fakeDb();
  const events: string[] = [];
  const row = await rejectApproval(
    { query: db.query, registry: new ToolRegistry(), onEvent: (e) => void events.push(e) },
    { id: "ap1", reason: "宛先が不適切" },
  );
  assert.equal(row.status, "rejected");
  assert.deepEqual(events, ["approval_rejected"]);
});
