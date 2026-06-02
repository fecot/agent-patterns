import { env } from "../../config/env";
import type {
  GenerateOptions,
  GenerateResult,
  LlmGateway,
} from "../types";

/**
 * OpenAI Provider（骨組み）。
 *
 * Phase 2 ではテキスト生成までを実装する。
 * Tool Calling / Structured Output は後続フェーズで拡張する（下記 TODO）。
 * Responses API を利用し、usage を取得して上位で Audit Log に保存できるようにする。
 */
export class OpenAiProvider implements LlmGateway {
  async generate<T = unknown>(
    options: GenerateOptions<T>,
  ): Promise<GenerateResult<T>> {
    if (!env.OPENAI_API_KEY) {
      throw new Error(
        "OPENAI_API_KEY が未設定です。LLM_PROVIDER=mock で動かすか、.env にキーを設定してください。",
      );
    }

    // Responses API は messages を input として受け取れる。
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        input: options.messages.map((m) => ({
          role: m.role === "tool" ? "user" : m.role,
          content: m.content,
        })),
        temperature: options.temperature,
        // TODO(Phase 4): options.tools を tools パラメータへマッピングする
        // TODO(Phase 8): options.responseSchema を text.format(json_schema) へマッピングする
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenAI API error (${res.status}): ${body}`);
    }

    const data = (await res.json()) as {
      output_text?: string;
      output?: unknown;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    return {
      provider: "openai",
      text: data.output_text ?? "",
      usage: {
        inputTokens: data.usage?.input_tokens,
        outputTokens: data.usage?.output_tokens,
      },
      raw: data,
    };
  }
}
