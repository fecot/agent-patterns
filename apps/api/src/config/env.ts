import { z } from "zod";

/**
 * 環境変数を 1 箇所で検証する。
 * 起動時に不正な値があれば即座に落とすことで、後段のバグを防ぐ。
 * 値の意味は .env.example と README を参照。
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(8080),

  DATABASE_URL: z
    .string()
    .default("postgres://postgres:postgres@postgres:5432/agent_training"),
  REDIS_URL: z.string().default("redis://redis:6379"),

  MINIO_ENDPOINT: z.string().default("http://minio:9000"),
  MINIO_ACCESS_KEY: z.string().default("minioadmin"),
  MINIO_SECRET_KEY: z.string().default("minioadmin"),
  MINIO_BUCKET: z.string().default("generated-files"),

  // LLM はデフォルト mock。API キーなしで学習・CI できるようにする方針。
  LLM_PROVIDER: z.enum(["openai", "anthropic", "mock"]).default("mock"),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),

  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-5"),

  APP_BASE_URL: z.string().default("http://localhost:3000"),
  API_BASE_URL: z.string().default("http://localhost:8080"),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("環境変数の検証に失敗しました:");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
