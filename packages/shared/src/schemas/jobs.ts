import { z } from "zod";

/** 非同期 Job の状態 (引き継ぎドキュメント §13.3)。 */
export const JobStatus = z.enum([
  "queued",
  "running",
  "success",
  "error",
  "cancelled",
]);
export type JobStatus = z.infer<typeof JobStatus>;

/** report_jobs テーブルに対応する型 (引き継ぎドキュメント §13.4)。本実装は Phase 7。 */
export const ReportJob = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  status: JobStatus,
  inputJson: z.unknown(),
  resultFileKey: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  startedAt: z.string().datetime().nullable().optional(),
  finishedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ReportJob = z.infer<typeof ReportJob>;
