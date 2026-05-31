# Approval Policy

危険な操作は人間の承認（Approval）を必ず通します。

## 承認が必要な操作

- Setting（設定）の変更 … riskLevel: high。必ず Approval 対象。
- Notification の送信を伴う操作 … riskLevel: medium。原則 Approval 対象。
- 外部連携・書き込みを伴う操作全般。

## 承認フロー

1. Assistant が実行案を生成し、Preview を提示する。
2. Approval レコードが pending 状態で作成される。
3. 権限を持つ人間が承認（approved）または却下（rejected）する。
4. 承認後にのみ実際の操作が実行（executed）される。
5. 一連の流れはすべて Audit Log に記録される。

## 却下

却下する場合は理由（rejected_reason）を必ず残します。後から判断の経緯を追えるようにするためです。
