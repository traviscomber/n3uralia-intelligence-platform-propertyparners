create table if not exists private.market_neighborhood_resolution_evidence_v1 (
  source_listing_id text primary key,
  neighborhood_id uuid not null references public.market_neighborhoods(id),
  method text not null,
  reason text not null,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on private.market_neighborhood_resolution_evidence_v1 from public, anon, authenticated;

with targets(source_listing_id, neighborhood_name, method, reason, evidence) as (
  values
    ('2172803741','Sport Frances','kml_cbrs_portal_v1','Carmen Fariña cae dentro de Sport Frances en el KML; CBRS registra 5/5 casas históricas de Carmen Fariña en Sport Frances y Portal sitúa el aviso junto a Av. Vitacura.',jsonb_build_object('cbrs_matches',5,'cbrs_consistent',5,'public_geometry','Carmen Fariña','portal_context','Av. Vitacura / Carmen Fariña')),
    ('4105697808','Sport Frances','kml_cbrs_portal_v1','El historial del aviso identifica Carmen Fariña; el trazado cae dentro de Sport Frances en el KML y CBRS registra 5/5 casas históricas de Carmen Fariña en Sport Frances.',jsonb_build_object('cbrs_matches',5,'cbrs_consistent',5,'public_geometry','Carmen Fariña')),
    ('4164840804','El Aromo','kml_cbrs_geometry_v1','El trazado El Lleuque cae dentro de El Aromo en el KML y CBRS registra 14/14 casas históricas de El Lleuque en El Aromo.',jsonb_build_object('cbrs_matches',14,'cbrs_consistent',14,'public_geometry','El Lleuque')),
    ('4179311490','El Aromo','kml_cbrs_portal_v1','Portal ubica el inmueble a metros de Lo Gallo/Av. Vitacura; el trazado de Lo Gallo cae en El Aromo en el KML y CBRS concentra el eje residencial Lo Gallo en El Aromo.',jsonb_build_object('public_geometry','Lo Gallo','portal_nearby_stop','Lo Gallo / Avenida Vitacura')),
    ('4349804250','Las Tranqueras','kml_cbrs_geometry_v1','Plaza Los Castaños cae dentro de Las Tranqueras en el KML y CBRS registra 30/30 casas históricas con referencia Los Castaños en Las Tranqueras.',jsonb_build_object('cbrs_matches',30,'cbrs_consistent',30,'public_geometry','Plaza Los Castaños')),
    ('4364239836','Luis Pasteur','kml_public_geometry_v1','El aviso referencia Bradford; Bradford School en Av. Luis Pasteur 6335 cae dentro de Luis Pasteur en el KML Property Partners.',jsonb_build_object('public_geometry','Bradford School','public_address','Av. Luis Pasteur 6335'))
)
insert into private.market_neighborhood_resolution_evidence_v1(source_listing_id,neighborhood_id,method,reason,evidence)
select t.source_listing_id,mn.id,t.method,t.reason,t.evidence
from targets t
join public.market_sources ms on ms.code='kml_vitacura_barrios_2026_08_12'
join public.market_neighborhoods mn on mn.geometry_source_id=ms.id and lower(mn.name)=lower(t.neighborhood_name)
on conflict (source_listing_id) do update
set neighborhood_id=excluded.neighborhood_id,method=excluded.method,reason=excluded.reason,evidence=excluded.evidence,updated_at=now();

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
    where p.id=auth.uid() and lower(coalesce(p.role,'')) in ('ceo','admin')
  ) then raise exception 'CEO or admin role required'; end if;

  return query
  with source as (
    select id from public.market_sources where code='portal-inmobiliario-vitacura-portal-houses' limit 1
  ), kml_source as (
    select id from public.market_sources where code='kml_vitacura_barrios_2026_08_12' limit 1
  ), kml as (
    select mn.id,mn.name,lower(mn.name) lname
    from public.market_neighborhoods mn
    where mn.geometry_source_id=(select id from kml_source)
  ), latest_listing as (
    select distinct on (l.source_listing_id)
      l.id,l.source_listing_id,l.raw_address,l.title,l.url,l.status,l.observed_at
    from public.market_listings l
    where l.source_id=(select id from source)
    order by l.source_listing_id,l.observed_at desc nulls last,l.created_at desc
  ), latest_review as (
    select distinct on (l.source_listing_id)
      l.source_listing_id,r.id,r.classification,r.candidate_neighborhoods,r.suggested_neighborhood_id,r.evidence,r.created_at
    from public.market_neighborhood_review_items r
    join public.market_listings l on l.id=r.listing_id
    where l.source_id=(select id from source) and r.decision='pending'
    order by l.source_listing_id,r.created_at desc
  ), resolved as (
    select ll.*,lr.id review_id,lr.classification,lr.candidate_neighborhoods,lr.suggested_neighborhood_id,lr.evidence,
      direct.name direct_name,
      unique_kml.id unique_id,unique_kml.name unique_name,
      ext.neighborhood_id ext_id,ext.method ext_method,ext.reason ext_reason,
      ext_kml.name ext_name
    from latest_listing ll
    left join latest_review lr using(source_listing_id)
    left join kml direct on direct.id=lr.suggested_neighborhood_id
    left join lateral (
      select k.id,k.name
      from pg_catalog.jsonb_array_elements_text(coalesce(lr.candidate_neighborhoods,'[]'::jsonb)) c(name)
      join kml k on k.lname=lower(c.name)
      where lr.classification='ambiguous'
      limit 2
    ) unique_kml on (
      select count(*) from pg_catalog.jsonb_array_elements_text(coalesce(lr.candidate_neighborhoods,'[]'::jsonb)) c2(name)
      join kml k2 on k2.lname=lower(c2.name)
    )=1
    left join private.market_neighborhood_resolution_evidence_v1 ext on ext.source_listing_id=ll.source_listing_id
    left join kml ext_kml on ext_kml.id=ext.neighborhood_id
    where ll.status='active'
  )
  select r.review_id,r.source_listing_id,r.raw_address,r.title,r.url,r.classification,
    case when r.classification='clear' and r.suggested_neighborhood_id is not null and r.direct_name is not null then r.suggested_neighborhood_id when r.unique_id is not null then r.unique_id when r.ext_id is not null then r.ext_id else null end,
    case when r.classification='clear' and r.suggested_neighborhood_id is not null and r.direct_name is not null then r.direct_name when r.unique_id is not null then r.unique_name when r.ext_id is not null then r.ext_name else null end,
    case when r.classification='clear' and r.suggested_neighborhood_id is not null and r.direct_name is not null then 'direct_kml' when r.unique_id is not null then 'unique_kml_candidate' when r.ext_id is not null then 'territorial_evidence' else 'manual' end,
    case when r.classification='clear' and r.suggested_neighborhood_id is not null and r.direct_name is not null then coalesce(r.evidence->>'reason','Barrio KML explícito en la evidencia del aviso.') when r.unique_id is not null then 'Entre los candidatos del aviso queda un único barrio que existe en el KML Property Partners.' when r.ext_id is not null then r.ext_reason else 'La evidencia disponible no permite elegir un único barrio KML sin criterio humano.' end,
    (r.review_id is not null and ((r.classification='clear' and r.suggested_neighborhood_id is not null and r.direct_name is not null) or r.unique_id is not null or r.ext_id is not null)),
    r.observed_at
  from resolved r
  order by case when ((r.classification='clear' and r.suggested_neighborhood_id is not null and r.direct_name is not null) or r.unique_id is not null or r.ext_id is not null) then 0 else 1 end,r.observed_at desc nulls last,r.source_listing_id;
