create or replace view private.market_listing_lineage_v1
with (security_invoker = true)
as
select
  r.id as raw_record_id,
  r.ingestion_run_id,
  r.dataset_kind,
  r.source_row_number,
  nullif(r.payload->>'id','') as legacy_property_id,
  l.id as listing_id,
  l.property_id,
  mp.identity_status as property_identity_status,
  mp.identity_confidence as property_identity_confidence,
  nullif(r.payload->>'source','') as upstream_source,
  nullif(r.payload->>'source_listing_id','') as upstream_source_listing_id,
  nullif(r.payload->>'source_url','') as upstream_source_url,
  l.source_listing_id as operational_listing_id,
  l.url as operational_listing_url,
  r.observed_at,
  r.ingested_at,
  case
    when l.id is null then 'unmatched'
    when l.property_id is null then 'listing_without_property'
    else 'deterministic_legacy_bridge'
  end as lineage_status,
  case
    when nullif(r.payload->>'source_listing_id','') is not null and nullif(r.payload->>'source_url','') is not null then 'source_id_and_url'
    when nullif(r.payload->>'source_listing_id','') is not null then 'source_id_only'
    when nullif(r.payload->>'source_url','') is not null then 'source_url_only'
    else 'legacy_bridge_only'
  end as provenance_status
from public.market_raw_records r
left join public.market_listings l
  on l.raw_payload->>'legacy_property_id' = r.payload->>'id'
left join public.market_properties mp
  on mp.id = l.property_id;

revoke all on private.market_listing_lineage_v1 from public, anon, authenticated;
grant usage on schema private to service_role;
grant select on private.market_listing_lineage_v1 to service_role;

comment on view private.market_listing_lineage_v1 is 'Server-only deterministic lineage from accepted legacy property raw evidence to operational listing and candidate property identity.';
