create table if not exists private.market_neighborhood_resolution_rules_v1 (
  id uuid primary key default gen_random_uuid(),
  match_kind text not null default 'first_segment_term',
  match_value text not null,
  neighborhood_id uuid not null references public.market_neighborhoods(id) on delete restrict,
  method text not null,
  evidence jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_neighborhood_resolution_rules_v1_kind_check check (match_kind in ('first_segment_term')),
  constraint market_neighborhood_resolution_rules_v1_unique unique (match_kind, match_value)
);

revoke all on private.market_neighborhood_resolution_rules_v1 from public, anon, authenticated;

with rules(match_value, neighborhood_name, method, evidence) as (
  values
    (lower(extensions.unaccent('Gran Vía')), 'Lo Curro', 'validated_public_geometry_v1', jsonb_build_object('source','OpenStreetMap + Property Partners KML','osm_way','30594222','points_checked',5,'all_points_in_kml',true)),
    (lower(extensions.unaccent('Mar del Norte')), 'Luis Pasteur', 'validated_public_geometry_cbrs_v1', jsonb_build_object('source','OpenStreetMap + CBRS + Property Partners KML','osm_way','447532445','cbrs_matches',4,'cbrs_consistent',4,'line_in_single_kml',true)),
    (lower(extensions.unaccent('La Querencia')), 'La Llavería', 'validated_public_geometry_cbrs_v1', jsonb_build_object('source','OpenStreetMap + CBRS + Property Partners KML','osm_way','24306645','cbrs_matches',16,'cbrs_consistent',16,'line_in_single_kml',true)),
    (lower(extensions.unaccent('Las Chacras')), 'El Aromo', 'validated_public_geometry_v1', jsonb_build_object('source','OpenStreetMap + Property Partners KML','osm_way','180332964','line_in_single_kml',true)),
    (lower(extensions.unaccent('El Lleuque')), 'El Aromo', 'validated_public_geometry_cbrs_v1', jsonb_build_object('source','OpenStreetMap + CBRS + Property Partners KML','cbrs_matches',14,'cbrs_consistent',14,'line_in_single_kml',true)),
    (lower(extensions.unaccent('Los Castaños')), 'Las Tranqueras', 'validated_cbrs_geometry_v1', jsonb_build_object('source','CBRS + public geometry + Property Partners KML','cbrs_matches',30,'cbrs_consistent',30))
)
insert into private.market_neighborhood_resolution_rules_v1(match_kind,match_value,neighborhood_id,method,evidence)
select 'first_segment_term', r.match_value, mn.id, r.method, r.evidence
from rules r
join public.market_sources ms on ms.code='kml_vitacura_barrios_2026_08_12'
join public.market_neighborhoods mn on mn.geometry_source_id=ms.id and lower(extensions.unaccent(mn.name))=lower(extensions.unaccent(r.neighborhood_name))
on conflict (match_kind,match_value) do update
set neighborhood_id=excluded.neighborhood_id,
    method=excluded.method,
    evidence=excluded.evidence,
    is_active=true,
    updated_at=now();

with targets(source_listing_id, neighborhood_name, method, reason, evidence) as (
  values
    (
      '4084847778',
      'Lo Curro',
      'correction_kml_public_geometry_v2',
      'Gran Vía aparece en la dirección del aviso junto a Lo Curro. Cinco puntos distribuidos a lo largo del trazado público de Gran Vía caen todos dentro de Lo Curro en el KML Property Partners.',
      jsonb_build_object('correction_ready',true,'osm_way','30594222','points_checked',5,'points_in_proposed_kml',5,'current_canonical','Santa María','canonical_write',false)
    ),
    (
      '4116738562',
      'Luis Pasteur',
      'correction_kml_cbrs_geometry_v2',
      'Mar del Norte / Las Encinas converge en Luis Pasteur: CBRS registra 4/4 referencias Mar del Norte y 29/29 Las Encinas en Luis Pasteur, y el trazado público de Mar del Norte cae dentro de Luis Pasteur en el KML Property Partners.',
      jsonb_build_object('correction_ready',true,'osm_way','447532445','cbrs_mar_del_norte_matches',4,'cbrs_mar_del_norte_consistent',4,'cbrs_las_encinas_matches',29,'cbrs_las_encinas_consistent',29,'current_canonical','Vitacura Centro','canonical_write',false)
    )
)
insert into private.market_neighborhood_resolution_evidence_v1(source_listing_id,neighborhood_id,method,reason,evidence)
select t.source_listing_id,mn.id,t.method,t.reason,t.evidence
from targets t
join public.market_sources ms on ms.code='kml_vitacura_barrios_2026_08_12'
join public.market_neighborhoods mn on mn.geometry_source_id=ms.id and lower(extensions.unaccent(mn.name))=lower(extensions.unaccent(t.neighborhood_name))
on conflict (source_listing_id) do update
set neighborhood_id=excluded.neighborhood_id,
    method=excluded.method,
    reason=excluded.reason,
    evidence=excluded.evidence,
    updated_at=now();

