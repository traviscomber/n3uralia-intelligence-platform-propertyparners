create table if not exists private.market_neighborhood_learned_poi_aliases_v1 (
  place_key text primary key,
  neighborhood_id uuid not null references public.market_neighborhoods(id),
  support_rows integer not null,
  total_rows integer not null,
  confidence numeric not null,
  categories text[] not null default '{}',
  source text not null default 'portal_nearby_places',
  evidence jsonb not null default '{}'::jsonb,
  refreshed_at timestamptz not null default now(),
  check (support_rows >= 0),
  check (total_rows >= support_rows),
  check (confidence >= 0 and confidence <= 1)
);

revoke all on table private.market_neighborhood_learned_poi_aliases_v1 from public,anon,authenticated;

create or replace function private.refresh_market_neighborhood_learned_poi_aliases_v1()
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_upserted integer := 0;
  v_deleted integer := 0;
begin
  create temporary table tmp_poi_aliases on commit drop as
  with source as (
    select id
    from public.market_sources
    where code='portal-inmobiliario-vitacura-portal-houses'
    limit 1
  ), resolved as (
    select
      l.id,
      sig.neighborhood_id,
      sig.neighborhood_name,
      l.raw_payload
    from public.market_current_listings l
    left join lateral private.resolve_market_neighborhood_signal_v2(l.id) sig on true
    where l.source_id=(select id from source)
      and l.status in ('active','observed')
      and sig.neighborhood_id is not null
      and sig.resolution_kind='point_in_kml'
      and jsonb_typeof(l.raw_payload->'nearby_places')='array'
  ), places as (
    select
      r.neighborhood_id,
      r.neighborhood_name,
      lower(extensions.unaccent(btrim(p.value->>'name'))) as place_key,
      lower(btrim(coalesce(p.value->>'category','unknown'))) as category
    from resolved r
    cross join lateral pg_catalog.jsonb_array_elements(r.raw_payload->'nearby_places') p(value)
    where nullif(btrim(p.value->>'name'),'') is not null
  ), filtered as (
    select *
    from places
    where length(place_key) between 4 and 120
      and place_key !~ '^[0-9 ]+$'
  ), stats as (
    select
      place_key,
      neighborhood_id,
      neighborhood_name,
      count(*)::integer as support_rows,
      sum(count(*)) over(partition by place_key)::integer as total_rows,
      array_agg(distinct category order by category) as categories,
      row_number() over(
        partition by place_key
        order by count(*) desc, neighborhood_name, neighborhood_id::text
      ) as rn
    from filtered
    group by place_key,neighborhood_id,neighborhood_name
  )
  select
    place_key,
    neighborhood_id,
    support_rows,
    total_rows,
    support_rows::numeric/nullif(total_rows,0) as confidence,
    categories,
    neighborhood_name
  from stats
  where rn=1
    and total_rows>=4
    and support_rows::numeric/nullif(total_rows,0)>=0.95;

  insert into private.market_neighborhood_learned_poi_aliases_v1(
    place_key,neighborhood_id,support_rows,total_rows,confidence,categories,source,evidence,refreshed_at
  )
  select
    a.place_key,
    a.neighborhood_id,
    a.support_rows,
    a.total_rows,
    a.confidence,
    a.categories,
    'portal_nearby_places',
    jsonb_build_object(
      'method','portal_nearby_poi_alias_v1',
      'neighborhood_name',a.neighborhood_name,
      'support_rows',a.support_rows,
      'total_rows',a.total_rows,
      'confidence',a.confidence,
      'categories',a.categories,
      'threshold',0.95,
      'minimum_rows',4,
      'canonical_write',false
    ),
    now()
  from tmp_poi_aliases a
  on conflict (place_key) do update set
    neighborhood_id=excluded.neighborhood_id,
    support_rows=excluded.support_rows,
    total_rows=excluded.total_rows,
    confidence=excluded.confidence,
    categories=excluded.categories,
    source=excluded.source,
    evidence=excluded.evidence,
    refreshed_at=excluded.refreshed_at;

  get diagnostics v_upserted = row_count;

  delete from private.market_neighborhood_learned_poi_aliases_v1 x
  where x.source='portal_nearby_places'
    and not exists (select 1 from tmp_poi_aliases t where t.place_key=x.place_key);

  get diagnostics v_deleted = row_count;

  return jsonb_build_object(
    'aliases',(select count(*) from tmp_poi_aliases),
    'upserted',v_upserted,
    'deleted',v_deleted,
    'generated_at',now()
  );
end;
$function$;

revoke all on function private.refresh_market_neighborhood_learned_poi_aliases_v1() from public,anon,authenticated;

