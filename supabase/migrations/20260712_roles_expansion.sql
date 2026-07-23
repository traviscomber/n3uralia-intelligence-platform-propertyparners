-- Historical schema-only migration.
-- No people, activities or KPI records are seeded: operational data must come
-- from authenticated CRUD or the immutable audited source pipeline.

ALTER TABLE public.kpi_snapshots
  ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_agent_id
  ON public.kpi_snapshots(agent_id);

CREATE TABLE IF NOT EXISTS public.agent_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('llamada', 'visita', 'oferta', 'cierre')),
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  description TEXT,
  value_uf NUMERIC(12, 2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'lost')),
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_activities_agent_id
  ON public.agent_activities(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_activities_status
  ON public.agent_activities(status);
CREATE INDEX IF NOT EXISTS idx_agent_activities_scheduled
  ON public.agent_activities(scheduled_at);

ALTER TABLE public.agent_activities ENABLE ROW LEVEL SECURITY;

-- Access is intentionally delegated to the server-side service role.
DROP POLICY IF EXISTS "agent_activities_service_all" ON public.agent_activities;
REVOKE ALL ON TABLE public.agent_activities FROM anon, authenticated;
