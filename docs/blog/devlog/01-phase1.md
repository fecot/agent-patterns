# Phase 1 開発ログ — DB / Seed

## 何を作ったか
- §17 の全テーブルを生 SQL マイグレーション（`0001_init.sql`）で定義
- `schema_migrations` で適用済みを管理する自前マイグレーションランナー
- `data/seed`（documents 6本 / records CSV 15行 / cases / contacts / usage_logs）の汎用サンプルデータ
- それを投入する idempotent な seed ランナー
- `GET /api/records` と `GET /api/documents`（+ `/:id`）

## なぜこの設計にしたか
- **生 SQL マイグレーション**: 学習者がスキーマを直接読めることを優先。ORM の抽象を挟まない。
- **固定 Workspace/User ID**: web の `WORKSPACE_ID` と seed を一致させ、UI から即データが見えるように。
- **seed は TRUNCATE → 再投入**: 何度流しても同じ状態になり、研修中の試行錯誤に強い。
- **pgvector は最初の migration で有効化**: Phase 5 の RAG でそのまま使える。

## ハマったポイント / トレードオフ
- **CSV パーサは最小実装**: サンプルデータがカンマを含まない前提のナイーブな split。実データを足すならクォート対応が必要、という割り切り。
- **path 解決**: seed/migrate は `import.meta.url` から `data/seed` を相対解決し、ローカル実行と Docker（`/app/data` マウント）の両方で動くようにした。
- **マウント運用**: `src` と `data` を bind mount しているため、ルート追加後にイメージ再ビルド不要で tsx watch が反映。

## 試せるコマンド
```bash
docker compose exec api pnpm db:migrate
docker compose exec api pnpm db:seed
curl http://localhost:8080/api/records    # => records 15 件
curl http://localhost:8080/api/documents  # => documents 6 件
```

## 関連コミット（件名）
- feat(api): 生 SQL マイグレーションと DB client を追加
- feat(api): 汎用サンプルデータと seed ランナーを追加
- feat(api): records / documents 参照 API を追加
