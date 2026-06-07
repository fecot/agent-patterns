import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { ApprovalStatus } from "@lab/shared";
import { z } from "zod";
import { query } from "../db/client";
import { logAudit } from "../logs/auditLogger";
import { toolRegistry } from "../tools";
import type { QueryFn } from "../tools/searchRecordsTool";
import {
  approveApproval,
  getApproval,
  listApprovals,
  rejectApproval,
  type ApprovalDeps,
} from "../approvals/approvalService";

const TRAINEE_USER_ID = "00000000-0000-0000-0000-000000000010";

const ListQuery = z.object({
  workspaceId: z.string().min(1),
  status: ApprovalStatus.optional(),
});
const RejectBody = z.object({ reason: z.string().min(1, "却下理由は必須です") });

/**
 * 承認 API (引き継ぎドキュメント §20.6)。
 * 一覧 / 個別取得 / 承認(=実行) / 却下。監査ログは service が onEvent で残す。
 */
export async function approvalRoutes(app: FastifyInstance) {
  const deps = (workspaceId: string, requestId: string): ApprovalDeps => ({
    query: query as unknown as QueryFn,
    registry: toolRegistry,
    onEvent: (eventType, payload) =>
      logAudit({ workspaceId, userId: TRAINEE_USER_ID, requestId, eventType, payload }),
  });

  app.get("/api/approvals", async (req, reply) => {
    const parsed = ListQuery.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const rows = await listApprovals(deps(parsed.data.workspaceId, randomUUID()), parsed.data);
    return { approvals: rows };
  });

  app.get("/api/approvals/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await getApproval(deps("", randomUUID()), id);
    if (!row) return reply.code(404).send({ error: "approval not found" });
    return { approval: row };
  });

  app.post("/api/approvals/:id/approve", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await getApproval(deps("", randomUUID()), id);
    if (!existing) return reply.code(404).send({ error: "approval not found" });
    try {
      const out = await approveApproval(
        deps(existing.workspaceId, randomUUID()),
        { id, approvedBy: TRAINEE_USER_ID },
      );
      return { approval: out.approval, result: out.result };
    } catch (err) {
      return reply.code(409).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.post("/api/approvals/:id/reject", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = RejectBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
    const existing = await getApproval(deps("", randomUUID()), id);
    if (!existing) return reply.code(404).send({ error: "approval not found" });
    try {
      const row = await rejectApproval(
        deps(existing.workspaceId, randomUUID()),
        { id, reason: body.data.reason },
      );
      return { approval: row };
    } catch (err) {
      return reply.code(409).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });
}
