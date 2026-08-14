create or replace view private.market_identity_quality_effective_v1
with (security_invoker = true)
as
with base as (
  select
    l.raw_record_id,
    l.listing_id,
    l.property_id,
    l.property_identity_status,
    l.property_identity_confidence,
    l.provenance_status as raw_provenance_status,
    l.effective_provenance_status as provenance_status,
    l.effective_provenance_origin as provenance_origin,
    l.recovery_id,
    l.recovery_method,
    l.recovery_confidence,
    l.effective_upstream_source as upstream_source,
    l.effective_upstream_source_listing_id as upstream_source_listing_id,
    l.effective_upstream_source_url as upstream_source_url,
    l.observed_at,
    mp.normalized_address,
    mp.property_type,
    mp.useful_area_m2,
    mp.built_area_m2,
    mp.land_area_m2,
    mp.bedrooms,
    mp.bathrooms,
    mp.parking_spaces,
    ml.price_uf,
    case
      when l.effective_upstream_source_listing_id is not null then upper(l.effective_upstream_source_listing_id)
      when l.effective_upstream_source_url is not null and upper(l.effective_upstream_source_url) ~ 'MLC-[0-9]+'
        then (regexp_match(upper(l.effective_upstream_source_url), '(MLC-[0-9]+)'))[1]
      else null
    end as effective_external_listing_id,
    case
      when l.effective_upstream_source_listing_id is not null then 'source_field'
      when l.effective_upstream_source_url is not null and upper(l.effective_upstream_source_url) ~ 'MLC-[0-9]+' then 'derived_from_url'
      else 'unavailable'
    end as external_id_origin,
    concat_ws('|',
      regexp_replace(lower(coalesce(mp.normalized_address,'')), '[^[:alnum:]]+', '', 'g'),
      coalesce(mp.property_type,''),
      coalesce(mp.useful_area_m2::text,''), coalesce(mp.built_area_m2::text,''),
      coalesce(mp.land_area_m2::text,''), coalesce(mp.bedrooms::text,''),
      coalesce(mp.bathrooms::text,''), coalesce(mp.parking_spaces::text,''),
      coalesce(ml.price_uf::text,'')
    ) as listing_signature
  from private.market_listing_lineage_effective_v1 l
  left join public.market_properties mp on mp.id = l.property_id
  left join public.market_listings ml on ml.id = l.listing_id
), external_stats as (
  select effective_external_listing_id,
         count(*)::bigint as external_id_occurrences,
         count(distinct listing_signature)::bigint as signature_variants
  from base
  where effective_external_listing_id is not null
  group by effective_external_listing_id
), address_stats as (
  select normalized_address,count(*)::bigint as normalized_address_occurrences
  from base
  where normalized_address is not null and btrim(normalized_address) <> ''
  group by normalized_address
), scored as (
  select
    b.raw_record_id,b.listing_id,b.property_id,b.property_identity_status,b.property_identity_confidence,
    b.raw_provenance_status,b.provenance_status,b.provenance_origin,b.recovery_id,b.recovery_method,b.recovery_confidence,
    b.upstream_source,b.upstream_source_listing_id,b.upstream_source_url,b.observed_at,
    b.normalized_address,b.effective_external_listing_id,b.external_id_origin,
    coalesce(es.external_id_occurrences,0) as external_id_occurrences,
    coalesce(a.normalized_address_occurrences,0) as normalized_address_occurrences,
    coalesce(es.signature_variants,0) as external_id_signature_variants
  from base b
  left join external_stats es using (effective_external_listing_id)
  left join address_stats a using (normalized_address)
)
select
  scored.raw_record_id,
  scored.listing_id,
  scored.property_id,
  scored.property_identity_status,
  scored.property_identity_confidence,
  scored.raw_provenance_status,
  scored.provenance_status,
  scored.provenance_origin,
  scored.recovery_id,
  scored.recovery_method,
  scored.recovery_confidence,
  scored.upstream_source,
  scored.upstream_source_listing_id,
  scored.upstream_source_url,
  scored.observed_at,
  scored.normalized_address,
  scored.effective_external_listing_id,
  scored.external_id_origin,
  scored.external_id_occurrences,
  scored.normalized_address_occurrences,
  case
    when scored.external_id_occurrences > 1 then 'high'
    when scored.provenance_status = 'legacy_bridge_only' then 'high'
    when scored.normalized_address_occurrences > 1 then 'medium'
    when scored.external_id_origin = 'derived_from_url' then 'medium'
    else 'low'
  end as review_priority,
  array_remove(array[
    case when scored.external_id_occurrences > 1 then 'external_listing_id_collision' end,
    case when scored.provenance_status = 'legacy_bridge_only' then 'missing_upstream_provenance' end,
    case when scored.normalized_address_occurrences > 1 then 'shared_normalized_address' end,
    case when scored.external_id_origin = 'derived_from_url' then 'external_id_derived_from_url' end
  ], null) as review_reasons,
  case
    when scored.external_id_occurrences > 1 or scored.provenance_status = 'legacy_bridge_only' then true
    else false
  end as requires_identity_review,
  scored.external_id_signature_variants,
  case
    when scored.external_id_occurrences > 1 and scored.external_id_signature_variants = 1 then 'probable_duplicate_listing'
    when scored.external_id_occurrences > 1 and scored.external_id_signature_variants > 1 then 'conflicting_external_identity'
    when scored.provenance_status = 'legacy_bridge_only' then 'unverifiable_upstream_source'
    when scored.external_id_origin = 'derived_from_url' then 'derived_external_identity'
    when scored.normalized_address_occurrences > 1 then 'shared_address_only'
    else 'no_material_identity_signal'
  end as identity_signal_class,
  false as automatic_merge_allowed
from scored;

revoke all on private.market_identity_quality_effective_v1 from public, anon, authenticated;
grant select on private.market_identity_quality_effective_v1 to service_role;

comment on view private.market_identity_quality_effective_v1 is 'Identity quality projection using original upstream provenance when available and only verified provenance recovery otherwise; identity signatures normalize address punctuation before duplicate classification.';
