/**
 * 業務レコードの集計 (引き継ぎドキュメント §13.5)。純粋関数なので DB 非依存でテストできる。
 *
 * groupBy で指定したフィールドの組み合わせごとに件数を数える。
 * groupBy が空なら全件を 1 グループとして返す。
 */
export type AggregateInput = Record<string, unknown>;

export type AggregateGroup = {
  key: string;
  values: Record<string, string>;
  count: number;
};

export type AggregateResult = {
  total: number;
  groupBy: string[];
  groups: AggregateGroup[];
};

/** groupBy に使えるフィールド（任意の列を集計させない安全弁）。 */
export const ALLOWED_GROUP_FIELDS = ["department", "category", "status", "priority"] as const;

export function aggregateRecords(
  rows: AggregateInput[],
  groupBy: string[],
): AggregateResult {
  const fields = groupBy.filter((f) =>
    (ALLOWED_GROUP_FIELDS as readonly string[]).includes(f),
  );

  if (fields.length === 0) {
    return {
      total: rows.length,
      groupBy: [],
      groups: [{ key: "all", values: {}, count: rows.length }],
    };
  }

  const map = new Map<string, AggregateGroup>();
  for (const row of rows) {
    const values: Record<string, string> = {};
    for (const f of fields) values[f] = String(row[f] ?? "(none)");
    const key = fields.map((f) => values[f]).join(" / ");
    const existing = map.get(key);
    if (existing) existing.count++;
    else map.set(key, { key, values, count: 1 });
  }

  const groups = [...map.values()].sort((a, b) => b.count - a.count);
  return { total: rows.length, groupBy: fields, groups };
}
