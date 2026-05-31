# Phase 0 開発ログ — Repository 初期化

## 何を作ったか
- pnpm workspaces による monorepo（`apps/web`・`apps/api`・`apps/worker`・`packages/shared`）
- `docker compose up --build` で 6 サービス（web/api/worker/postgres/redis/minio）が起動する構成
- Fastify の `/health` 骨格、Vite+React の Chat UI 雛形、BullMQ Worker の接続確認スタブ
- `@lab/shared` に Zod スキーマ・共有型の雛形

## なぜこの設計にしたか
- **monorepo + pnpm workspaces**: API/Worker/Web で型とスキーマ（`@lab/shared`）を共有するため。`packages/shared` の `exports` を `src/index.ts` に向け、dev では tsx/Vite が TS をそのまま解決できるようにした。
- **postgres は pgvector 入りイメージ**: RAG（Phase 5）で `VECTOR` 型を使うため、最初から拡張を有効化できるイメージを選定。
- **LLM_PROVIDER=mock をデフォルト**: API キーなしで研修・CI を回せるようにする方針（ドキュメント §5.1, §8.3）。
- **env を zod で起動時検証**: 環境変数の不備を後段のバグではなく起動時のエラーで気づけるように。

## ハマったポイント / トレードオフ
- **bind mount と pnpm の symlink**: workspace 全体をマウントすると pnpm の `node_modules` symlink 構造を壊しがち。対策として「イメージ内で `pnpm install` し、実行時は `src` ディレクトリだけを bind mount」する構成にした。これで hot reload を維持しつつ依存解決を壊さない。
- **生 SQL マイグレーション採用**: ORM を使わず生 SQL にした（Phase 1）。学習目的でスキーマを直接読ませたいため。型安全性は別途 `@lab/shared` で補う。
- **Docker は node:22 LTS 固定**: ローカルは Node 26 だが、コンテナ内は安定版に固定して再現性を確保。

## 試せるコマンド
```bash
cp .env.example .env
docker compose up --build
# 別ターミナルで
curl http://localhost:8080/health      # => {"status":"ok","llmProvider":"mock"}
open http://localhost:3000             # Chat UI が表示される
```

## 関連コミット（件名）
- chore: pnpm workspace のルート設定を用意
- feat(shared): Zod スキーマと共有型の雛形を追加
- feat(api): Fastify サーバ骨格と env 検証を追加
- feat(web): Vite + React の Chat UI 雛形を追加
- feat(worker): BullMQ Worker の接続確認スタブを追加
- feat(docker): compose に 6 サービスと .env.example を定義
