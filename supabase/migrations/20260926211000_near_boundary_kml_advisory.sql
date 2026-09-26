-- Add a geometry-only advisory for Portal coordinates that fall just outside
-- the canonical KML polygons. This never grants canonical write authority.

create or replace function private.get_market_near_boundary_kml_candidate_v1(p_listing_id uuid)
returns table (
  neighborhood_id uuid,
  neighborhood_name text,
  distance_m numeric,
  second_distance_m numeric,
  margin_m numeric,
  advisory boolean
)
language sql
security definer
set search_path=''
as $function$
  with listing as (
    select latitude,longitude
    from public.market_listings
    where id=p_listing_id
      and latitude is not null
      and longitude is not null
  ), ranked as (
    select
      mn.id,
      mn.name,
      extensions.st_distance(
        extensions.st_transform(
          extensions.st_setsrid(extensions.st_makepoint(l.longitude,l.latitude),4326),
          3857
        ),
        extensions.st_transform(
          extensions.st_setsrid(extensions.st_geomfromgeojson(mn.geometry::text),4326),
          3857
        )
      )::numeric as distance_m,
      row_number() over(order by
        extensions.st_distance(
          extensions.st_transform(
            extensions.st_setsrid(extensions.st_makepoint(l.longitude,l.latitude),4326),
            3857
          ),
          extensions.st_transform(
            extensions.st_setsrid(extensions.st_geomfromgeojson(mn.geometry::text),4326),
            3857
          )
        ),
        mn.name
      ) as rn
    from listing l
    join public.market_neighborhoods mn on mn.geometry is not null
    join public.market_sources ms
      on ms.id=mn.geometry_source_id
     and ms.code='kml_vitacura_barrios_2026_08_12'
    where not extensions.st_covers(
      extensions.st_setsrid(extensions.st_geomfromgeojson(mn.geometry::text),4326),
      extensions.st_setsrid(extensions.st_makepoint(l.longitude,l.latitude),4326)
    )
  ), rolled as (
    select
      max(id) filter(where rn=1) as neighborhood_id,
      max(name) filter(where rn=1) as neighborhood_name,
      max(distance_m) filter(where rn=1) as distance_m,
      max(distance_m) filter(where rn=2) as second_distance_m
    from ranked
    where rn<=2
  )
  select
    neighborhood_id,
    neighborhood_name,
    distance_m,
    second_distance_m,
    second_distance_m-distance_m as margin_m,
    (
      distance_m is not null
      and distance_m<=100
      and second_distance_m is not null
      and second_distance_m-distance_m>=100
    ) as advisory
  from rolled;
$function$;

revoke all on function private.get_market_near_boundary_kml_candidate_v1(uuid) from public,anon,authenticated;

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
      when near.advisory then near.neighborhood_id
      when poi.neighborhood_id is not null and not coalesce(poi.conflict,false) then poi.neighborhood_id
      when learned.neighborhood_id is not null and not coalesce(learned.conflict,false) then learned.neighborhood_id
      else null
    end,
    case
      when sig.neighborhood_id is not null then sig.neighborhood_name
      when near.advisory then near.neighborhood_name
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
      when near.advisory then 'near_boundary_kml_advisory'
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
      when sig.neighborhood_id is not null and sig.resolution_kind='point_in_kml' then
        coalesce(sig.reason,'La coordenada Portal cae dentro de un único barrio KML canónico.')
      when sig.neighborhood_id is not null then
        coalesce(sig.reason,'Señal territorial secundaria.') ||
        ' Se usa sólo como apoyo de revisión y no permite confirmación canónica.'
      when near.advisory then
        'La coordenada Portal queda ' || round(near.distance_m,1)::text || ' m fuera del KML ' ||
        near.neighborhood_name || ', y el segundo barrio más cercano queda ' ||
        round(near.second_distance_m,1)::text || ' m. Señal geométrica de borde: revisar, no confirmar automáticamente.'
      when coalesce(poi.conflict,false) then
        'Los puntos cercanos publicados por Portal apuntan a más de un barrio. Se mantiene abierto.'
      when poi.neighborhood_id is not null then
        'Puntos cercanos Portal convergen en ' || poi.neighborhood_name ||
        '. Señal secundaria de apoyo; no permite confirmación canónica.'
      when coalesce(learned.conflict,false) then
        'La inteligencia aprendida encontró patrones que apuntan a más de un barrio. Se mantiene abierto.'
      when learned.neighborhood_id is not null then
        'Patrón aprendido con ' || round((learned.confidence*100)::numeric,1)::text ||
        '% de confianza. Es sólo una señal secundaria y no permite confirmación canónica.'
      else 'La evidencia disponible todavía no converge en un único barrio KML.'
    end,
    case
      when sig.neighborhood_id is not null
       and sig.resolution_kind='point_in_kml'
      then (
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
  left join lateral private.get_market_near_boundary_kml_candidate_v1(ll.id) near
    on sig.neighborhood_id is null
  left join lateral private.get_market_nearby_poi_neighborhood_candidate_v1(ll.id) poi
    on sig.neighborhood_id is null and not coalesce(near.advisory,false)
  left join lateral private.get_market_learned_neighborhood_candidate_v1(ll.id) learned
    on sig.neighborhood_id is null and not coalesce(near.advisory,false) and poi.neighborhood_id is null
  where ll.status='active' and lr.decision='pending'
  order by
    case
      when sig.resolution_kind='point_in_kml'
       and (ll.property_id is null or mp.neighborhood_id is null or mp.neighborhood_id is not distinct from sig.neighborhood_id)
      then 0
      when near.advisory then 1
      when sig.neighborhood_id is not null then 2
      when poi.neighborhood_id is not null then 3
      when learned.neighborhood_id is not null and not coalesce(learned.conflict,false) then 4
      else 5
    end,
    ll.observed_at desc nulls last,
    ll.source_listing_id;
end;
$function$;

revoke all on function public.get_ceo_market_neighborhood_queue_v1() from public,anon;
grant execute on function public.get_ceo_market_neighborhood_queue_v1() to authenticated;

comment on function private.get_market_near_boundary_kml_candidate_v1(uuid) is
'Advisory-only geometry signal for Portal points just outside canonical KML. Requires <=100m nearest distance and >=100m separation from the second-nearest barrio.';
