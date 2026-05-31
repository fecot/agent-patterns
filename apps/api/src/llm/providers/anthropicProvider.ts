import type {
  GenerateOptions,
  GenerateResult,
  LlmGateway,
} from "../types.js";

/**
 * Anthropic Provider（未実装）。
 *
 * 型だけ満たし、呼ばれたら明示的に失敗する。
 * 本実装は後続フェーズ。Tool Use 対応、Structured Output は
 * JSON Schema プロンプト + Zod 検証で扱う方針（引き継ぎドキュメント §8.3）。
 */
export class AnthropicProvider implements LlmGateway {
  async generate<T = unknown>(
    _options: GenerateOptions<T>,
  ): Promise<GenerateResult<T>> {
    throw new Error(
      "anthropicProvider は未実装です。LLM_PROVIDER=mock または openai を使ってください。",
    );
  }
}
