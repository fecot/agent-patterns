-- Phase 7: 非同期レポート Job の集計結果を保持する列を追加 (引き継ぎドキュメント §13.4)。
-- Worker が集計した内容を JSON で保存し、Phase 8 でこれを元に docx を生成する。
ALTER TABLE report_jobs ADD COLUMN IF NOT EXISTS result_json JSONB;
