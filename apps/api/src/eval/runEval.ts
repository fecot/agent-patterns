import type { ToolDefinition } from "../llm/types";
import { MockProvider } from "../llm/providers/mockProvider";
import { inputGuardrail, outputGuardrail } from "../guardrails/guardrails";
import { GUARDRAIL_CASES, TOOL_SELECTION_CASES } from "./dataset";

export type EvalCaseResult = { suite: string; name: string; ok: boolean; detail: string };
export type EvalReport = { total: number; passed: number; failed: number; cases: EvalCaseResult[] };

const TOOL_DEFS: ToolDefinition[] = [
  { name: "searchRecords", description: "", inputSchema: {} },
  { name: "searchDocuments", description: "", inputSchema: {} },
  { name: "createNotificationDraft", description: "", inputSchema: {} },
  { name: "updateSettingDraft", description: "", inputSchema: {} },
];

/**
 * 最低限の Eval を実行する (引き継ぎドキュメント §15.4)。
 * Tool 選択（mock provider）とガードレール判定を採点して集計する。
 */
export async function runEval(): Promise<EvalReport> {
  const provider = new MockProvider();
  const cases: EvalCaseResult[] = [];

  // 1) Tool 選択 eval。
  for (const c of TOOL_SELECTION_CASES) {
    const res = await provider.generate({
      taskName: "chat.reply",
      messages: [{ role: "user", content: c.message }],
      tools: TOOL_DEFS,
    });
    const picked = res.toolCalls?.[0]?.name ?? null;
    const ok = picked === c.expected;
    cases.push({
      suite: "tool-selection",
      name: c.name,
      ok,
      detail: ok ? `picked=${picked}` : `expected=${c.expected}, got=${picked}`,
    });
  }

  // 2) ガードレール eval。
  for (const c of GUARDRAIL_CASES) {
    const result = c.stage === "input" ? inputGuardrail(c.text) : outputGuardrail(c.text);
    const ok = result.ok === c.shouldPass;
    cases.push({
      suite: `guardrail-${c.stage}`,
      name: c.name,
      ok,
      detail: ok
        ? "as expected"
        : `expected ok=${c.shouldPass}, got ok=${result.ok} (${result.violations.map((v) => v.code).join(",")})`,
    });
  }

  const passed = cases.filter((c) => c.ok).length;
  return { total: cases.length, passed, failed: cases.length - passed, cases };
}
