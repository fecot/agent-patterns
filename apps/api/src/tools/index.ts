import { ToolRegistry } from "./registry";
import { createSearchRecordsTool } from "./searchRecordsTool";
import { createSearchDocumentsTool } from "./searchDocumentsTool";

export type { BusinessTool } from "./types";
export { ToolRegistry } from "./registry";

/**
 * アプリ全体で共有する Tool Registry。
 * Phase 4 は読み取り系の検索 Tool のみ。
 * 書き込み系（createNotificationDraft 等, riskLevel=high）は Phase 6 で追加する。
 */
export const toolRegistry = new ToolRegistry()
  .register(createSearchRecordsTool())
  .register(createSearchDocumentsTool());
