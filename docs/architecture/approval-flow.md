# Approval Flow

AI の出力をそのまま業務反映しない。危険操作は人間承認を挟む（本実装は Phase 6）。

```
AI が実行案を生成 → Preview 表示 → Approval レコード作成
→ 人間が承認/却下 → 承認後に Tool 実行 → Audit Log 保存
```

状態: pending / approved / rejected / executed / failed

設計の詳細は引き継ぎドキュメント §10 を参照。
