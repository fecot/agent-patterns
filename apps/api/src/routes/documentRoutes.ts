import type { FastifyInstance } from "fastify";
import { query } from "../db/client.js";

/** GET /api/documents — Knowledge Base のドキュメント一覧 (引き継ぎドキュメント §20.4)。 */
export async function documentRoutes(app: FastifyInstance) {
  app.get("/api/documents", async () => {
    const result = await query(
      `SELECT id, title, source_path, created_at
       FROM documents
       ORDER BY source_path ASC`,
    );
    return { documents: result.rows };
  });

  // 個別取得 (本文付き)。学習中に中身を確認できるよう用意。
  app.get("/api/documents/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = await query(
      `SELECT id, title, source_path, content, created_at FROM documents WHERE id = $1`,
      [id],
    );
    if (result.rowCount === 0) {
      return reply.code(404).send({ error: "document not found" });
    }
    return { document: result.rows[0] };
  });
}
