-- Market data table ready for CSV/XLS import pipelines
-- Keeps the schema aligned with the existing Market Intelligence dashboard.

CREATE TABLE IF NOT EXISTS market_data (
  neighborhood VARCHAR(200) PRIMARY KEY,
  avg_price_uf NUMERIC(15, 2),
  avg_price_m2_uf NUMERIC(15, 2),
  absorption_rate NUMERIC(6, 4),
  inventory_count INTEGER NOT NULL DEFAULT 0,
  avg_days_on_market NUMERIC(8, 2),
  source VARCHAR(100) NOT NULL DEFAULT 'market_data',
  source_url TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE market_data
  ADD COLUMN IF NOT EXISTS avg_price_uf NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS avg_price_m2_uf NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS absorption_rate NUMERIC(6, 4),
  ADD COLUMN IF NOT EXISTS inventory_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_days_on_market NUMERIC(8, 2),
  ADD COLUMN IF NOT EXISTS source VARCHAR(100) NOT NULL DEFAULT 'market_data',
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_market_data_neighborhood
  ON market_data(neighborhood);

ALTER TABLE market_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS market_data_read_all ON market_data;
CREATE POLICY market_data_read_all ON market_data
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS market_data_insert_auth ON market_data;
CREATE POLICY market_data_insert_auth ON market_data
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS market_data_update_auth ON market_data;
CREATE POLICY market_data_update_auth ON market_data
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
