# 03. RAG

## ゴール
Knowledge Assistant が文書根拠付きで回答できる（Phase 5）。

## 学ぶこと
- Markdown の chunk 分割 / embedding 生成
- pgvector への保存 / 類似検索
- contextBuilder / source 付き回答 / 回答不能判定

## 手を動かす
- `data/seed/documents/*.md` を index 化し、質問に対し根拠を提示する。
