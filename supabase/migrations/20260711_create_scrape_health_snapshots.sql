-- Persistent health snapshots for scraper and source anomalies
CREATE TABLE IF NOT EXISTS scrape_health_snapshots (
  id BIGSERIAL PRIMARY KEY,
  status VARCHAR(20) NOT NULL DEFAULT 'healthy',
  summary JSONB NOT NULL,
  latest_run JSONB,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  benchmark JSONB,
  issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  runs_window JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scrape_health_snapshots_generated_at
  ON scrape_health_snapshots(generated_at DESC);

ALTER TABLE scrape_health_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scrape_health_snapshots_read_all" ON scrape_health_snapshots
  FOR SELECT
  USING (true);

CREATE POLICY "scrape_health_snapshots_insert_auth" ON scrape_health_snapshots
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
