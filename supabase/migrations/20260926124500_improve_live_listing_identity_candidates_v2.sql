create or replace function public.refresh_market_listing_property_match_candidates_v1()
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public', 'private', 'extensions'
as $$
declare
  v_inserted integer := 0;
  v_updated integer := 0;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    if (select auth.uid()) is null or not exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and lower(coalesce(p.role,'')) in ('admin','ceo','director','subdirector')
    ) then
      raise exception 'Insufficient permissions' using errcode = '42501';
    end if;
  end if;

  with live as (
    select
      ml.id as listing_id,
      ml.source_listing_id,
      ml.title,
      ml.normalized_address,
      lower(regexp_replace(extensions.unaccent(split_part(coalesce(ml.normalized_address,''), ',', 1)),'[^a-z0-9]+','','g')) as address_key,
      case when nullif(ml.raw_payload->>'useful_area_m2','') ~ '^[0-9]+([.][0-9]+)?$' then (ml.raw_payload->>'useful_area_m2')::numeric end as live_area,
      case when nullif(ml.raw_payload->>'bedrooms','') ~ '^[0-9]+$' then (ml.raw_payload->>'bedrooms')::integer end as live_bedrooms,
      case when nullif(ml.raw_payload->>'bathrooms','') ~ '^[0-9]+$' then (ml.raw_payload->>'bathrooms')::integer end as live_bathrooms,
      case when nullif(ml.raw_payload->>'parking_spaces','') ~ '^[0-9]+$' then (ml.raw_payload->>'parking_spaces')::integer end as live_parking
    from public.market_current_listings ml
    join public.market_sources ms on ms.id = ml.source_id
    where coalesce(nullif(ms.metadata->>'dataset_kind',''),'unknown') = 'portal_houses'
      and lower(btrim(ml.operation)) in ('sale','venta')
      and ml.status in ('active','observed')
      and ml.property_id is null
      and nullif(btrim(ml.source_listing_id),'') is not null
  ), props as (
    select
      mp.id,
      mp.normalized_address,
      mp.useful_area_m2,
      mp.bedrooms,
      mp.bathrooms,
      mp.parking_spaces,
      lower(regexp_replace(extensions.unaccent(coalesce(mp.normalized_address,'')),'[^a-z0-9]+','','g')) as prop_key
    from public.market_properties mp
    where mp.property_type = 'Casa'
  ), address_candidates as (
    select
      l.listing_id,
      l.source_listing_id,
      p.id as property_id,
      l.title,
      l.normalized_address as listing_address,
      p.normalized_address as property_address,
      l.live_area,
      p.useful_area_m2,
      l.live_bedrooms,
      p.bedrooms,
      l.live_bathrooms,
      p.bathrooms,
      l.live_parking,
      p.parking_spaces,
      case
        when l.live_area is not null and p.useful_area_m2 is not null and greatest(l.live_area,p.useful_area_m2) > 0
        then abs(l.live_area-p.useful_area_m2)/greatest(l.live_area,p.useful_area_m2)
      end as area_delta
    from live l
    join props p
      on length(l.address_key) >= 8
     and p.prop_key like '%' || l.address_key || '%'
    where
      (l.live_area is null or p.useful_area_m2 is null or abs(l.live_area-p.useful_area_m2)/greatest(l.live_area,p.useful_area_m2) <= 0.15)
      and (l.live_bathrooms is null or p.bathrooms is null or abs(l.live_bathrooms-p.bathrooms) <= 1)
      and (l.live_bedrooms is null or p.bedrooms is null or abs(l.live_bedrooms-p.bedrooms) <= 1)
  ), unique_candidates as (
    select c.*
    from address_candidates c
    join (
      select listing_id, count(*) as candidate_count
      from address_candidates
      group by listing_id
      having count(*) = 1
    ) u on u.listing_id = c.listing_id
  ), scored as (
    select
      u.*,
      case
        when (u.area_delta is null or u.area_delta <= 0.08)
         and (u.live_bathrooms is null or u.bathrooms is null or u.live_bathrooms = u.bathrooms)
         and (u.live_bedrooms is null or u.bedrooms is null or u.live_bedrooms = u.bedrooms)
        then 0.94
        else 0.78
      end as match_score,
      case
        when (u.area_delta is null or u.area_delta <= 0.08)
         and (u.live_bathrooms is null or u.bathrooms is null or u.live_bathrooms = u.bathrooms)
         and (u.live_bedrooms is null or u.bedrooms is null or u.live_bedrooms = u.bedrooms)
        then 'candidate_high'
        else 'candidate_medium'
      end as match_status
    from unique_candidates u
  ), upserted as (
    insert into public.market_property_matches(
      left_entity_type,left_entity_id,right_entity_type,right_entity_id,score,status,evidence,contradictions
    )
    select
      'listing',
      s.listing_id,
      'property',
      s.property_id,
      s.match_score,
      s.match_status,
      jsonb_build_array(
        jsonb_build_object('signal','method','value','live_unique_address_attributes_v2'),
        jsonb_build_object('signal','source_listing_id','value',s.source_listing_id),
        jsonb_build_object('signal','listing_address','value',s.listing_address),
        jsonb_build_object('signal','property_address','value',s.property_address),
        jsonb_build_object('signal','area_delta_ratio','value',s.area_delta),
        jsonb_build_object('signal','live_area_m2','value',s.live_area),
        jsonb_build_object('signal','canonical_area_m2','value',s.useful_area_m2),
        jsonb_build_object('signal','bedrooms_compatible','value',case when s.live_bedrooms is not null and s.bedrooms is not null then abs(s.live_bedrooms-s.bedrooms) <= 1 else null end),
        jsonb_build_object('signal','bathrooms_compatible','value',case when s.live_bathrooms is not null and s.bathrooms is not null then abs(s.live_bathrooms-s.bathrooms) <= 1 else null end),
        jsonb_build_object('signal','parking_compatible','value',case when s.live_parking is not null and s.parking_spaces is not null then abs(s.live_parking-s.parking_spaces) <= 1 else null end),
        jsonb_build_object('signal','governance_note','value','Unique evidence candidate only. Does not link listing or confirm identity without explicit reviewed decision.')
      ),
      '{}'::jsonb
    from scored s
    on conflict (left_entity_type,left_entity_id,right_entity_type,right_entity_id)
    do update set
      score = excluded.score,
      status = case when public.market_property_matches.status in ('confirmed','rejected') then public.market_property_matches.status else excluded.status end,
      evidence = excluded.evidence,
      contradictions = excluded.contradictions
    returning (xmax = 0) as inserted
  )
  select count(*) filter(where inserted),count(*) filter(where not inserted)
  into v_inserted,v_updated
  from upserted;

  return jsonb_build_object('inserted',v_inserted,'updated',v_updated,'generated_at',now());
end;
$$;

revoke all on function public.refresh_market_listing_property_match_candidates_v1() from public;
revoke all on function public.refresh_market_listing_property_match_candidates_v1() from anon;
grant execute on function public.refresh_market_listing_property_match_candidates_v1() to authenticated;
