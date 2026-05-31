# Business Agent Training Lab

汎用的な「社内業務エージェント」開発の基礎を学ぶための、**ローカル Docker 完結型 Training Repository** です。

## 1. 目的

特定業務の AI 機能を作ることではなく、**どの業務エージェントにも共通する実装パターン**を身につけることが目的です。

- ユーザー依頼を受け取る → 意図を分類する → 必要なデータ/文書を検索する
- LLM に Context を渡す → 必要に応じて Tool を呼ぶ → 下書き/実行案を生成する
- 危険操作は人間承認を挟む → 承認後に実行する
- すべての入出力・Tool 実行・承認・エラーを監査ログに残す
- 長時間処理は Worker で非同期実行する → 生成物をファイルとして保存する
- 出力品質を Eval / Guardrails で検証する

## 2. 業界固有語を使わない方針

チームメンバーが本質的な技術パターンを学べるよう、**業界固有語を一切使いません**。代わりに汎用語を使います。

| 使う汎用語 | Business Agent / Assistant / Record / Document / Case / Contact / Notification / Report / Setting / Task / Approval / Workspace / Knowledge Base |
| --- | --- |

サンプルデータは架空の業務管理 SaaS「Acme Operations Platform」を題材にしています。

## 3. 学べる技術

RAG / Tool Calling / Structured Output / Human Approval / Audit Log / Worker・Queue / File Generation / Eval・Guardrails / Agent Routing / LLM Provider Abstraction

## 4. Architecture Overview

```
[web (React/Vite)] ──/api──▶ [api (Fastify)] ──▶ PostgreSQL(pgvector)
                                   │  └─ LLM Gateway ─▶ openai / anthropic / mock
                                   │  └─ Tool Registry / Approval / Audit Log
                                   └─ Queue(BullMQ/Redis) ─▶ [worker] ─▶ MinIO(S3)
```

- **LLM Gateway**: 上位の Assistant が OpenAI / Anthropic / Mock の差分を意識しないようにする抽象。
- **Tool Registry**: Assistant が使える Tool を一元管理。riskLevel で承認要否を制御。
- **Human Approval**: 危険操作は Preview → 承認 → 実行の順に必ず人間を挟む。
- **Audit Log**: AI 関連操作をすべて記録する。

詳細は `docs/architecture/` を参照。

## 5. Quick Start

```bash
cp .env.example .env
docker compose up --build
```

起動後（DB を使うフェーズに進んだら）:

```bash
docker compose exec api pnpm db:migrate
docker compose exec api pnpm db:seed
```

## 6. 開発用 URL

| サービス | URL |
| --- | --- |
| web | http://localhost:3000 |
| api | http://localhost:8080 (`/health` で疎通確認) |
| MinIO Console | http://localhost:9001 (minioadmin / minioadmin) |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

## 7. .env 設定

`.env.example` をコピーして使います。主な変数:

- `LLM_PROVIDER` … `mock`（デフォルト）/ `openai` / `anthropic`
- `OPENAI_API_KEY` / `OPENAI_MODEL` … OpenAI 利用時のみ。モデル名は実行時点で利用可能なものに差し替えてください。
- `DATABASE_URL` / `REDIS_URL` / `MINIO_*` … compose のサービス名で解決済み。

## 8. Assistant 一覧

| Assistant | 役割 | 主に学べること |
| --- | --- | --- |
| Knowledge | 文書を検索し根拠付きで回答 | RAG / 根拠付き回答 / 回答不能判定 |
| Action | 操作案を作り承認後に実行 | Tool Calling / 承認 / 監査ログ |
| Report | データを集計しレポート生成 | Worker / 集計 / ファイル生成 |
| Scoring | レコードにスコアを付け候補提示 | Structured Output / Ranking / Feedback |
| Router | 依頼を分類し適切な Assistant へ振り分け | Intent 分類 / Orchestration |

## 9. 学習カリキュラム

`docs/curriculum/` に Phase ごとの教材を置いています。

1. Chat UI → 2. Tool Calling → 3. RAG → 4. Human Approval → 5. Worker/Queue → 6. File Generation → 7. Eval/Guardrails → 8. Router Assistant

## 10. LLM Provider 切替

```bash
LLM_PROVIDER=mock       # API キー不要。デフォルト。
LLM_PROVIDER=openai     # OPENAI_API_KEY が必要。
LLM_PROVIDER=anthropic  # 本実装は後続フェーズ。
```

切替は `.env` の `LLM_PROVIDER` を変えて `docker compose up` するだけ。Assistant / Tool 側のコードは変更不要です。

## 11. Mock Mode

`LLM_PROVIDER=mock` では API キーなしで動作します。`taskName` ごとに固定応答を返すため、**研修環境や CI で外部 API 課金なしに動かせます**。

## 12. 実装フェーズ

| Phase | 内容 | 状態 |
| --- | --- | --- |
| 0 | Repository 初期化 / Docker / 雛形 | ✅ 実装済み |
| 1 | DB / Seed / records・documents API | ✅ 実装済み |
| 2 | LLM Gateway (mock + openai 骨組み) | ✅ 実装済み |
| 3 | Chat UI ⇔ /api/chat (mock 応答) | ✅ 実装済み |
| 4–10 | Tool Calling / RAG / Approval / Worker / Scoring / Router / Eval | 予定 |

進捗は各 Phase 完了時に更新します。コミット履歴を時系列で追うと、Phase 0 から順に何をどう作ったかが分かるようにしています。

## 13. コントリビュートルール

- **業界固有語を使わない**（`docs/` やサンプルデータ・コミットメッセージにも適用）。
- **危険操作は LLM に直接させない**。書き込み/送信/設定変更は必ず Approval を通す。
- **すべての AI 関連操作を Audit Log に残す**。
- **コミットは「1 コミット = 1 理解単位」**。メッセージ本文に「なぜ」を書く。
- 業務差分は Tool / Context Builder に閉じ込め、Agent Core は汎用に保つ。
