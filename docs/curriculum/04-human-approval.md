# 04. Human Approval

## ゴール
AI が実行案を作り、人間が承認した後に実行される（Phase 6）。

## 学ぶこと
- Preview → Approval レコード → 承認/却下 → 実行 → Audit Log
- high risk Tool は approval 必須
- 却下理由の保存

## 手を動かす
- `createNotificationDraftTool` / `updateSettingDraftTool` を承認フローに載せる。
