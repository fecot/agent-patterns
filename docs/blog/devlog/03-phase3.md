# Phase 3 開発ログ — Chat UI ⇔ /api/chat

> このファイルは Phase 3 実装時に埋める。

## 何を作ったか
-

## なぜこの設計にしたか
- 会話保存と Audit Log を最初から通す理由（ドキュメント §11, §26.3）

## ハマったポイント / トレードオフ
-

## 試せるコマンド
```bash
# ブラウザから質問 → mock 応答を確認
curl -X POST http://localhost:8080/api/chat \
  -H 'content-type: application/json' \
  -d '{"message":"こんにちは","assistant":"auto","workspaceId":"00000000-0000-0000-0000-000000000001"}'
```

## 関連コミット（件名）
-
