-- Administrative report directory. This does not modify audited source datasets.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS report_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  person_role TEXT NOT NULL CHECK (person_role IN ('ceo', 'director', 'executive')),
  source_key TEXT,
  origin TEXT NOT NULL DEFAULT 'administrative' CHECK (origin IN ('administrative', 'source_candidate')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS report_people_source_key_unique ON report_people(source_key) WHERE source_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS report_people_role_active_idx ON report_people(person_role, active, full_name);

CREATE TABLE IF NOT EXISTS report_branch_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES report_people(id) ON DELETE RESTRICT,
  branch_name TEXT NOT NULL,
  assignment_role TEXT NOT NULL CHECK (assignment_role IN ('director', 'executive')),
  origin TEXT NOT NULL DEFAULT 'administrative' CHECK (origin IN ('administrative', 'source_confirmed')),
  valid_from DATE,
  valid_to DATE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS report_branch_assignments_lookup_idx ON report_branch_assignments(branch_name, assignment_role, active);

CREATE TABLE IF NOT EXISTS report_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES report_people(id) ON DELETE RESTRICT,
  audience TEXT NOT NULL CHECK (audience IN ('ceo', 'director-cuenta', 'ejecutivo')),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp_web', 'webhook')),
  recipient TEXT NOT NULL,
  cadence TEXT NOT NULL DEFAULT 'weekly' CHECK (cadence IN ('weekly', 'monthly', 'manual')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS report_subscriptions_lookup_idx ON report_subscriptions(person_id, audience, active);

CREATE TABLE IF NOT EXISTS report_directory_audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_state JSONB,
  after_state JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS report_directory_audit_log_created_idx ON report_directory_audit_log(created_at DESC);

CREATE OR REPLACE FUNCTION report_directory_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS report_people_updated_at ON report_people;
CREATE TRIGGER report_people_updated_at BEFORE UPDATE ON report_people FOR EACH ROW EXECUTE FUNCTION report_directory_set_updated_at();
DROP TRIGGER IF EXISTS report_branch_assignments_updated_at ON report_branch_assignments;
CREATE TRIGGER report_branch_assignments_updated_at BEFORE UPDATE ON report_branch_assignments FOR EACH ROW EXECUTE FUNCTION report_directory_set_updated_at();
DROP TRIGGER IF EXISTS report_subscriptions_updated_at ON report_subscriptions;
CREATE TRIGGER report_subscriptions_updated_at BEFORE UPDATE ON report_subscriptions FOR EACH ROW EXECUTE FUNCTION report_directory_set_updated_at();

ALTER TABLE report_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_branch_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_directory_audit_log ENABLE ROW LEVEL SECURITY;

-- Access is intentionally service-role only through authenticated CEO/admin APIs.
REVOKE ALL ON report_people, report_branch_assignments, report_subscriptions, report_directory_audit_log FROM anon, authenticated;
