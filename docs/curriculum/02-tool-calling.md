# 02. Tool Calling

## ゴール
ユーザー質問に応じて DB 検索 Tool が呼ばれ、結果を踏まえた回答が返る（Phase 4）。

## 学ぶこと
- Tool interface / Tool Registry
- LLM が tool call を返す → API 側で実行 → 結果を LLM に再入力
- riskLevel と承認要否の入口

## 手を動かす
- `searchRecordsTool` / `searchDocumentsTool` を実装し、Assistant から呼ぶ。
