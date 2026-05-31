# Tool Registry

Assistant が利用可能な Tool を一元管理する（本実装は Phase 4 以降）。

- `BusinessTool` インターフェース: `name` / `description` / `inputSchema(Zod)` / `riskLevel` / `execute()`
- `riskLevel`: low / medium / high。high は必ず Approval を通す。
- 初期 Tool: searchRecords / searchDocuments / createNotificationDraft / updateSettingDraft / generateReport

設計の詳細は引き継ぎドキュメント §9 を参照。
