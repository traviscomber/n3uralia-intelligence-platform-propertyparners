create or replace function public.refresh_lo_curro_listing_intelligence_v1()
returns jsonb language plpgsql security definer
set search_path=public,private,extensions,pg_temp as $function$
declare v_count integer:=0;
begin
  insert into private.market_listing_intelligence_v1(
    listing_id,property_id,source_listing_id,barrio,property_type,raw_address,source_url,current_price_uf,
    first_seen_at,last_seen_at,min_price_uf,max_price_uf,price_drop_pct,currently_active,
    latitude,longitude,coordinate_source,elevation_m,slope_degrees,relative_elevation_m,roughness_m,terrain_position,
    terrain_confidence,market_signal,data_confidence,evidence,refreshed_at,
    reported_useful_area_m2,reported_total_area_m2,reported_built_area_m2,reported_bedrooms,reported_bathrooms,reported_parking_spaces,reported_construction_year)
  select l.id,l.property_id,l.source_listing_id,'Lo Curro',
    coalesce(p.property_type,l.raw_payload->>'property_type',case when l.title ilike '%casa%' then 'Casa' end),
    l.raw_address,l.url,l.price_uf,h.first_seen_at,h.last_seen_at,h.minimum_price_uf,h.maximum_price_uf,
    case when h.maximum_price_uf>0 and l.price_uf is not null then round((100*(h.maximum_price_uf-l.price_uf)/h.maximum_price_uf)::numeric,2) end,
    coalesce(h.currently_active,l.status='active'),coalesce(l.latitude,p.latitude),coalesce(l.longitude,p.longitude),
    case when l.latitude is not null and l.longitude is not null then 'listing' when p.latitude is not null and p.longitude is not null then 'canonical_property' else 'missing' end,
    topo.elevation_m,topo.slope_degrees,topo.relative_elevation_m,topo.roughness_m,topo.terrain_position,
    case when topo.terrain_position='mid_slope' and topo.roughness_m>=30 then 'strong' when topo.terrain_position='mid_slope' and topo.slope_degrees>=10 then 'promising' when topo.terrain_position='mid_slope' then 'medium' when topo.terrain_position is not null then 'exploratory' else 'unavailable' end,
    case when coalesce(h.currently_active,l.status='active')=false then 'removed_or_closed' when h.maximum_price_uf>0 and l.price_uf<h.maximum_price_uf*.90 then 'material_price_drop' when coalesce(h.first_seen_at,l.observed_at)>=now()-interval '14 days' then 'new_listing' else 'active_stock' end,
    round(((case when coalesce(l.latitude,p.latitude) is not null and coalesce(l.longitude,p.longitude) is not null then .30 else 0 end)+(case when p.id is not null then .20 else 0 end)+(case when h.observation_count>=2 then .20 else case when h.observation_count=1 then .10 else 0 end end)+(case when topo.terrain_position is not null then .20 else 0 end)+(case when l.price_uf is not null then .10 else 0 end))::numeric,2),
    jsonb_build_object('derived',true,'canonical',false,'methodologyVersion','lo-curro-listing-intelligence-v2','sourceListingStatus',l.status,'propertyIdentityStatus',p.identity_status,'propertyIdentityConfidence',p.identity_confidence,'historyObservationCount',h.observation_count,'topographySource','copernicus-dem-2021-glo90-open-meteo-90m','nonBinding',true,'mayTrainChampion',false,'reportedFieldsAreSourceClaims',true),now(),
    nullif(l.raw_payload->>'useful_area_m2','')::numeric,
    coalesce(nullif(l.raw_payload->>'raw_total_area','')::numeric,nullif(l.raw_payload->>'land_area_m2','')::numeric),
    nullif(l.raw_payload->>'built_area_m2','')::numeric,
    nullif(l.raw_payload->>'bedrooms','')::integer,
    nullif(l.raw_payload->>'bathrooms','')::integer,
    nullif(l.raw_payload->>'parking_spaces','')::integer,
    nullif(l.raw_payload->>'construction_year','')::integer
  from public.market_current_listings l
  left join public.market_properties p on p.id=l.property_id
  left join public.market_listing_history h on h.source_listing_id=l.source_listing_id and (h.property_id=l.property_id or l.property_id is null)
  left join lateral (
    select s.elevation_m,s.slope_degrees,s.relative_elevation_m,s.roughness_m,s.terrain_position
    from public.valuation_topography_samples s
    where coalesce(l.latitude,p.latitude) is not null and coalesce(l.longitude,p.longitude) is not null and s.source_version='copernicus-dem-2021-glo90-open-meteo-90m'
    order by power(s.latitude-coalesce(l.latitude,p.latitude),2)+power(s.longitude-coalesce(l.longitude,p.longitude),2) limit 1
  ) topo on true
  where lower(l.operation) in ('venta','sale')
    and (coalesce(p.property_type,l.raw_payload->>'property_type',l.title) ilike '%casa%' or l.title ilike '%casa%')
    and (coalesce(l.raw_address,'') ilike '%Lo Curro%' or coalesce(l.title,'') ilike '%Lo Curro%')
  on conflict(listing_id) do update set
    property_id=excluded.property_id,property_type=excluded.property_type,raw_address=excluded.raw_address,source_url=excluded.source_url,current_price_uf=excluded.current_price_uf,first_seen_at=excluded.first_seen_at,last_seen_at=excluded.last_seen_at,min_price_uf=excluded.min_price_uf,max_price_uf=excluded.max_price_uf,price_drop_pct=excluded.price_drop_pct,currently_active=excluded.currently_active,latitude=excluded.latitude,longitude=excluded.longitude,coordinate_source=excluded.coordinate_source,elevation_m=excluded.elevation_m,slope_degrees=excluded.slope_degrees,relative_elevation_m=excluded.relative_elevation_m,roughness_m=excluded.roughness_m,terrain_position=excluded.terrain_position,terrain_confidence=excluded.terrain_confidence,market_signal=excluded.market_signal,data_confidence=excluded.data_confidence,evidence=excluded.evidence,refreshed_at=now(),reported_useful_area_m2=excluded.reported_useful_area_m2,reported_total_area_m2=excluded.reported_total_area_m2,reported_built_area_m2=excluded.reported_built_area_m2,reported_bedrooms=excluded.reported_bedrooms,reported_bathrooms=excluded.reported_bathrooms,reported_parking_spaces=excluded.reported_parking_spaces,reported_construction_year=excluded.reported_construction_year;
  get diagnostics v_count=row_count;
  return jsonb_build_object('upserted',v_count,'projection','private.market_listing_intelligence_v1','canonical',false,'mayTrainChampion',false,'version','v2');
end;$function$;
