import type {
  GenerateOptions,
  GenerateResult,
  LlmGateway,
  ToolDefinition,
} from "../types";

/**
 * Mock Provider。API キーなしで動作する (引き継ぎドキュメント §8.3)。
 *
 * taskName ごとに決定的な応答を返すことで、研修環境や CI で
 * 外部 API 課金なしに動かせるようにする。
 * Phase 4 以降は Tool Calling にも対応し、キーワードに応じて
 * 決定的に tool call を返す。
 */
export class MockProvider implements LlmGateway {
  async generate<T = unknown>(
    options: GenerateOptions<T>,
  ): Promise<GenerateResult<T>> {
    const lastUser = [...options.messages].reverse().find((m) => m.role === "user");
    const userText = lastUser?.content ?? "";
    const hasToolResult = options.messages.some((m) => m.role === "tool");

    // Tool が提供され、まだ Tool を実行していなければ、
    // キーワードに応じて決定的に tool call を返す。
    if (options.tools?.length && !hasToolResult) {
      const call = pickToolCall(options.tools, userText);
      if (call) {
        return {
          provider: "mock",
          toolCalls: [call],
          usage: { inputTokens: userText.length, outputTokens: 0, costUsd: 0 },
          raw: { mock: true, taskName: options.taskName, picked: call.name },
        };
      }
    }

    const text = hasToolResult
      ? this.replyWithToolResults(userText, options.messages)
      : this.replyFor(options.taskName, userText);

    return {
      provider: "mock",
      text,
      usage: {
        inputTokens: userText.length,
        outputTokens: text.length,
        costUsd: 0,
      },
      raw: { mock: true, taskName: options.taskName },
    };
  }

  /** Tool 実行結果を踏まえた最終回答 (mock)。 */
  private replyWithToolResults(
    userText: string,
    messages: GenerateOptions["messages"],
  ): string {
    const toolMessages = messages.filter((m) => m.role === "tool");
    return [
      "（Mock Provider: Tool 実行結果を踏まえた回答です。）",
      "",
      `ご質問: 「${userText}」`,
      "以下の検索結果を根拠にしています:",
      ...toolMessages.map((m, i) => `- [tool#${i + 1}] ${summarize(m.content)}`),
    ].join("\n");
  }

  private replyFor(taskName: string, userText: string): string {
    switch (taskName) {
      case "chat.reply":
        return [
          "（Mock Provider の応答です。LLM_PROVIDER=openai で実 LLM に切り替えられます。）",
          "",
          `あなたのメッセージ: 「${userText}」`,
          "検索が必要な質問なら『レコード』『ドキュメント/手順/ポリシー』等の語を含めると Tool が呼ばれます。",
        ].join("\n");
      default:
        return `（Mock）taskName="${taskName}" に対する既定応答です。`;
    }
  }
}

/** ドキュメント検索を促すキーワード。 */
const DOC_KEYWORDS = ["ドキュメント", "文書", "手順", "ポリシー", "ガイド", "規程", "document", "policy"];
/** レコード検索を促すキーワード。 */
const RECORD_KEYWORDS = ["レコード", "記録", "案件", "履歴", "record", "ステータス"];

/**
 * ユーザー文と利用可能 Tool から、決定的に呼ぶ Tool を選ぶ。
 * 該当が無ければ null（= Tool を使わず通常応答）。
 */
function pickToolCall(
  tools: ToolDefinition[],
  userText: string,
): { name: string; arguments: unknown } | null {
  const names = new Set(tools.map((t) => t.name));
  const has = (keywords: string[]) => keywords.some((k) => userText.includes(k));

  if (names.has("searchDocuments") && has(DOC_KEYWORDS)) {
    return { name: "searchDocuments", arguments: { query: userText, limit: 5 } };
  }
  if (names.has("searchRecords") && has(RECORD_KEYWORDS)) {
    return { name: "searchRecords", arguments: { query: userText, limit: 5 } };
  }
  return null;
}

function summarize(content: string): string {
  const trimmed = content.replace(/\s+/g, " ").trim();
  return trimmed.length > 160 ? `${trimmed.slice(0, 160)}…` : trimmed;
}
