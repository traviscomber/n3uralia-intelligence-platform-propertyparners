-- Persistent weekly director and summary reports
CREATE TABLE IF NOT EXISTS weekly_reports (
  id BIGSERIAL PRIMARY KEY,
  report_key VARCHAR(200) NOT NULL UNIQUE,
  report_scope VARCHAR(50) NOT NULL DEFAULT 'weekly_directors',
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  director_id VARCHAR(100),
  sales_count INTEGER NOT NULL DEFAULT 0,
  commission_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
  conversion_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  target_progress INTEGER NOT NULL DEFAULT 0,
  velocity_change NUMERIC(8, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'behind',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weekly_reports_week_start
  ON weekly_reports(week_start DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_reports_director
  ON weekly_reports(director_id, week_start DESC);

ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weekly_reports_read_all" ON weekly_reports
  FOR SELECT
  USING (true);

CREATE POLICY "weekly_reports_insert_auth" ON weekly_reports
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "weekly_reports_update_auth" ON weekly_reports
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