create or replace function private.get_market_nearby_poi_neighborhood_candidate_v1(p_listing_id uuid)
returns table (
  neighborhood_id uuid,
  neighborhood_name text,
  confidence numeric,
  matched_places integer,
  evidence jsonb,
  conflict boolean,
  high_confidence boolean
)
language sql
security definer
set search_path=''
as $function$
  with listing as (
    select l.raw_payload
    from public.market_listings l
    join public.market_sources s on s.id=l.source_id
    where l.id=p_listing_id
      and s.code='portal-inmobiliario-vitacura-portal-houses'
  ), places as (
    select distinct
      lower(extensions.unaccent(btrim(p.value->>'name'))) as place_key,
      p.value->>'name' as place_name,
      lower(btrim(coalesce(p.value->>'category','unknown'))) as category,
      nullif(p.value->>'distance_m','')::numeric as distance_m
    from listing
    cross join lateral pg_catalog.jsonb_array_elements(
      case when jsonb_typeof(raw_payload->'nearby_places')='array'
        then raw_payload->'nearby_places'
        else '[]'::jsonb
      end
    ) p(value)
    where nullif(btrim(p.value->>'name'),'') is not null
  ), matches as (
    select
      a.neighborhood_id,
      mn.name as neighborhood_name,
      p.place_key,
      p.place_name,
      p.category,
      p.distance_m,
      a.confidence,
      a.support_rows,
      a.total_rows
    from places p
    join private.market_neighborhood_learned_poi_aliases_v1 a using(place_key)
    join public.market_neighborhoods mn on mn.id=a.neighborhood_id
  ), roll as (
    select
      count(distinct neighborhood_id) as neighborhood_count,
      min(neighborhood_id::text)::uuid as only_neighborhood_id,
      count(distinct place_key)::integer as matched_places,
      min(confidence) as min_confidence,
      sum(support_rows)::integer as support_sum,
      jsonb_agg(
        jsonb_build_object(
          'place',place_name,
          'category',category,
          'distance_m',distance_m,
          'neighborhood',neighborhood_name,
          'confidence',confidence,
          'support_rows',support_rows,
          'total_rows',total_rows
        )
        order by distance_m nulls last,place_name
      ) as evidence
    from matches
  )
  select
    case when r.neighborhood_count=1 and r.matched_places>=2 then r.only_neighborhood_id else null end,
    case when r.neighborhood_count=1 and r.matched_places>=2 then mn.name else null end,
    r.min_confidence,
    r.matched_places,
    coalesce(r.evidence,'[]'::jsonb),
    (r.neighborhood_count>1),
    (
      r.neighborhood_count=1
      and r.matched_places>=3
      and coalesce(r.min_confidence,0)>=0.98
      and coalesce(r.support_sum,0)>=15
    )
  from roll r
  left join public.market_neighborhoods mn on mn.id=r.only_neighborhood_id;
$function$;

revoke all on function private.get_market_nearby_poi_neighborhood_candidate_v1(uuid) from public,anon,authenticated;

create or replace function public.refresh_market_neighborhood_learning_v1()
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_address jsonb;
  v_poi jsonb;
begin
  v_address := private.refresh_market_neighborhood_learned_aliases_v1();
  v_poi := private.refresh_market_neighborhood_learned_poi_aliases_v1();
  return jsonb_build_object('address_aliases',v_address,'nearby_poi_aliases',v_poi,'generated_at',now());
end;
$function$;

revoke all on function public.refresh_market_neighborhood_learning_v1() from public,anon,authenticated;
grant execute on function public.refresh_market_neighborhood_learning_v1() to service_role;

