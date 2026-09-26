-- Prefer fresh Portal map coordinates over learned or historical territorial memory.
-- Exact point-in-polygon against the canonical Vitacura KML is deterministic and
-- must win before accepted-memory or textual evidence fallbacks.

CREATE OR REPLACE FUNCTION private.resolve_market_neighborhood_signal_v2(p_listing_id uuid)
 RETURNS TABLE(neighborhood_id uuid, neighborhood_name text, resolution_kind text, reason text, evidence jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_listing record;
  v_address_key text;
  v_combined_text text;
  v_first_segment text;
  v_id uuid;
  v_name text;
  v_count integer;
  v_term_count integer;
  v_neighborhood_count integer;
  v_method text;
  v_reason text;
  v_payload jsonb;
begin
  select l.id,l.source_listing_id,l.property_id,l.raw_address,l.normalized_address,l.title,l.latitude,l.longitude,l.observed_at,
         ms.code as source_code,
         mp.normalized_address as property_address
  into v_listing
  from public.market_listings l
  join public.market_sources ms on ms.id=l.source_id
  left join public.market_properties mp on mp.id=l.property_id
  where l.id=p_listing_id;

  if v_listing.id is null or v_listing.source_code not in (
    'portal-inmobiliario-vitacura-portal-houses',
    'portal-inmobiliario-vitacura-portal-apartments',
    'portal-inmobiliario-vitacura-portal-projects'
  ) then return; end if;

  v_address_key:=private.normalize_market_address(coalesce(v_listing.normalized_address,v_listing.property_address,v_listing.raw_address));
  v_combined_text:=lower(extensions.unaccent(coalesce(v_listing.raw_address,'') || ' ' || coalesce(v_listing.title,'') || ' ' || coalesce(v_listing.property_address,'')));
  v_first_segment:=lower(extensions.unaccent(btrim(split_part(coalesce(v_listing.raw_address,''),',',1))));

  if v_listing.latitude is not null and v_listing.longitude is not null then
    v_count:=0; v_id:=null; v_name:=null;
    select count(*)::integer,(array_agg(mn.id order by mn.id::text))[1],min(mn.name)
    into v_count,v_id,v_name
    from public.market_neighborhoods mn
    join public.market_sources ms on ms.id=mn.geometry_source_id and ms.code='kml_vitacura_barrios_2026_08_12'
    where mn.geometry is not null
      and extensions.st_covers(
        extensions.st_setsrid(extensions.st_geomfromgeojson(mn.geometry::text),4326),
        extensions.st_setsrid(extensions.st_makepoint(v_listing.longitude::double precision,v_listing.latitude::double precision),4326)
      );
    if v_count=1 and v_id is not null then
      return query select v_id,v_name,'point_in_kml'::text,'La coordenada del aviso cae dentro de un único polígono KML canónico.'::text,
        jsonb_build_object('latitude',v_listing.latitude,'longitude',v_listing.longitude,'canonical_write',false);
      return;
    end if;
  end if;

  v_id:=null; v_name:=null; v_payload:=null;
  if v_address_key is not null then
    select m.neighborhood_id,mn.name,m.evidence into v_id,v_name,v_payload
    from private.market_address_resolution_memory m
    join public.market_neighborhoods mn on mn.id=m.neighborhood_id
    join public.market_sources ms on ms.id=mn.geometry_source_id and ms.code='kml_vitacura_barrios_2026_08_12'
    where m.address_key=v_address_key and m.confidence>=0.95
    order by m.updated_at desc limit 1;
    if v_id is not null then
      return query select v_id,v_name,'accepted_memory'::text,'La dirección exacta ya fue resuelta y aceptada anteriormente.'::text,
        jsonb_build_object('address_key',v_address_key,'memory',coalesce(v_payload,'{}'::jsonb));
      return;
    end if;
  end if;

  v_id:=null; v_name:=null; v_method:=null; v_reason:=null; v_payload:=null;
  select e.neighborhood_id,mn.name,e.method,e.reason,e.evidence into v_id,v_name,v_method,v_reason,v_payload
  from private.market_neighborhood_resolution_evidence_v1 e
  join public.market_neighborhoods mn on mn.id=e.neighborhood_id
  join public.market_sources ms on ms.id=mn.geometry_source_id and ms.code='kml_vitacura_barrios_2026_08_12'
  where e.source_listing_id=v_listing.source_listing_id limit 1;
  if v_id is not null then
    return query select v_id,v_name,'territorial_evidence'::text,v_reason,coalesce(v_payload,'{}'::jsonb)||jsonb_build_object('method',v_method);
    return;
  end if;



  v_count:=0; v_id:=null; v_name:=null;
  select count(distinct mn.id)::integer,(array_agg(mn.id order by mn.id::text))[1],min(mn.name)
  into v_count,v_id,v_name
  from public.market_neighborhoods mn
  join public.market_sources ms on ms.id=mn.geometry_source_id and ms.code='kml_vitacura_barrios_2026_08_12'
  where v_combined_text like '%' || lower(extensions.unaccent(mn.name)) || '%';
  if v_count=1 and v_id is not null then
    return query select v_id,v_name,'direct_kml'::text,'El texto del aviso identifica un único barrio del KML canónico.'::text,
      jsonb_build_object('method','canonical_kml_name_v2','canonical_write',false);
    return;
  end if;

  v_count:=0; v_id:=null; v_name:=null;
  with latest_review as (
    select r.candidate_neighborhoods
    from public.market_neighborhood_review_items r
    join public.market_listings l on l.id=r.listing_id
    where l.source_listing_id=v_listing.source_listing_id and r.decision='pending'
    order by r.created_at desc limit 1
  )
  select count(distinct mn.id)::integer,(array_agg(mn.id order by mn.id::text))[1],min(mn.name)
  into v_count,v_id,v_name
  from latest_review lr
  cross join lateral pg_catalog.jsonb_array_elements_text(coalesce(lr.candidate_neighborhoods,'[]'::jsonb)) c(name)
  join public.market_neighborhoods mn on lower(extensions.unaccent(mn.name))=lower(extensions.unaccent(c.name))
  join public.market_sources ms on ms.id=mn.geometry_source_id and ms.code='kml_vitacura_barrios_2026_08_12';
  if v_count=1 and v_id is not null then
    return query select v_id,v_name,'unique_kml_candidate'::text,'Entre los candidatos históricos del aviso queda un único barrio que pertenece al KML canónico.'::text,
      jsonb_build_object('method','canonical_candidate_filter_v2','canonical_write',false);
    return;
  end if;

  v_neighborhood_count:=0; v_id:=null; v_name:=null; v_payload:=null;
  select count(distinct r.neighborhood_id)::integer,(array_agg(r.neighborhood_id order by r.neighborhood_id::text))[1],min(mn.name),
         jsonb_agg(jsonb_build_object('match_value',r.match_value,'method',r.method,'evidence',r.evidence) order by r.match_value)
  into v_neighborhood_count,v_id,v_name,v_payload
  from private.market_neighborhood_resolution_rules_v1 r
  join public.market_neighborhoods mn on mn.id=r.neighborhood_id
  where r.is_active and r.match_kind='first_segment_term' and v_first_segment like '%' || r.match_value || '%';
  if v_neighborhood_count=1 and v_id is not null then
    return query select v_id,v_name,'validated_rule'::text,
      'Una regla territorial reutilizable, previamente validada contra KML y fuentes independientes, resuelve el primer segmento de la dirección.'::text,
      jsonb_build_object('matched_rules',coalesce(v_payload,'[]'::jsonb),'canonical_write',false);
    return;
  end if;

  v_term_count:=0; v_neighborhood_count:=0; v_id:=null; v_name:=null; v_payload:=null;
  with terms as (
    select distinct lower(extensions.unaccent(btrim(t.term))) as term
    from regexp_split_to_table(v_first_segment,E'\\s*(/| - |:)\\s*') as t(term)
    where length(btrim(t.term))>=5
      and lower(extensions.unaccent(btrim(t.term))) not in ('vitacura','santiago','metropolitana','rm (metropolitana)','casa piedra','borde rio')
  ), term_stats as (
    select t.term,c.neighborhood,count(*)::integer as n
    from terms t
    join public.market_cbrs_reference_transactions c
      on c.property_type='Casa' and lower(extensions.unaccent(coalesce(c.address,''))) like '%' || t.term || '%'
    where nullif(c.neighborhood,'') is not null
    group by t.term,c.neighborhood
  ), strong_terms as (
    select ts.term,min(ts.neighborhood) as neighborhood,sum(ts.n)::integer as total
    from term_stats ts
    group by ts.term
    having count(distinct lower(extensions.unaccent(ts.neighborhood)))=1 and sum(ts.n)>=4
  ), mapped as (
    select st.term,st.total,mn.id,mn.name
    from strong_terms st
    join public.market_neighborhoods mn on lower(extensions.unaccent(mn.name))=lower(extensions.unaccent(st.neighborhood))
    join public.market_sources ms on ms.id=mn.geometry_source_id and ms.code='kml_vitacura_barrios_2026_08_12'
  )
  select count(*)::integer,count(distinct m.id)::integer,(array_agg(m.id order by m.id::text))[1],min(m.name),
         jsonb_agg(jsonb_build_object('term',m.term,'historical_rows',m.total,'neighborhood',m.name) order by m.term)
  into v_term_count,v_neighborhood_count,v_id,v_name,v_payload
  from mapped m;
  if v_term_count>0 and v_neighborhood_count=1 and v_id is not null then
    return query select v_id,v_name,'cbrs_street_consensus'::text,
      'Las referencias del primer segmento de la dirección tienen consenso histórico CBRS y convergen en un único barrio KML.'::text,
      jsonb_build_object('terms',coalesce(v_payload,'[]'::jsonb),'minimum_rows_per_term',4,'canonical_write',false);
    return;
  end if;
  return;
end;
$function$;

comment on function private.resolve_market_neighborhood_signal_v2(uuid) is
'Canonical territory resolver. Priority: unique Portal coordinate in canonical KML, accepted exact-address memory, validated territorial evidence, direct KML text, unique candidates, validated rules and CBRS street consensus.';
