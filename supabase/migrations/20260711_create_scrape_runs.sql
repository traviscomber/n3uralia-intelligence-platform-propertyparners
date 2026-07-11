-- Persistent audit trail for scraper executions
CREATE TABLE IF NOT EXISTS scrape_runs (
  id BIGSERIAL PRIMARY KEY,
  source VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'success',
  scraped_count INTEGER NOT NULL DEFAULT 0,
  inserted_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  source_breakdown JSONB,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scrape_runs_created_at ON scrape_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_runs_source ON scrape_runs(source, created_at DESC);

ALTER TABLE scrape_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scrape_runs_read_all" ON scrape_runs
  FOR SELECT
  USING (true);

CREATE POLICY "scrape_runs_insert_auth" ON scrape_runs
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
