# Operation Policy

Acme Operations Platform における日常運用のルールをまとめます。

## Record の管理

- すべての Record には status（open / in_progress / resolved / closed）と priority（low / medium / high）を設定します。
- high priority の Record は担当者（assignee）を必ず割り当てます。
- 24 時間以上 open のまま放置された high priority Record は朝会で確認します。

## カテゴリ

Record は次のいずれかの category に分類します: inquiry / incident / request / maintenance。

## エスカレーション

- 自分で解決できない Record は、関連する expertise を持つ Contact に相談します。
- 影響範囲が広い incident は Setting の変更を伴う場合があり、その際は Approval Policy に従います。
