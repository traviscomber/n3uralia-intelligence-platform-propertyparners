-- Preserve imported market provenance without rewriting historical rows.
ALTER TABLE public.market_data
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_market_data_neighborhood
  ON public.market_data(neighborhood);

ALTER TABLE public.neighborhood_market_data
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ;

-- The legacy score is retained only as historical evidence. Runtime code no
-- longer reads or writes it because its weighting is not source-backed.
COMMENT ON COLUMN public.neighborhood_market_data.opportunity_score IS
  'Deprecated on 2026-07-22: retained as historical evidence; not used by runtime or reporting.';
