import { env } from "../config/env.js";
import type { LlmGateway } from "./types.js";
import { MockProvider } from "./providers/mockProvider.js";
import { OpenAiProvider } from "./providers/openaiProvider.js";
import { AnthropicProvider } from "./providers/anthropicProvider.js";

/**
 * LLM_PROVIDER に応じて Provider を選ぶファクトリ。
 * Provider 差分はここまでで閉じ込め、Assistant/Tool 側は意識しない
 * （引き継ぎドキュメント §26.5）。
 */
function createGateway(): LlmGateway {
  switch (env.LLM_PROVIDER) {
    case "openai":
      return new OpenAiProvider();
    case "anthropic":
      return new AnthropicProvider();
    case "mock":
    default:
      return new MockProvider();
  }
}

/** アプリ全体で共有する Gateway インスタンス。 */
export const llmGateway: LlmGateway = createGateway();
