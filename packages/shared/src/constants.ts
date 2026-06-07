/**
 * API(producer) と Worker(consumer) で共有する Queue 名など (引き継ぎドキュメント §13.1)。
 * 文字列のズレで Job が届かない事故を防ぐため 1 箇所に置く。
 */
export const REPORT_QUEUE_NAME = "report";

/** report ファイルの命名規約: reports/{workspaceId}/{jobId}.{ext} (引き継ぎドキュメント §14.2)。 */
export function reportFileKey(workspaceId: string, jobId: string, ext = "docx"): string {
  return `reports/${workspaceId}/${jobId}.${ext}`;
}
