# LLM Gateway

上位の Assistant が OpenAI / Anthropic / Mock の違いを意識しないようにするための抽象（本実装は Phase 2）。

- インターフェース: `generate<T>(options): Promise<GenerateResult<T>>`
- Provider: `openaiProvider` / `anthropicProvider` / `mockProvider`
- Usage（トークン・コスト）を取得して Audit Log に保存する

設計の詳細は引き継ぎドキュメント §8 を参照。型は `apps/api/src/llm/types.ts`（Phase 2 で追加）。
