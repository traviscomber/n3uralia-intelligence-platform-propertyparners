-- Historical snapshots for neighborhood market analytics
CREATE TABLE IF NOT EXISTS neighborhood_market_data (
  id BIGSERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  neighborhood VARCHAR(200) NOT NULL,
  avg_price_uf NUMERIC(15, 2),
  avg_price_m2_uf NUMERIC(15, 2),
  absorption_rate NUMERIC(6, 4),
  inventory_count INTEGER NOT NULL DEFAULT 0,
  avg_days_on_market NUMERIC(8, 2),
  data_points INTEGER NOT NULL DEFAULT 0,
  source VARCHAR(100) NOT NULL DEFAULT 'market_data',
  source_url TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_neighborhood_market_data_snapshot_neighborhood
  ON neighborhood_market_data(snapshot_date, neighborhood);

CREATE INDEX IF NOT EXISTS idx_neighborhood_market_data_neighborhood_created_at
  ON neighborhood_market_data(neighborhood, created_at DESC);

ALTER TABLE neighborhood_market_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "neighborhood_market_data_read_all" ON neighborhood_market_data
  FOR SELECT
  USING (true);

CREATE POLICY "neighborhood_market_data_insert_auth" ON neighborhood_market_data
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
