CREATE TABLE IF NOT EXISTS pp_ai_learning_snapshots (
  id BIGSERIAL PRIMARY KEY,
  report_key VARCHAR(200) NOT NULL UNIQUE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_feedback INTEGER NOT NULL DEFAULT 0,
  useful_count INTEGER NOT NULL DEFAULT 0,
  ignored_count INTEGER NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  adoption_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  summary TEXT NOT NULL DEFAULT '',
  top_recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  audience_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  neighborhood_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pp_ai_learning_snapshots_week_start
  ON pp_ai_learning_snapshots(week_start DESC);

CREATE INDEX IF NOT EXISTS idx_pp_ai_learning_snapshots_generated_at
  ON pp_ai_learning_snapshots(generated_at DESC);

ALTER TABLE pp_ai_learning_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pp_ai_learning_snapshots_read_all ON pp_ai_learning_snapshots;
CREATE POLICY pp_ai_learning_snapshots_read_all ON pp_ai_learning_snapshots
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS pp_ai_learning_snapshots_insert_auth ON pp_ai_learning_snapshots;
CREATE POLICY pp_ai_learning_snapshots_insert_auth ON pp_ai_learning_snapshots
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
