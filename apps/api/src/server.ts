import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./config/env";
import { recordRoutes } from "./routes/recordRoutes";
import { documentRoutes } from "./routes/documentRoutes";
import { chatRoutes } from "./routes/chatRoutes";
import { auditRoutes } from "./routes/auditRoutes";
import { approvalRoutes } from "./routes/approvalRoutes";

/**
 * Fastify API サーバのエントリポイント。
 * Phase 0 では起動と health チェックのみ。
 * routes / agents / llm / db は後続フェーズで段階的に register していく。
 */
export function buildServer() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "development" ? "info" : "warn",
    },
  });

  app.register(cors, { origin: true });

  // 死活監視用。docker compose / 学習者の疎通確認に使う。
  app.get("/health", async () => ({
    status: "ok",
    llmProvider: env.LLM_PROVIDER,
  }));

  app.get("/", async () => ({
    name: "business-agent-training-lab API",
    hint: "GET /health で疎通確認。GET /api/records, /api/documents が利用可能。",
  }));

  // 業務データ参照系のルート (Phase 1)。
  app.register(recordRoutes);
  app.register(documentRoutes);

  // Chat と監査ログ (Phase 3)。
  app.register(chatRoutes);
  app.register(auditRoutes);

  // Human Approval (Phase 6)。
  app.register(approvalRoutes);

  return app;
}

async function main() {
  const app = buildServer();
  try {
    await app.listen({ host: "0.0.0.0", port: env.PORT });
    app.log.info(`API listening on http://0.0.0.0:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
