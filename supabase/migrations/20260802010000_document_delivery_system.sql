-- Document Delivery System: Presentations for CEO/Directors
-- Supports weekly and monthly scheduled delivery via email

-- Document storage and metadata
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'pptx', 'xlsx', 'other')),
  file_size_bytes BIGINT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Document scheduling and delivery cadence
CREATE TABLE document_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cadence TEXT NOT NULL CHECK (cadence IN ('weekly', 'monthly')),
  day_of_week TEXT CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 28),
  send_time TIME NOT NULL DEFAULT '09:00:00',
  active BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  next_send_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT weekly_needs_day_of_week CHECK (
    (cadence = 'weekly' AND day_of_week IS NOT NULL) OR
    (cadence != 'weekly' AND day_of_week IS NULL)
  ),
  CONSTRAINT monthly_needs_day_of_month CHECK (
    (cadence = 'monthly' AND day_of_month IS NOT NULL) OR
    (cadence != 'monthly' AND day_of_month IS NULL)
  )
);

-- Role-based recipients for document delivery
CREATE TABLE document_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES document_schedules(id) ON DELETE CASCADE,
  recipient_role TEXT NOT NULL CHECK (recipient_role IN ('ceo', 'director', 'manager', 'staff')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(schedule_id, recipient_role)
);

-- Track individual document deliveries
CREATE TABLE document_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES document_schedules(id),
  recipient_email TEXT NOT NULL,
  recipient_role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'sent', 'failed', 'bounced')),
  attempt_count INTEGER DEFAULT 0,
  last_attempted_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  external_reference TEXT,
  error_message TEXT,
  next_attempt_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Audit trail for document delivery events
CREATE TABLE document_delivery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_id UUID NOT NULL REFERENCES document_distributions(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'failed', 'acknowledged', 'bounced', 'complaint')),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_delivery_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents: CEO/Directors can create and view
CREATE POLICY "documents_ceo_director_create" ON documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND copilot_role IN ('ceo', 'director')
    )
  );

CREATE POLICY "documents_ceo_director_view" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND copilot_role IN ('ceo', 'director')
    )
  );

CREATE POLICY "documents_ceo_director_update" ON documents
  FOR UPDATE USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND copilot_role IN ('ceo', 'director')
    )
  );

-- RLS Policies for document_schedules: CEO/Directors manage, recipients view if subscribed
CREATE POLICY "schedules_ceo_director_manage" ON document_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND copilot_role IN ('ceo', 'director')
    )
  );

-- RLS Policies for document_distributions: Internal only (no user access)
CREATE POLICY "distributions_internal_only" ON document_distributions
  FOR ALL USING (false);

-- RLS Policies for document_delivery_events: Internal only (no user access)
CREATE POLICY "events_internal_only" ON document_delivery_events
  FOR ALL USING (false);

-- Indexes for performance
CREATE INDEX documents_created_at_idx ON documents(created_at DESC);
CREATE INDEX document_schedules_active_next_send_idx ON document_schedules(active, next_send_at) WHERE active = true;
CREATE INDEX document_schedules_cadence_idx ON document_schedules(cadence);
CREATE INDEX document_distributions_status_next_attempt_idx ON document_distributions(status, next_attempt_at);
CREATE INDEX document_distributions_schedule_status_idx ON document_distributions(schedule_id, status);
CREATE INDEX document_delivery_events_distribution_idx ON document_delivery_events(distribution_id);

-- Trigger to update document timestamps
CREATE OR REPLACE FUNCTION update_document_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_documents_timestamp
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION update_document_timestamp();

CREATE TRIGGER update_document_schedules_timestamp
BEFORE UPDATE ON document_schedules
FOR EACH ROW
EXECUTE FUNCTION update_document_timestamp();

CREATE TRIGGER update_document_distributions_timestamp
BEFORE UPDATE ON document_distributions
FOR EACH ROW
EXECUTE FUNCTION update_document_distributions_timestamp();
