import type { z } from "zod";
import type { RiskLevel, ToolContext, ToolResult } from "@lab/shared";

/**
 * Assistant が利用できる Tool の共通インターフェース (引き継ぎドキュメント §9.2)。
 *
 * - inputSchema: 入力の検証に使う Zod スキーマ。LLM へ渡す JSON Schema もここから生成する。
 * - riskLevel: high は必ず Human Approval を通す (Phase 6)。
 * - execute: 実際の処理。書き込み系は preview / requiresApproval を返す。
 */
export interface BusinessTool<I = unknown, O = unknown> {
  name: string;
  description: string;
  // 第3型引数を any にして、ZodDefault/ZodOptional で入力(任意)と
  // 出力(確定)の型がずれても代入できるようにする。
  inputSchema: z.ZodType<I, z.ZodTypeDef, any>;
  riskLevel: RiskLevel;
  /**
   * Chat から呼ばれる入口。書き込み系 Tool はここでは副作用を起こさず、
   * preview を作って requiresApproval を返す（Phase 6）。
   */
  execute(input: I, ctx: ToolContext): Promise<ToolResult<O>>;
  /**
   * 承認後に実際の副作用を行う（書き込み系のみ実装）。
   * approvalService が承認済み入力で呼ぶ。
   */
  executeApproved?(input: I, ctx: ToolContext): Promise<ToolResult<O>>;
}
