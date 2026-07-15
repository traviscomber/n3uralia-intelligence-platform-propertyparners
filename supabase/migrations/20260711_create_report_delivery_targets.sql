-- Delivery targets for automatic weekly reports
CREATE TABLE IF NOT EXISTS report_delivery_targets (
  id BIGSERIAL PRIMARY KEY,
  label VARCHAR(150) NOT NULL,
  channel VARCHAR(50) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  notify_weekly BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_delivery_targets_active
  ON report_delivery_targets(active, notify_weekly, created_at DESC);

ALTER TABLE report_delivery_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_delivery_targets_read_all" ON report_delivery_targets
  FOR SELECT
  USING (true);

CREATE POLICY "report_delivery_targets_insert_auth" ON report_delivery_targets
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "report_delivery_targets_update_auth" ON report_delivery_targets
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "report_delivery_targets_delete_auth" ON report_delivery_targets
  FOR DELETE
  USING (auth.role() = 'authenticated');

