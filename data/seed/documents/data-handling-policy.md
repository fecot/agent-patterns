# Data Handling Policy

データの取り扱いに関するルールです。

## Workspace 分離

- データは Workspace 単位で分離します。workspaceId をまたいだ参照・操作は禁止です。
- Assistant や Tool は、要求元の Workspace 以外のデータにアクセスしてはいけません。

## 個人情報

- Contact は架空データのみを扱います。実在の人物データは登録しません。
- 出力に不要な個人情報を含めないようにします。

## ログ

- AI への入力・出力、Tool 実行、Approval、エラーはすべて Audit Log に保存します。
- ログには request_id を付け、1 リクエストの流れを後から追跡できるようにします。
