# 05. Worker / Queue

## ゴール
レポート生成を非同期 Job として実行し、status を追える（Phase 7）。

## 学ぶこと
- Redis + BullMQ による Queue
- Job 状態: queued / running / success / error / cancelled
- API が Job を作成 → Worker が処理 → 結果を保存
