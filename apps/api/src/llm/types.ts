// LLM Gateway のインターフェース (引き継ぎドキュメント §8.2)。
// 上位の Assistant が OpenAI / Anthropic / Mock の差分を意識しないための抽象。

export type LlmProvider = "openai" | "anthropic" | "mock";

export type LlmMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: unknown;
};

export type GenerateOptions<T = unknown> = {
  /** 監査ログやモック応答の出し分けに使う論理名 (例: "chat.reply")。 */
  taskName: string;
  messages: LlmMessage[];
  tools?: ToolDefinition[];
  responseSchema?: unknown;
  temperature?: number;
};

export type GenerateUsage = {
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
};

export type GenerateResult<T = unknown> = {
  text?: string;
  structured?: T;
  toolCalls?: Array<{
    name: string;
    arguments: unknown;
  }>;
  usage?: GenerateUsage;
  raw?: unknown;
  /** どの Provider が応答したか (監査・デバッグ用)。 */
  provider: LlmProvider;
};

export interface LlmGateway {
  generate<T = unknown>(options: GenerateOptions<T>): Promise<GenerateResult<T>>;
}
