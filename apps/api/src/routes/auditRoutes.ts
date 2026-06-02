import type { FastifyInstance } from "fastify";
import { query } from "../db/client";

/**
 * GET /api/audit-logs?requestId=... (引き継ぎドキュメント §20.6)。
 * request_id 単位で 1 リクエストの流れ (入力→LLM要求→応答 …) を時系列で取得する。
 */
export async function auditRoutes(app: FastifyInstance) {
  app.get("/api/audit-logs", async (req, reply) => {
    const { requestId } = req.query as { requestId?: string };
    if (!requestId) {
      return reply.code(400).send({ error: "requestId クエリは必須です" });
    }
    const result = await query(
      `SELECT id, event_type, event_payload, created_at
       FROM audit_logs
       WHERE request_id = $1
       ORDER BY created_at ASC, id ASC`,
      [requestId],
    );
    return { requestId, events: result.rows };
  });
}
