import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import type { AggregateResult } from "./aggregate";

export type ReportMeta = {
  periodFrom: string;
  periodTo: string;
  note?: string;
};

/**
 * 集計結果を人間可読な行に変換する純粋関数 (引き継ぎドキュメント §14.1)。
 * docx でも他形式でも使えるよう、まず行配列に落としてからレンダリングする。
 * 純粋なのでテストしやすい。
 */
export function buildReportLines(result: AggregateResult, meta: ReportMeta): string[] {
  const lines: string[] = [];
  lines.push("業務レポート");
  lines.push(`対象期間: ${meta.periodFrom} 〜 ${meta.periodTo}`);
  if (meta.note) lines.push(`メモ: ${meta.note}`);
  lines.push(`総件数: ${result.total}`);
  lines.push(
    result.groupBy.length > 0 ? `集計軸: ${result.groupBy.join(", ")}` : "集計軸: なし（全件）",
  );
  lines.push("");
  lines.push("内訳:");
  for (const group of result.groups) {
    lines.push(`- ${group.key}: ${group.count} 件`);
  }
  return lines;
}

/** 集計結果から docx の Buffer を生成する (引き継ぎドキュメント §14.1)。 */
export async function renderReportDocx(
  result: AggregateResult,
  meta: ReportMeta,
): Promise<Buffer> {
  const lines = buildReportLines(result, meta);
  const [title, ...rest] = lines;

  const children = [
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(title ?? "レポート")] }),
    ...rest.map(
      (line) => new Paragraph({ children: [new TextRun(line)] }),
    ),
  ];

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

export const DOCX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
