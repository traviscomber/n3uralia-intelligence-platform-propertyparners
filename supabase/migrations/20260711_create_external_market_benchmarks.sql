-- External market benchmark snapshots for market intelligence
CREATE TABLE IF NOT EXISTS external_market_benchmarks (
  id BIGSERIAL PRIMARY KEY,
  source VARCHAR(100) NOT NULL,
  source_url TEXT NOT NULL,
  neighborhood VARCHAR(200) NOT NULL,
  listing_title TEXT,
  offer_count INTEGER NOT NULL DEFAULT 0,
  low_price_clp NUMERIC(15, 2),
  high_price_clp NUMERIC(15, 2),
  price_currency VARCHAR(10),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_external_market_benchmarks_source_recorded_at
  ON external_market_benchmarks(source, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_external_market_benchmarks_neighborhood
  ON external_market_benchmarks(neighborhood, recorded_at DESC);

ALTER TABLE external_market_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "external_market_benchmarks_read_all" ON external_market_benchmarks
  FOR SELECT
  USING (true);

CREATE POLICY "external_market_benchmarks_insert_auth" ON external_market_benchmarks
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
