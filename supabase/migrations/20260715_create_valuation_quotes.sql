-- Persist commercial valuations and their analysis for internal tracking.

CREATE TABLE IF NOT EXISTS valuation_quotes (
  id BIGSERIAL PRIMARY KEY,
  quote_key TEXT NOT NULL UNIQUE,
  created_by UUID,
  neighborhood TEXT NOT NULL,
  area_m2 NUMERIC(10, 2) NOT NULL,
  bedrooms INTEGER NOT NULL,
  bathrooms INTEGER NOT NULL,
  age_years INTEGER NOT NULL,
  floor INTEGER NOT NULL,
  condition TEXT NOT NULL,
  has_parking BOOLEAN NOT NULL DEFAULT FALSE,
  has_storage BOOLEAN NOT NULL DEFAULT FALSE,
  has_pool BOOLEAN NOT NULL DEFAULT FALSE,
  estimated_uf NUMERIC(12, 2) NOT NULL,
  estimated_uf_m2 NUMERIC(12, 2) NOT NULL,
  estimated_clp NUMERIC(18, 0) NOT NULL,
  confidence INTEGER NOT NULL DEFAULT 0,
  comparable_source TEXT NOT NULL,
  comparable_range_uf TEXT NOT NULL,
  market_velocity INTEGER NOT NULL DEFAULT 0,
  market_absorption INTEGER NOT NULL DEFAULT 0,
  comparable_properties INTEGER NOT NULL DEFAULT 0,
  publication_price_uf NUMERIC(12, 2) NOT NULL,
  closing_price_uf NUMERIC(12, 2) NOT NULL,
  negotiation_floor_uf NUMERIC(12, 2) NOT NULL,
  analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  comparables JSONB NOT NULL DEFAULT '[]'::jsonb,
  benchmark JSONB,
  market_context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_valuation_quotes_created_at
  ON valuation_quotes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_valuation_quotes_neighborhood
  ON valuation_quotes(neighborhood, created_at DESC);

ALTER TABLE valuation_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "valuation_quotes_select_auth" ON valuation_quotes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "valuation_quotes_insert_auth" ON valuation_quotes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

