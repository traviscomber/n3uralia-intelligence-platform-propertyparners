-- Delivery log for automatic report sending via email and WhatsApp Web
CREATE TABLE IF NOT EXISTS report_deliveries (
  id BIGSERIAL PRIMARY KEY,
  report_type VARCHAR(50) NOT NULL,
  report_id BIGINT,
  channel VARCHAR(50) NOT NULL,
  recipient VARCHAR(255),
  delivery_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  subject TEXT,
  message TEXT,
  provider_response JSONB,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_deliveries_created_at
  ON report_deliveries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_deliveries_report_type
  ON report_deliveries(report_type, created_at DESC);

ALTER TABLE report_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_deliveries_read_all" ON report_deliveries
  FOR SELECT
  USING (true);

CREATE POLICY "report_deliveries_insert_auth" ON report_deliveries
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
