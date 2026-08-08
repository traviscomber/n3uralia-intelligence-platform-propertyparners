create or replace view private.market_identity_quality_v1
with (security_invoker = true)
as
with base as (
  select
    l.raw_record_id,
    l.listing_id,
    l.property_id,
    l.property_identity_status,
    l.property_identity_confidence,
    l.provenance_status,
    l.upstream_source,
    l.upstream_source_listing_id,
    l.upstream_source_url,
    l.observed_at,
    mp.normalized_address,
    case
      when l.upstream_source_listing_id is not null then upper(l.upstream_source_listing_id)
      when l.upstream_source_url is not null and upper(l.upstream_source_url) ~ 'MLC-[0-9]+'
        then (regexp_match(upper(l.upstream_source_url), '(MLC-[0-9]+)'))[1]
      else null
    end as effective_external_listing_id,
    case
      when l.upstream_source_listing_id is not null then 'source_field'
      when l.upstream_source_url is not null and upper(l.upstream_source_url) ~ 'MLC-[0-9]+' then 'derived_from_url'
      else 'unavailable'
    end as external_id_origin
  from private.market_listing_lineage_v1 l
  left join public.market_properties mp on mp.id = l.property_id
), scored as (
  select
    base.*,
    case when effective_external_listing_id is null then 0
         else count(*) over (partition by effective_external_listing_id) end as external_id_occurrences,
    case when normalized_address is null or btrim(normalized_address) = '' then 0
         else count(*) over (partition by normalized_address) end as normalized_address_occurrences
  from base
)
select
  scored.*,
  case
    when external_id_occurrences > 1 then 'high'
    when provenance_status = 'legacy_bridge_only' then 'high'
    when normalized_address_occurrences > 1 then 'medium'
    when external_id_origin = 'derived_from_url' then 'medium'
    else 'low'
  end as review_priority,
  array_remove(array[
    case when external_id_occurrences > 1 then 'external_listing_id_collision' end,
    case when provenance_status = 'legacy_bridge_only' then 'missing_upstream_provenance' end,
    case when normalized_address_occurrences > 1 then 'shared_normalized_address' end,
    case when external_id_origin = 'derived_from_url' then 'external_id_derived_from_url' end
  ], null) as review_reasons,
  case
    when external_id_occurrences > 1 or provenance_status = 'legacy_bridge_only' then true
    else false
  end as requires_identity_review
from scored;

revoke all on private.market_identity_quality_v1 from public, anon, authenticated;
grant usage on schema private to service_role;
grant select on private.market_identity_quality_v1 to service_role;

comment on view private.market_identity_quality_v1 is 'Server-only deterministic identity review signals. Flags evidence conflicts without merging, correcting or confirming property identities.';
