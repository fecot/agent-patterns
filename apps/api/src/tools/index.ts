import { ToolRegistry } from "./registry";
import { createSearchRecordsTool } from "./searchRecordsTool";
import { createSearchDocumentsTool } from "./searchDocumentsTool";
import { createNotificationDraftTool } from "./createNotificationDraftTool";
import { updateSettingDraftTool } from "./updateSettingDraftTool";

export type { BusinessTool } from "./types";
export { ToolRegistry } from "./registry";

/**
 * アプリ全体で共有する Tool Registry。
 * - 読み取り系（low）: searchRecords / searchDocuments
 * - 書き込み系（high, 承認必須）: createNotificationDraft / updateSettingDraft
 */
export const toolRegistry = new ToolRegistry()
  .register(createSearchRecordsTool())
  .register(createSearchDocumentsTool())
  .register(createNotificationDraftTool())
  .register(updateSettingDraftTool());
