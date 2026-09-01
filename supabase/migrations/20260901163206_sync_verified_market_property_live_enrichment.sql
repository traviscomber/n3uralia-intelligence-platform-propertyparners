create or replace function private.sync_verified_market_property_live_enrichment_v1()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog', 'public', 'private'
as $$
declare
  v_property_type text;
  v_dataset_kind text;
  v_built_area numeric;
  v_parking integer;
begin
  if new.property_id is null or new.status not in ('active','observed') then
    return new;
  end if;

  select mp.property_type,
         coalesce(nullif(ms.metadata ->> 'dataset_kind',''), case mp.property_type when 'Casa' then 'portal_houses' else 'unknown' end)
    into v_property_type, v_dataset_kind
  from public.market_properties mp
  join public.market_sources ms on ms.id = new.source_id
  where mp.id = new.property_id
  limit 1;

  if v_property_type is distinct from 'Casa' or v_dataset_kind is distinct from 'portal_houses' then
    return new;
  end if;

  if nullif(new.raw_payload ->> 'built_area_m2','') ~ '^[0-9]+([.][0-9]+)?$' then
    v_built_area := (new.raw_payload ->> 'built_area_m2')::numeric;
  end if;
  if nullif(new.raw_payload ->> 'parking_spaces','') ~ '^[0-9]+$' then
    v_parking := (new.raw_payload ->> 'parking_spaces')::integer;
  end if;

  update public.market_properties mp
  set last_seen_at = case
        when mp.last_seen_at is null then new.observed_at
        else greatest(mp.last_seen_at, new.observed_at)
      end,
      built_area_m2 = coalesce(mp.built_area_m2, case when v_built_area > 0 then v_built_area end),
      parking_spaces = coalesce(mp.parking_spaces, case when v_parking >= 0 then v_parking end),
      identity_evidence = coalesce(mp.identity_evidence,'{}'::jsonb) || jsonb_build_object(
        'live_enrichment_v1', jsonb_build_object(
          'source_listing_id', new.source_listing_id,
          'observed_at', new.observed_at,
          'policy', 'verified_external_identity_fill_nulls_only'
        )
      )
  where mp.id = new.property_id;

  return new;
end;
$$;

revoke all on function private.sync_verified_market_property_live_enrichment_v1() from public;
revoke all on function private.sync_verified_market_property_live_enrichment_v1() from anon;
revoke all on function private.sync_verified_market_property_live_enrichment_v1() from authenticated;

drop trigger if exists market_listings_sync_verified_property_live_enrichment_v1 on public.market_listings;
create trigger market_listings_sync_verified_property_live_enrichment_v1
after insert or update of property_id, status, observed_at, raw_payload on public.market_listings
for each row
execute function private.sync_verified_market_property_live_enrichment_v1();
