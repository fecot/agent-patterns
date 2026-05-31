import { z } from "zod";

/** Report 生成 Job の入力 (引き継ぎドキュメント §3.3, §13)。本実装は Phase 7。 */
export const ReportRequest = z.object({
  workspaceId: z.string().min(1),
  /** 集計対象期間 (ISO 日付)。 */
  periodFrom: z.string().date(),
  periodTo: z.string().date(),
  /** 集計観点 (例: department, category)。 */
  groupBy: z.array(z.string()).default([]),
  /** 任意の自由記述指示。 */
  note: z.string().optional(),
});
export type ReportRequest = z.infer<typeof ReportRequest>;
