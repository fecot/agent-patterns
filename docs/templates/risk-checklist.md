# リスクチェックリスト

Tool / Assistant を追加する前に確認する。

- [ ] LLM に直接 DB 更新や外部送信をさせていないか（実行責任はアプリ側）
- [ ] 書き込み / 送信 / 設定変更 / 外部連携に Approval を入れたか
- [ ] high risk Tool は approval 必須になっているか
- [ ] dryRun=false の危険操作を拒否できるか
- [ ] workspaceId をまたいだ操作を禁止しているか
- [ ] 入力・出力・Tool 実行・承認・エラーを Audit Log に残しているか
- [ ] 出力が JSON Schema に適合しているか / 根拠なしの断定がないか
- [ ] 業界固有語を使っていないか
