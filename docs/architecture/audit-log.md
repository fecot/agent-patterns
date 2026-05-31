# Audit Log

すべての AI 関連操作を記録する（土台は Phase 3 で導入）。

- 保存対象: user input / selected assistant / retrieved context / LLM request・response / tool calls・results / approval status / executed action / error / token usage / cost / latency
- テーブル: `audit_logs(id, workspace_id, user_id, request_id, event_type, event_payload, created_at)`
- `event_type` の一覧は `@lab/shared` の `AuditEventType` と一致させる。

設計の詳細は引き継ぎドキュメント §11 を参照。
