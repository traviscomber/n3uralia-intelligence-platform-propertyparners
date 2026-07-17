CREATE TABLE IF NOT EXISTS pp_recommendation_feedback (
  id BIGSERIAL PRIMARY KEY,
  recommendation_id TEXT NOT NULL,
  title TEXT NOT NULL,
  audience TEXT NOT NULL,
  neighborhood TEXT,
  area TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('useful', 'ignored', 'review')),
  responsible TEXT,
  base_score INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pp_recommendation_feedback_created_at
  ON pp_recommendation_feedback(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pp_recommendation_feedback_audience
  ON pp_recommendation_feedback(audience, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pp_recommendation_feedback_neighborhood
  ON pp_recommendation_feedback(neighborhood, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pp_recommendation_feedback_recommendation
  ON pp_recommendation_feedback(recommendation_id, created_at DESC);

ALTER TABLE pp_recommendation_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pp_recommendation_feedback_read_all ON pp_recommendation_feedback;
CREATE POLICY pp_recommendation_feedback_read_all ON pp_recommendation_feedback
  FOR SELECT USING (true);

DROP POLICY IF EXISTS pp_recommendation_feedback_insert_auth ON pp_recommendation_feedback;
CREATE POLICY pp_recommendation_feedback_insert_auth ON pp_recommendation_feedback
  FOR INSERT WITH CHECK (true);
