/**
 * Guardrails (引き継ぎドキュメント §15)。
 *
 * LLM の入出力を検査し、危険・不正な内容を止める。
 * すべて純粋関数で、Audit Log への記録は呼び出し側が行う。
 */
export type Violation = { code: string; message: string };
export type GuardrailResult = { ok: boolean; violations: Violation[] };

const MAX_INPUT_CHARS = 4000;
const MAX_OUTPUT_CHARS = 8000;

/** プロンプトインジェクションを疑うパターン。 */
const INJECTION_PATTERNS: { re: RegExp; code: string }[] = [
  { re: /ignore\s+(all\s+)?previous\s+instructions/i, code: "prompt_injection" },
  { re: /これまでの指示を(無視|忘れ)/, code: "prompt_injection" },
  { re: /system\s*prompt\s*(を|:)/i, code: "prompt_injection" },
];

/** 出力に混入してはいけないパターン（秘密情報の漏洩など）。 */
const SECRET_PATTERNS: { re: RegExp; code: string }[] = [
  { re: /sk-[A-Za-z0-9]{16,}/, code: "leaked_api_key" },
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, code: "leaked_private_key" },
];

/** 入力ガードレール: LLM に渡す前に検査する。 */
export function inputGuardrail(message: string): GuardrailResult {
  const violations: Violation[] = [];
  const trimmed = message.trim();
  if (trimmed.length === 0) {
    violations.push({ code: "empty_input", message: "入力が空です" });
  }
  if (message.length > MAX_INPUT_CHARS) {
    violations.push({ code: "too_long", message: `入力が長すぎます (${MAX_INPUT_CHARS} 文字以内)` });
  }
  for (const { re, code } of INJECTION_PATTERNS) {
    if (re.test(message)) {
      violations.push({ code, message: "プロンプトインジェクションの疑いがあります" });
      break;
    }
  }
  return { ok: violations.length === 0, violations };
}

/** 出力ガードレール: ユーザーへ返す前に検査する。 */
export function outputGuardrail(text: string): GuardrailResult {
  const violations: Violation[] = [];
  if (text.trim().length === 0) {
    violations.push({ code: "empty_output", message: "出力が空です" });
  }
  if (text.length > MAX_OUTPUT_CHARS) {
    violations.push({ code: "output_too_long", message: "出力が長すぎます" });
  }
  for (const { re, code } of SECRET_PATTERNS) {
    if (re.test(text)) {
      violations.push({ code, message: "秘密情報が含まれている可能性があります" });
    }
  }
  return { ok: violations.length === 0, violations };
}

/** 出力が弾かれたときの安全な代替文。 */
export const SAFE_FALLBACK_REPLY =
  "回答を生成しましたが、安全性チェックに引っかかったため表示できません。表現を変えて再度お試しください。";