create or replace function public.get_ceo_market_neighborhood_queue_v1()
returns table (
  review_id uuid,
  source_listing_id text,
  raw_address text,
  title text,
  url text,
  classification text,
  proposed_neighborhood_id uuid,
  proposed_neighborhood_name text,
  resolution_kind text,
  reason text,
  can_decide boolean,
  observed_at timestamptz
)
language plpgsql
security definer
set search_path=''
as $function$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.profiles p
    where p.id=auth.uid()
      and lower(coalesce(p.role,'')) in ('ceo','admin','director','subdirector')
  ) then
    raise exception 'Operational leader role required';
  end if;

  return query
  with source as (
    select id from public.market_sources where code='portal-inmobiliario-vitacura-portal-houses' limit 1
  ), latest_listing as (
    select distinct on (l.source_listing_id)
      l.id,l.source_listing_id,l.property_id,l.raw_address,l.title,l.url,l.status,l.observed_at
    from public.market_listings l
    where l.source_id=(select id from source)
    order by l.source_listing_id,l.observed_at desc nulls last,l.created_at desc
  ), latest_review as (
    select distinct on (l.source_listing_id)
      l.source_listing_id,r.id,r.classification,r.decision,r.created_at
    from public.market_neighborhood_review_items r
    join public.market_listings l on l.id=r.listing_id
    where l.source_id=(select id from source)
    order by l.source_listing_id,r.created_at desc,r.id desc
  )
  select
    lr.id,
    ll.source_listing_id,
    ll.raw_address,
    ll.title,
    ll.url,
    lr.classification,
    case
      when sig.neighborhood_id is not null then sig.neighborhood_id
      when poi.neighborhood_id is not null and not coalesce(poi.conflict,false) then poi.neighborhood_id
      when learned.neighborhood_id is not null and not coalesce(learned.conflict,false) then learned.neighborhood_id
      else null
    end,
    case
      when sig.neighborhood_id is not null then sig.neighborhood_name
      when poi.neighborhood_id is not null and not coalesce(poi.conflict,false) then poi.neighborhood_name
      when learned.neighborhood_id is not null and not coalesce(learned.conflict,false) then learned.neighborhood_name
      else null
    end,
    case
      when sig.neighborhood_id is not null
       and ll.property_id is not null
       and mp.neighborhood_id is not null
       and mp.neighborhood_id is distinct from sig.neighborhood_id
      then 'canonical_conflict'
      when sig.neighborhood_id is not null then coalesce(sig.resolution_kind,'manual')
      when coalesce(poi.conflict,false) then 'portal_nearby_poi_conflict'
      when poi.neighborhood_id is not null then 'portal_nearby_poi_consensus_v1'
      when coalesce(learned.conflict,false) then 'learned_address_alias_conflict'
      when learned.neighborhood_id is not null then 'learned_address_alias_v1'
      else 'manual'
    end,
    case
      when sig.neighborhood_id is not null
       and ll.property_id is not null
       and mp.neighborhood_id is not null
       and mp.neighborhood_id is distinct from sig.neighborhood_id
      then 'La propiedad canónica ya tiene un barrio distinto. Requiere revisión de identidad/territorio antes de confirmar.'
      when sig.neighborhood_id is not null then coalesce(sig.reason,'La evidencia territorial determinística converge en un barrio KML.')
      when coalesce(poi.conflict,false) then
        'Los puntos cercanos publicados por Portal apuntan a más de un barrio. Se mantiene abierto para revisión.'
      when poi.neighborhood_id is not null then
        'Portal publica ' || poi.matched_places::text || ' puntos cercanos que convergen en ' || poi.neighborhood_name ||
        ' · confianza mínima histórica ' || round((poi.confidence*100)::numeric,1)::text ||
        '%. Señal secundaria: sólo prioriza revisión; no autoriza resolución automática.'
      when coalesce(learned.conflict,false) then
        'La inteligencia aprendida encontró patrones históricos que apuntan a más de un barrio. Se mantiene abierto y sin escritura canónica.'
      when learned.neighborhood_id is not null then
        'Patrón territorial aprendido con ' || round((learned.confidence*100)::numeric,1)::text ||
        '% de confianza. Es una sugerencia de revisión: no escribe barrio ni crea asignaciones hasta obtener evidencia determinística o confirmación válida.'
      else 'La evidencia disponible todavía no converge en un único barrio KML.'
    end,
    case
      when sig.neighborhood_id is not null
       and sig.resolution_kind='point_in_kml' then (
        ll.property_id is null
        or mp.neighborhood_id is null
        or mp.neighborhood_id is not distinct from sig.neighborhood_id
      )
      else false
    end,
    ll.observed_at
  from latest_listing ll
  join latest_review lr using(source_listing_id)
  left join public.market_properties mp on mp.id=ll.property_id
  left join lateral private.resolve_market_neighborhood_signal_v2(ll.id) sig on true
  left join lateral private.get_market_nearby_poi_neighborhood_candidate_v1(ll.id) poi
    on sig.neighborhood_id is null
  left join lateral private.get_market_learned_neighborhood_candidate_v1(ll.id) learned
    on sig.neighborhood_id is null and poi.neighborhood_id is null
  where ll.status='active' and lr.decision='pending'
  order by
    case
      when sig.neighborhood_id is not null
       and (ll.property_id is null or mp.neighborhood_id is null or mp.neighborhood_id is not distinct from sig.neighborhood_id)
      then 0
      when poi.neighborhood_id is not null and coalesce(poi.high_confidence,false) then 1
      when poi.neighborhood_id is not null then 2
      when learned.neighborhood_id is not null and not coalesce(learned.conflict,false) then 3
      else 4
    end,
    ll.observed_at desc nulls last,
    ll.source_listing_id;
end;
$function$;

revoke all on function public.get_ceo_market_neighborhood_queue_v1() from public,anon;
grant execute on function public.get_ceo_market_neighborhood_queue_v1() to authenticated;

comment on function public.get_ceo_market_neighborhood_queue_v1() is
'Operational neighborhood review inbox. Uses deterministic KML evidence first, then Portal nearby-place consensus, then learned address aliases. Nearby-place consensus is actionable only under strict multi-POI confidence thresholds.';