create or replace function private.resolve_market_neighborhood_signal_v2(p_listing_id uuid)
returns table (
  neighborhood_id uuid,
  neighborhood_name text,
  resolution_kind text,
  reason text,
  evidence jsonb
)
language plpgsql
security definer
set search_path=''
as $function$
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

revoke all on function private.resolve_market_neighborhood_signal_v2(uuid) from public,anon,authenticated;

create or replace function private.enqueue_market_neighborhood_review_item()
returns trigger
language plpgsql
security definer
set search_path=''
as $function$
declare
  source_code text;
  matched_ids uuid[];
  matched_names text[];
  match_count integer;
  combined_text text;
  v_address_key text;
  remembered_property_id uuid;
  v_canonical_neighborhood_id uuid;
  v_signal record;
begin
  select ms.code into source_code from public.market_sources ms where ms.id=new.source_id;
  if source_code not in (
    'portal-inmobiliario-vitacura-portal-houses',
    'portal-inmobiliario-vitacura-portal-apartments',
    'portal-inmobiliario-vitacura-portal-projects'
  ) then return new; end if;

  if new.property_id is not null then
    select mp.neighborhood_id into v_canonical_neighborhood_id from public.market_properties mp where mp.id=new.property_id;
  end if;

  v_address_key:=private.normalize_market_address(coalesce(new.normalized_address,new.raw_address));
  if new.property_id is null and v_address_key is not null then
    select m.canonical_property_id into remembered_property_id
    from private.market_address_resolution_memory m
    join public.market_properties mp on mp.id=m.canonical_property_id
    where m.address_key=v_address_key
      and m.confidence>=0.95
      and m.canonical_property_id is not null
      and mp.neighborhood_id=m.neighborhood_id
    limit 1;
    if remembered_property_id is not null then
      update public.market_listings set property_id=remembered_property_id where id=new.id and property_id is null;
      update private.market_address_resolution_memory
      set hit_count=hit_count+1,last_seen_at=now(),updated_at=now()
      where address_key=v_address_key;
      return new;
    end if;
  end if;

  select * into v_signal from private.resolve_market_neighborhood_signal_v2(new.id) limit 1;

  if v_canonical_neighborhood_id is not null and (v_signal.neighborhood_id is null or v_signal.neighborhood_id=v_canonical_neighborhood_id) then
    return new;
  end if;

  if v_signal.neighborhood_id is not null then
    insert into public.market_neighborhood_review_items(
      listing_id,classification,suggested_neighborhood_id,candidate_neighborhoods,evidence
    ) values (
      new.id,'clear',v_signal.neighborhood_id,jsonb_build_array(v_signal.neighborhood_name),
      coalesce(v_signal.evidence,'{}'::jsonb) || jsonb_build_object(
        'source_listing_id',new.source_listing_id,
        'method',v_signal.resolution_kind,
        'reason',v_signal.reason,
        'canonical_write',false,
        'source_code',source_code,
        'canonical_conflict',v_canonical_neighborhood_id is not null and v_canonical_neighborhood_id<>v_signal.neighborhood_id,
        'generated_at',now()
      )
    ) on conflict (listing_id) do nothing;
    return new;
  end if;

  combined_text:=lower(extensions.unaccent(coalesce(new.raw_address,'') || ' ' || coalesce(new.title,'')));
  select coalesce(array_agg(mn.id order by length(mn.name) desc) filter (where mn.id is not null),array[]::uuid[]),
         coalesce(array_agg(mn.name order by length(mn.name) desc) filter (where mn.id is not null),array[]::text[]),
         count(mn.id)::integer
  into matched_ids,matched_names,match_count
  from public.market_neighborhoods mn
  join public.market_sources ms on ms.id=mn.geometry_source_id and ms.code='kml_vitacura_barrios_2026_08_12'
  where combined_text like '%' || lower(extensions.unaccent(mn.name)) || '%';

  insert into public.market_neighborhood_review_items(
    listing_id,classification,suggested_neighborhood_id,candidate_neighborhoods,evidence
  ) values (
    new.id,
    case when match_count=1 then 'clear' when match_count>1 then 'ambiguous' else 'no_match' end,
    case when match_count=1 then matched_ids[1] else null end,
    to_jsonb(matched_names),
    jsonb_build_object('source_listing_id',new.source_listing_id,'method','canonical_kml_only_v2','canonical_write',false,
      'source_code',source_code,'address_memory_checked',v_address_key is not null,'generated_at',now())
  ) on conflict (listing_id) do nothing;
  return new;
end;
$function$;
