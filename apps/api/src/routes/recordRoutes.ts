import type { FastifyInstance } from "fastify";
import { query } from "../db/client";

/** GET /api/records — 業務レコード一覧 (引き継ぎドキュメント §20.5)。 */
export async function recordRoutes(app: FastifyInstance) {
  app.get("/api/records", async (req) => {
    const { workspaceId } = req.query as { workspaceId?: string };

    const where = workspaceId ? "WHERE workspace_id = $1" : "";
    const params = workspaceId ? [workspaceId] : [];

    const result = await query(
      `SELECT id, workspace_id, occurred_on, department, category, title, body,
              status, priority, assignee, tags, created_at, updated_at
       FROM business_records
       ${where}
       ORDER BY occurred_on DESC, created_at DESC
       LIMIT 200`,
      params,
    );

    return { records: result.rows };
  });
}
