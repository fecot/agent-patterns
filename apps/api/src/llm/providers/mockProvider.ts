import type {
  GenerateOptions,
  GenerateResult,
  LlmGateway,
} from "../types";

/**
 * Mock Provider。API キーなしで動作する (引き継ぎドキュメント §8.3)。
 *
 * taskName ごとに決定的な応答を返すことで、研修環境や CI で
 * 外部 API 課金なしに動かせるようにする。
 */
export class MockProvider implements LlmGateway {
  async generate<T = unknown>(
    options: GenerateOptions<T>,
  ): Promise<GenerateResult<T>> {
    const lastUser = [...options.messages].reverse().find((m) => m.role === "user");
    const userText = lastUser?.content ?? "";

    const text = this.replyFor(options.taskName, userText);

    return {
      provider: "mock",
      text,
      usage: {
        // それっぽいダミー値。Audit Log の usage 記録の動作確認に使える。
        inputTokens: userText.length,
        outputTokens: text.length,
        costUsd: 0,
      },
      raw: { mock: true, taskName: options.taskName },
    };
  }

  private replyFor(taskName: string, userText: string): string {
    switch (taskName) {
      case "chat.reply":
        return [
          "（Mock Provider の応答です。LLM_PROVIDER=openai で実 LLM に切り替えられます。）",
          "",
          `あなたのメッセージ: 「${userText}」`,
          "現在は Phase 3 のため固定応答を返しています。RAG や Tool 呼び出しは後続フェーズで有効になります。",
        ].join("\n");
      default:
        return `（Mock）taskName="${taskName}" に対する既定応答です。`;
    }
  }
}
