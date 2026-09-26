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
      when learned.neighborhood_id is not null and not coalesce(learned.conflict,false) then learned.neighborhood_id
      else null
    end,
    case
      when sig.neighborhood_id is not null then sig.neighborhood_name
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
      when coalesce(learned.conflict,false) then
        'La inteligencia aprendida encontró patrones históricos que apuntan a más de un barrio. Se mantiene abierto y sin escritura canónica.'
      when learned.neighborhood_id is not null then
        'Patrón territorial aprendido con ' || round((learned.confidence*100)::numeric,1)::text ||
        '% de confianza. Es una sugerencia de revisión: no escribe barrio ni crea asignaciones hasta obtener evidencia determinística o confirmación válida.'
      else 'La evidencia disponible todavía no converge en un único barrio KML.'
    end,
    case
      when sig.neighborhood_id is null then false
      else (
        ll.property_id is null
        or mp.neighborhood_id is null
        or mp.neighborhood_id is not distinct from sig.neighborhood_id
      )
    end,
    ll.observed_at
  from latest_listing ll
  join latest_review lr using(source_listing_id)
  left join public.market_properties mp on mp.id=ll.property_id
  left join lateral private.resolve_market_neighborhood_signal_v2(ll.id) sig on true
  left join lateral private.get_market_learned_neighborhood_candidate_v1(ll.id) learned
    on sig.neighborhood_id is null
  where ll.status='active' and lr.decision='pending'
  order by
    case
      when sig.neighborhood_id is not null
       and (ll.property_id is null or mp.neighborhood_id is null or mp.neighborhood_id is not distinct from sig.neighborhood_id)
      then 0
      when sig.neighborhood_id is null
       and learned.neighborhood_id is not null
       and not coalesce(learned.conflict,false)
      then 1
      else 2
    end,
    ll.observed_at desc nulls last,
    ll.source_listing_id;
end;
$function$;

revoke all on function public.get_ceo_market_neighborhood_queue_v1() from public,anon;
grant execute on function public.get_ceo_market_neighborhood_queue_v1() to authenticated;

comment on function public.get_ceo_market_neighborhood_queue_v1() is
'Operational neighborhood review inbox. Deterministic evidence remains actionable. Learned alias evidence is surfaced only as a noncanonical advisory signal and never sets can_decide=true.';
