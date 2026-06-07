import type { AuditEventType, ToolContext, ToolResult } from "@lab/shared";
import type { LlmGateway, LlmMessage } from "../llm/types";
import type { ToolRegistry } from "../tools/registry";

export type ToolLoopEvent = (
  eventType: Extract<AuditEventType, "tool_call_requested" | "tool_call_completed">,
  payload: unknown,
) => void | Promise<void>;

export type ToolInvocation = {
  name: string;
  arguments: unknown;
  result: ToolResult;
};

export type ToolLoopResult = {
  text: string;
  provider: string;
  usage?: { inputTokens?: number; outputTokens?: number; costUsd?: number };
  invocations: ToolInvocation[];
};

export type RunToolLoopOptions = {
  gateway: LlmGateway;
  registry: ToolRegistry;
  taskName: string;
  messages: LlmMessage[];
  ctx: ToolContext;
  /** tool call の暴走を防ぐ上限 (引き継ぎドキュメント §9.4)。 */
  maxSteps?: number;
  onEvent?: ToolLoopEvent;
};

/**
 * Tool Calling のコアループ (引き継ぎドキュメント §9.4)。
 *
 * LLM が toolCalls を返す → Registry で実行 → 結果を tool メッセージとして
 * 再入力 → 最終回答が返るまで繰り返す。上限到達時は Tool 無しで締める。
 */
export async function runToolLoop(options: RunToolLoopOptions): Promise<ToolLoopResult> {
  const { gateway, registry, taskName, ctx, onEvent } = options;
  const maxSteps = options.maxSteps ?? 4;
  const working: LlmMessage[] = [...options.messages];
  const invocations: ToolInvocation[] = [];
  const definitions = registry.definitions();

  for (let step = 0; step < maxSteps; step++) {
    const result = await gateway.generate({ taskName, messages: working, tools: definitions });

    if (!result.toolCalls || result.toolCalls.length === 0) {
      return {
        text: result.text ?? "",
        provider: result.provider,
        usage: result.usage,
        invocations,
      };
    }

    for (const call of result.toolCalls) {
      await onEvent?.("tool_call_requested", { name: call.name, arguments: call.arguments });
      const toolResult = await executeCall(registry, call, ctx);
      invocations.push({ name: call.name, arguments: call.arguments, result: toolResult });
      await onEvent?.("tool_call_completed", { name: call.name, ok: toolResult.ok });

      working.push({ role: "assistant", content: `tool_call: ${call.name}` });
      working.push({ role: "tool", content: JSON.stringify(toolResult) });
    }
  }

  // 上限到達: Tool を渡さず最終回答だけ生成する。
  const final = await gateway.generate({ taskName, messages: working });
  return {
    text: final.text ?? "",
    provider: final.provider,
    usage: final.usage,
    invocations,
  };
}

async function executeCall(
  registry: ToolRegistry,
  call: { name: string; arguments: unknown },
  ctx: ToolContext,
): Promise<ToolResult> {
  const tool = registry.get(call.name);
  if (!tool) {
    return { ok: false, error: { code: "unknown_tool", message: `未知の Tool: ${call.name}` } };
  }
  const parsed = tool.inputSchema.safeParse(call.arguments);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: "invalid_input", message: parsed.error.issues.map((i) => i.message).join("; ") },
    };
  }
  try {
    return await tool.execute(parsed.data, ctx);
  } catch (err) {
    return {
      ok: false,
      error: { code: "execution_failed", message: err instanceof Error ? err.message : String(err) },
    };
  }
}
