import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./config/env.js";

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
    phase: "0",
    hint: "GET /health で疎通確認。records/documents/chat は後続フェーズで追加。",
  }));

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
