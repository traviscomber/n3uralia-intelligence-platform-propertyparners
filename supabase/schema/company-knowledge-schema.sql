-- N3uralia Company Knowledge Layer
-- Stores documents, extracted knowledge and company memory

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  source text,
  storage_path text,
  created_at timestamptz default now()
);

create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id),
  content text,
  embedding vector(1536),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  source_name text,
  source_type text,
  reliability numeric,
  created_at timestamptz default now()
);

create table if not exists company_memories (
  id uuid primary key default gen_random_uuid(),
  category text,
  content text,
  source_id uuid references knowledge_sources(id),
  confidence numeric,
  created_at timestamptz default now()
);

create table if not exists decision_history (
  id uuid primary key default gen_random_uuid(),
  decision text,
  context text,
  outcome text,
  lessons text,
  created_at timestamptz default now()
);

create table if not exists evidence_links (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id),
  json_source text,
  evidence text,
  confidence numeric,
  created_at timestamptz default now()
);
