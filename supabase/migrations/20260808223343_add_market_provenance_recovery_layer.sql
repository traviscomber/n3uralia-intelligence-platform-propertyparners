create table if not exists private.market_provenance_recoveries (
  id uuid primary key default gen_random_uuid(),
  raw_record_id bigint not null references public.market_raw_records(id) on delete restrict,
  recovered_source text not null,
  recovered_source_listing_id text,
  recovered_source_url text,
  method text not null check (method in ('internal_reconciliation','external_web_verification','manual_verification')),
  status text not null default 'candidate' check (status in ('candidate','verified','rejected')),
  confidence numeric(5,4) not null check (confidence >= 0 and confidence <= 1),
  evidence jsonb not null default '[]'::jsonb,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  constraint market_provenance_recoveries_verified_requires_review check (
    status <> 'verified' or reviewed_at is not null
  )
);

create unique index if not exists market_provenance_recoveries_one_verified_per_raw
  on private.market_provenance_recoveries(raw_record_id)
  where status = 'verified';

create index if not exists market_provenance_recoveries_raw_record_idx
  on private.market_provenance_recoveries(raw_record_id, status);

revoke all on private.market_provenance_recoveries from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update on private.market_provenance_recoveries to service_role;

create or replace view private.market_listing_lineage_effective_v1
with (security_invoker = true)
as
select
  l.*,
  r.id as recovery_id,
  r.status as recovery_status,
  r.method as recovery_method,
  r.confidence as recovery_confidence,
  r.evidence as recovery_evidence,
  r.reviewed_at as recovery_reviewed_at,
  coalesce(l.upstream_source, r.recovered_source) as effective_upstream_source,
  coalesce(l.upstream_source_listing_id, r.recovered_source_listing_id) as effective_upstream_source_listing_id,
  coalesce(l.upstream_source_url, r.recovered_source_url) as effective_upstream_source_url,
  case
    when l.provenance_status <> 'legacy_bridge_only' then 'raw'
    when r.id is not null then 'recovered'
    else 'unresolved'
  end as effective_provenance_origin,
  case
    when l.provenance_status <> 'legacy_bridge_only' then l.provenance_status
    when r.id is not null and r.recovered_source_listing_id is not null and r.recovered_source_url is not null then 'recovered_source_id_and_url'
    when r.id is not null and r.recovered_source_listing_id is not null then 'recovered_source_id_only'
    when r.id is not null and r.recovered_source_url is not null then 'recovered_source_url_only'
    else 'legacy_bridge_only'
  end as effective_provenance_status
from private.market_listing_lineage_v1 l
left join private.market_provenance_recoveries r
  on r.raw_record_id = l.raw_record_id
 and r.status = 'verified';

revoke all on private.market_listing_lineage_effective_v1 from public, anon, authenticated;
grant select on private.market_listing_lineage_effective_v1 to service_role;

comment on table private.market_provenance_recoveries is 'Auditable recovery evidence for missing upstream provenance. Raw ingestion evidence remains immutable; only verified recoveries are projected into effective lineage.';
comment on view private.market_listing_lineage_effective_v1 is 'Effective lineage preserving raw provenance while layering only verified provenance recoveries.';
