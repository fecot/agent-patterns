import type { AssistantKind } from "@lab/shared";

/**
 * Router Assistant (引き継ぎドキュメント §18)。
 *
 * assistant=auto のとき、依頼内容から担当 Assistant を決める意図分類。
 * 学習用に決定的なルールベースで実装する（実運用では LLM 分類に差し替え可能）。
 * 純粋関数なのでテストしやすい。
 */
const RULES: { kind: Exclude<AssistantKind, "auto">; keywords: string[] }[] = [
  { kind: "report", keywords: ["レポート", "集計", "件数", "統計", "report", "サマリ", "まとめて"] },
  { kind: "scoring", keywords: ["スコア", "評価", "採点", "ランキング", "順位", "score"] },
  { kind: "action", keywords: ["通知", "送信", "連絡", "設定", "変更", "実行", "作成して", "依頼"] },
  { kind: "knowledge", keywords: ["教えて", "とは", "手順", "ポリシー", "ガイド", "どうやって", "方法"] },
];

export type RouteResult = {
  assistant: Exclude<AssistantKind, "auto">;
  matched: string | null;
};

/** 依頼内容から担当 Assistant を決める。該当が無ければ knowledge を既定にする。 */
export function routeAssistant(message: string): RouteResult {
  for (const rule of RULES) {
    const hit = rule.keywords.find((k) => message.includes(k));
    if (hit) return { assistant: rule.kind, matched: hit };
  }
  return { assistant: "knowledge", matched: null };
}

/** assistant が auto なら router で解決し、そうでなければそのまま使う。 */
export function resolveAssistant(
  requested: AssistantKind,
  message: string,
): RouteResult {
  if (requested === "auto") return routeAssistant(message);
  return { assistant: requested, matched: null };
}