end;
$function$;

revoke all on function public.get_ceo_market_neighborhood_queue_v1() from public, anon;
grant execute on function public.get_ceo_market_neighborhood_queue_v1() to authenticated;

create or replace function private.enforce_market_neighborhood_review_update()
returns trigger
language plpgsql
set search_path=''
as $function$
declare
  v_resolution_count integer := 0;
  v_resolution_id uuid;
  v_evidence_id uuid;
  v_allowed_resolution boolean := false;
begin
  if new.listing_id is distinct from old.listing_id
     or new.candidate_neighborhoods is distinct from old.candidate_neighborhoods
     or new.evidence is distinct from old.evidence
     or new.classification is distinct from old.classification
     or new.suggested_neighborhood_id is distinct from old.suggested_neighborhood_id then
    v_allowed_resolution := old.decision='pending' and new.decision='accepted' and old.classification in ('ambiguous','no_match') and new.classification='clear' and new.suggested_neighborhood_id is not null and new.listing_id is not distinct from old.listing_id and new.candidate_neighborhoods is not distinct from old.candidate_neighborhoods and new.evidence is not distinct from old.evidence;
    if v_allowed_resolution then
      if coalesce(auth.jwt()->>'aal','') <> 'aal2' or auth.uid() is null then raise exception 'AAL2 required for canonical neighborhood resolution'; end if;
      if not exists (select 1 from public.profiles p where p.id=auth.uid() and lower(coalesce(p.role,'')) in ('admin','ceo')) then raise exception 'Canonical neighborhood resolution requires CEO or admin role'; end if;
      select count(*)::integer,(array_agg(mn.id order by mn.id::text))[1]
      into v_resolution_count,v_resolution_id
      from pg_catalog.jsonb_array_elements_text(old.candidate_neighborhoods) candidate(name)
      join public.market_neighborhoods mn on lower(mn.name)=lower(candidate.name)
      join public.market_sources ms on ms.id=mn.geometry_source_id and ms.code='kml_vitacura_barrios_2026_08_12';
      select e.neighborhood_id into v_evidence_id
      from private.market_neighborhood_resolution_evidence_v1 e
      join public.market_listings l on l.source_listing_id=e.source_listing_id
      where l.id=old.listing_id limit 1;
      if not ((v_resolution_count=1 and v_resolution_id is not distinct from new.suggested_neighborhood_id) or (v_evidence_id is not null and v_evidence_id is not distinct from new.suggested_neighborhood_id)) then raise exception 'Canonical neighborhood resolution is not supported by deterministic evidence'; end if;
    else
      raise exception 'Neighborhood review evidence is immutable';
    end if;
  end if;
  if new.decision is distinct from old.decision then
    if old.decision <> 'pending' or new.decision not in ('accepted','discarded') then raise exception 'Neighborhood review decision transition is invalid'; end if;
    if coalesce(auth.jwt()->>'aal','') <> 'aal2' then raise exception 'AAL2 required for neighborhood review decision'; end if;
    new.reviewer_id:=auth.uid(); new.reviewed_at:=now(); new.updated_at:=now();
  elsif new.reviewer_id is distinct from old.reviewer_id or new.reviewed_at is distinct from old.reviewed_at then
    raise exception 'Neighborhood review audit fields are immutable';
  end if;
  return new;
end;
$function$;
