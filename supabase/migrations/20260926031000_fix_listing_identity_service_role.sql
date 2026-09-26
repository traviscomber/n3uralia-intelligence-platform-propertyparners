begin;

-- Allow the service-role collector to refresh PP identity candidates through PostgREST.
-- request.jwt.claim.role is not populated reliably by the current PostgREST path;
-- auth.role() reads the JWT role consistently for authenticated and service-role calls.
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
  if coalesce((select auth.role()), '') <> 'service_role' then
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
      ml.raw_address,
      ml.price_uf,
      lower(regexp_replace(extensions.unaccent(coalesce(ml.title,'')),'[^a-z0-9]+','','g')) as title_key,
      case when nullif(ml.raw_payload->>'useful_area_m2','') ~ '^[0-9]+([.][0-9]+)?$' then (ml.raw_payload->>'useful_area_m2')::numeric end as live_area,
      case when nullif(ml.raw_payload->>'bedrooms','') ~ '^[0-9]+$' then (ml.raw_payload->>'bedrooms')::integer end as live_bedrooms,
      case when nullif(ml.raw_payload->>'bathrooms','') ~ '^[0-9]+$' then (ml.raw_payload->>'bathrooms')::integer end as live_bathrooms
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
      lower(regexp_replace(extensions.unaccent(coalesce(mp.normalized_address,'')),'[^a-z0-9]+','','g')) as prop_key
    from public.market_properties mp
    where mp.property_type = 'Casa'
  ), strong as (
    select
      l.listing_id,
      l.source_listing_id,
      p.id as property_id,
      l.title,
      l.raw_address,
      p.normalized_address as property_address,
      l.live_area,
      p.useful_area_m2,
      l.live_bedrooms,
      p.bedrooms,
      l.live_bathrooms,
      p.bathrooms,
      case
        when l.live_area is not null and p.useful_area_m2 is not null and greatest(l.live_area,p.useful_area_m2) > 0
        then abs(l.live_area-p.useful_area_m2)/greatest(l.live_area,p.useful_area_m2)
      end as area_delta
    from live l
    join props p
      on length(l.title_key) >= 18
     and p.prop_key like '%' || l.title_key || '%'
    where (l.live_area is null or p.useful_area_m2 is null or abs(l.live_area-p.useful_area_m2)/greatest(l.live_area,p.useful_area_m2) <= 0.03)
      and (l.live_bathrooms is null or p.bathrooms is null or l.live_bathrooms = p.bathrooms)
      and (l.live_bedrooms is null or p.bedrooms is null or l.live_bedrooms = p.bedrooms)
  ), unique_strong as (
    select s.*
    from strong s
    join (
      select listing_id,count(*) as candidate_count
      from strong
      group by listing_id
      having count(*) = 1
    ) u on u.listing_id = s.listing_id
  ), upserted as (
    insert into public.market_property_matches(
      left_entity_type,left_entity_id,right_entity_type,right_entity_id,score,status,evidence,contradictions
    )
    select
      'listing',
      u.listing_id,
      'property',
      u.property_id,
      0.94,
      'candidate_high',
      jsonb_build_array(
        jsonb_build_object('signal','method','value','live_unique_title_attributes_v1'),
        jsonb_build_object('signal','source_listing_id','value',u.source_listing_id),
        jsonb_build_object('signal','specific_title_contained','value',u.title),
        jsonb_build_object('signal','property_address','value',u.property_address),
        jsonb_build_object('signal','area_delta_ratio','value',u.area_delta),
        jsonb_build_object('signal','live_area_m2','value',u.live_area),
        jsonb_build_object('signal','canonical_area_m2','value',u.useful_area_m2),
        jsonb_build_object('signal','bedrooms_compatible','value',case when u.live_bedrooms is not null and u.bedrooms is not null then u.live_bedrooms=u.bedrooms else null end),
        jsonb_build_object('signal','bathrooms_compatible','value',case when u.live_bathrooms is not null and u.bathrooms is not null then u.live_bathrooms=u.bathrooms else null end),
        jsonb_build_object('signal','governance_note','value','Unique high-confidence candidate only. Does not link listing, confirm identity, or merge canonical properties without an explicit reviewed decision.')
      ),
      '{}'::jsonb
    from unique_strong u
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
grant execute on function public.refresh_market_listing_property_match_candidates_v1() to service_role;


commit;
