-- Phase 6: Human Approval のシナリオ用テーブル (引き継ぎドキュメント §10, §16)。
-- B シナリオ: 承認が「実際に効く」題材として、通知先マスタ・設定・承認ルールと、
-- 承認後の副作用先（通知・設定変更）を用意する。

-- ── B シナリオ参照データ ──────────────────────────────────

-- 通知先マスタ。createNotificationDraft の宛先候補。
CREATE TABLE IF NOT EXISTS notification_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  channel TEXT NOT NULL,            -- email / chat
  address TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ワークスペース設定。updateSettingDraft の対象であり現在値の参照元。
CREATE TABLE IF NOT EXISTS settings (
  workspace_id UUID NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, key)
);

-- 承認ルール。Tool ごとに承認要否をデータで制御する（high は既定で必須）。
CREATE TABLE IF NOT EXISTS approval_rules (
  workspace_id UUID NOT NULL,
  tool_name TEXT NOT NULL,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (workspace_id, tool_name)
);

-- ── 承認後の副作用先 ──────────────────────────────────────

-- 送信済み通知（createNotificationDraft が承認・実行された結果）。
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  target_name TEXT NOT NULL,
  channel TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  approval_id UUID,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
