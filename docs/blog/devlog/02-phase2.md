# Phase 2 開発ログ — LLM Gateway

> このファイルは Phase 2 実装時に埋める。

## 何を作ったか
- `llm/types.ts`: `LlmGateway` インターフェース（§8.2）
- `mockProvider`: taskName ごとに決定的応答。API キー不要
- `openaiProvider`: Responses API でのテキスト生成（骨組み。tools/structured は TODO）
- `anthropicProvider`: 型だけ満たす未実装（呼ぶと明示エラー）
- `llmGateway`: `LLM_PROVIDER` で Provider を選ぶファクトリ

## なぜこの設計にしたか
- **Provider 差分を Gateway に閉じ込める**（§26.5）。Assistant/Tool は `generate()` だけを見る。
- **GenerateResult に provider を持たせた**: どの Provider が応答したかを Audit Log/デバッグで追えるように。
- **mock を決定的に**: 同じ入力で同じ出力。CI とスクリーンショットが安定する。

## ハマったポイント / トレードオフ
- **openai は骨組みに留めた**: Responses API のテキスト生成のみ実装し、Tool Calling（Phase 4）と Structured Output（Phase 8）は TODO コメントで明示。先に全部作らず、フェーズに沿って拡張する方針。
- **anthropic は throw**: 中途半端に動くより「未実装」を明確にした方が学習者が混乱しない。

## 試せるコマンド
```bash
# mock（デフォルト）
curl -X POST localhost:8080/api/chat -H 'content-type: application/json' \
  -d '{"message":"hello","assistant":"auto","workspaceId":"00000000-0000-0000-0000-000000000001"}'
# .env で LLM_PROVIDER=openai + OPENAI_API_KEY を設定し再起動すると実 LLM に切替
```

## 関連コミット（件名）
- feat(api): LLM Gateway と mock/openai/anthropic Provider を追加
