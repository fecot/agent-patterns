# Phase 3 開発ログ — Chat UI ⇔ /api/chat

> このファイルは Phase 3 実装時に埋める。

## 何を作ったか
- `logs/auditLogger.ts`: audit_logs への記録ユーティリティ
- `POST /api/chat`: 入力検証(Zod) → 会話作成 → LLM Gateway(mock) → 会話/監査ログ保存 → 応答
- `GET /api/audit-logs?requestId=`: request_id 単位で流れを時系列取得
- web の ChatPanel から実際に応答が返る

## なぜこの設計にしたか
- **Audit Log を最初から通す**（§11, §26.3）。後付けにせず Phase 3 で `user_message_received → assistant_selected → llm_requested → llm_responded` を記録。
- **Router を挟まない**: Phase 3 では選択 assistant をそのまま使う。auto の本振り分けは Phase 9。
- **入力は @lab/shared の Zod スキーマで検証**: web/api で同じ「データの形」を共有。
- **LLM 失敗時も監査に残す**: `guardrail_triggered` で記録し 502 を返す。

## ハマったポイント / トレードオフ
- **会話は毎回新規作成**: MVP では履歴の継続より「保存される」ことを優先。conversationId を受け取る継続は将来拡張。
- **固定ユーザー/Workspace**: 認証は本リポジトリの対象外。seed と同じ ID を使う割り切り。

## 試せるコマンド
```bash
REQID=$(curl -s -X POST localhost:8080/api/chat -H 'content-type: application/json' \
  -d '{"message":"テスト","assistant":"knowledge","workspaceId":"00000000-0000-0000-0000-000000000001"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['requestId'])")
curl -s "localhost:8080/api/audit-logs?requestId=$REQID"
# => events: user_message_received, assistant_selected, llm_requested, llm_responded
```

## 関連コミット（件名）
- feat(api): Chat API・Audit Logger・audit-logs 取得を追加
