# 06. File Generation

## ゴール
Worker が docx を生成し、MinIO に保存してダウンロードできる（Phase 7）。

## 学ぶこと
- docx 生成
- MinIO(S3 互換) への保存 / ダウンロード URL 発行
- ファイル命名規約: `reports/{workspaceId}/{jobId}.docx`
