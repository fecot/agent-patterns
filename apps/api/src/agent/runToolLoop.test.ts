import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import type { ToolContext } from "@lab/shared";
import type { GenerateOptions, GenerateResult, LlmGateway } from "../llm/types";
import { ToolRegistry } from "../tools/registry";
import type { BusinessTool } from "../tools/types";
import { runToolLoop } from "./runToolLoop";

const ctx: ToolContext = { userId: "u1", workspaceId: "ws1", requestId: "r1" };

/** スクリプト化した応答を順番に返す fake gateway。 */
function scriptedGateway(scripts: GenerateResult[]): LlmGateway & { calls: GenerateOptions[] } {
  const calls: GenerateOptions[] = [];
  let i = 0;
  return {
    calls,
    async generate<T>(options: GenerateOptions<T>) {
      calls.push(options);
      return (scripts[i++] ?? { provider: "mock", text: "fallback" }) as GenerateResult<T>;
    },
  };
}

function echoTool(name: string, riskLevel: "low" | "high" = "low"): BusinessTool {
  return {
    name,
    description: "echo",
    inputSchema: z.object({ query: z.string() }),
    riskLevel,
    async execute(input) {
      return { ok: true, data: { echo: (input as { query: string }).query } };
    },
  };
}

test("toolCall → 実行 → 結果を再入力 → 最終回答", async () => {
  const gateway = scriptedGateway([
    { provider: "mock", toolCalls: [{ name: "echo", arguments: { query: "hi" } }] },
    { provider: "mock", text: "最終回答" },
  ]);
  const registry = new ToolRegistry().register(echoTool("echo"));
  const events: string[] = [];

  const result = await runToolLoop({
    gateway,
    registry,
    taskName: "t",
    messages: [{ role: "user", content: "hi" }],
    ctx,
    onEvent: (e) => void events.push(e),
  });

  assert.equal(result.text, "最終回答");
  assert.equal(result.invocations.length, 1);
  assert.equal(result.invocations[0]!.result.ok, true);
  assert.deepEqual(events, ["tool_call_requested", "tool_call_completed"]);
  // 2 回目の generate には tool メッセージが渡っている。
  const second = gateway.calls[1]!;
  assert.ok(second.messages.some((m) => m.role === "tool"));
});

test("未知の Tool は unknown_tool エラーを結果に積む", async () => {
  const gateway = scriptedGateway([
    { provider: "mock", toolCalls: [{ name: "nope", arguments: {} }] },
    { provider: "mock", text: "done" },
  ]);
  const registry = new ToolRegistry().register(echoTool("echo"));
  const result = await runToolLoop({
    gateway,
    registry,
    taskName: "t",
    messages: [],
    ctx,
  });
  assert.equal(result.invocations[0]!.result.ok, false);
  assert.equal(result.invocations[0]!.result.error?.code, "unknown_tool");
});

test("入力スキーマ違反は invalid_input", async () => {
  const gateway = scriptedGateway([
    { provider: "mock", toolCalls: [{ name: "echo", arguments: { query: 123 } }] },
    { provider: "mock", text: "done" },
  ]);
  const registry = new ToolRegistry().register(echoTool("echo"));
  const result = await runToolLoop({ gateway, registry, taskName: "t", messages: [], ctx });
  assert.equal(result.invocations[0]!.result.error?.code, "invalid_input");
});

test("toolCall が続いても maxSteps で打ち切り、Tool 無しで締める", async () => {
  // 常に toolCall を返し続ける gateway。
  const gateway: LlmGateway & { toolCount: number; finalCalledWithoutTools: boolean } = {
    toolCount: 0,
    finalCalledWithoutTools: false,
    async generate(options) {
      if (!options.tools) {
        this.finalCalledWithoutTools = true;
        return { provider: "mock", text: "締め" };
      }
      this.toolCount++;
      return { provider: "mock", toolCalls: [{ name: "echo", arguments: { query: "x" } }] };
    },
  };
  const registry = new ToolRegistry().register(echoTool("echo"));
  const result = await runToolLoop({
    gateway,
    registry,
    taskName: "t",
    messages: [],
    ctx,
    maxSteps: 2,
  });
  assert.equal(gateway.toolCount, 2);
  assert.equal(gateway.finalCalledWithoutTools, true);
  assert.equal(result.text, "締め");
});
