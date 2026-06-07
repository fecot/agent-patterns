import type { FastifyInstance } from "fastify";
import { query } from "../db/client";

/**
 * Task Board 用 API (引き継ぎドキュメント §19)。
 * Router が振り分けた依頼を Task として一覧する。
 */
export async function taskRoutes(app: FastifyInstance) {
  app.get("/api/tasks", async (req) => {
    const { workspaceId } = req.query as { workspaceId?: string };
    const where = workspaceId ? "WHERE workspace_id = $1" : "";
    const params = workspaceId ? [workspaceId] : [];
    const result = await query(
      `SELECT id, status, selected_assistant AS "selectedAssistant", input_json AS "input",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM tasks
       ${where}
       ORDER BY created_at DESC
       LIMIT 100`,
      params,
    );
    return { tasks: result.rows };
  });
}
