# Architecture Overview

```
[web (React/Vite)]
      │ /api/*
      ▼
[api (Fastify)] ── LLM Gateway ──▶ openai / anthropic / mock
      │  ├─ Tool Registry        (riskLevel で承認要否を制御)
      │  ├─ Approval Service      (危険操作は Preview→承認→実行)
      │  ├─ Audit Logger          (全 AI 操作を記録)
      │  └─ RAG (chunk/embed/vector search)
      │
      ├─ PostgreSQL (pgvector)
      ├─ Redis ── Queue(BullMQ) ──▶ [worker] ──▶ MinIO(S3)
```

## レイヤの責務

- **Assistant (agents/)**: 汎用の Agent Core。Provider 差分・業務差分を持たない。
- **LLM Gateway (llm/)**: Provider 差分をここに閉じ込める。
- **Tool (tools/)**: 業務差分（外部 I/O・DB 書き込み）をここに閉じ込める。
- **Approval / Audit / Guardrails**: 安全性と監査を担う横断機能。

詳細は各ドキュメントを参照: `llm-gateway.md` / `tool-registry.md` / `approval-flow.md` / `audit-log.md`。
