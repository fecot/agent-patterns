# 01. Chat UI

## ゴール
ブラウザから Assistant を選んで質問し、mock 応答が表示される（Phase 0–3）。

## 学ぶこと
- monorepo / Docker Compose によるローカル開発環境
- Fastify API ⇔ React(Vite) の最小構成
- LLM Gateway 経由の mock 応答
- 会話保存と Audit Log の最初の一歩

## 手を動かす
```bash
cp .env.example .env && docker compose up --build
open http://localhost:3000
```

関連: `docs/blog/devlog/00-phase0.md`〜`03-phase3.md`
