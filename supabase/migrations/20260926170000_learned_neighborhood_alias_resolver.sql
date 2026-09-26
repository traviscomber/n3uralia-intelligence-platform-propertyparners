create table if not exists private.market_neighborhood_learned_aliases_v1 (
  alias_key text primary key,
  neighborhood_id uuid not null references public.market_neighborhoods(id),
  support_rows integer not null,
  total_rows integer not null,
  confidence numeric not null,
  source text not null default 'live_resolved_portal_houses',
  evidence jsonb not null default '{}'::jsonb,
  refreshed_at timestamptz not null default now(),
  check (support_rows >= 0),
  check (total_rows >= support_rows),
  check (confidence >= 0 and confidence <= 1)
);

revoke all on table private.market_neighborhood_learned_aliases_v1 from public,anon,authenticated;

create or replace function private.refresh_market_neighborhood_learned_aliases_v1()
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_upserted integer := 0;
  v_deleted integer := 0;
begin
  create temporary table tmp_aliases on commit drop as
  with source as (
    select id
    from public.market_sources
    where code='portal-inmobiliario-vitacura-portal-houses'
    limit 1
  ), live as (
    select
      l.id,
      l.source_listing_id,
      l.raw_address,
      sig.neighborhood_id,
      sig.neighborhood_name
    from public.market_current_listings l
    left join lateral private.resolve_market_neighborhood_signal_v2(l.id) sig on true
    where l.source_id=(select id from source)
      and l.status in ('active','observed')
      and sig.neighborhood_id is not null
  ), tokens as (
    select
      l.neighborhood_id,
      l.neighborhood_name,
      lower(extensions.unaccent(btrim(token))) as alias_key
    from live l,
         lateral regexp_split_to_table(coalesce(l.raw_address,''), ',') token
  ), filtered as (
    select *
    from tokens
    where length(alias_key) between 4 and 80
      and alias_key not in (
        'vitacura','rm (metropolitana)','region metropolitana',
        'región metropolitana','chile','santiago'
      )
      and alias_key !~ '^[0-9 ]+$'
  ), stats as (
    select
      alias_key,
      neighborhood_id,
      neighborhood_name,
      count(*)::integer as support_rows,
      sum(count(*)) over(partition by alias_key)::integer as total_rows,
      row_number() over(
        partition by alias_key
        order by count(*) desc, neighborhood_name, neighborhood_id::text
      ) as rn
    from filtered
    group by alias_key,neighborhood_id,neighborhood_name
  )
  select
    alias_key,
    neighborhood_id,
    support_rows,
    total_rows,
    support_rows::numeric/nullif(total_rows,0) as confidence,
    neighborhood_name
  from stats
  where rn=1
    and total_rows>=5
    and support_rows::numeric/nullif(total_rows,0)>=0.95;

  insert into private.market_neighborhood_learned_aliases_v1(
    alias_key,neighborhood_id,support_rows,total_rows,confidence,source,evidence,refreshed_at
  )
  select
    a.alias_key,
    a.neighborhood_id,
    a.support_rows,
    a.total_rows,
    a.confidence,
    'live_resolved_portal_houses',
    jsonb_build_object(
      'method','learned_address_alias_v1',
      'neighborhood_name',a.neighborhood_name,
      'support_rows',a.support_rows,
      'total_rows',a.total_rows,
      'confidence',a.confidence,
      'threshold',0.95,
      'minimum_rows',5,
      'canonical_write',false
    ),
    now()
  from tmp_aliases a
  on conflict (alias_key) do update set
    neighborhood_id=excluded.neighborhood_id,
    support_rows=excluded.support_rows,
    total_rows=excluded.total_rows,
    confidence=excluded.confidence,
    source=excluded.source,
    evidence=excluded.evidence,
    refreshed_at=excluded.refreshed_at;

  get diagnostics v_upserted = row_count;

  delete from private.market_neighborhood_learned_aliases_v1 x
  where x.source='live_resolved_portal_houses'
    and not exists (select 1 from tmp_aliases t where t.alias_key=x.alias_key);

  get diagnostics v_deleted = row_count;

  return jsonb_build_object(
    'aliases', (select count(*) from tmp_aliases),
    'upserted', v_upserted,
    'deleted', v_deleted,
    'generated_at', now()
  );
end;
$function$;

revoke all on function private.refresh_market_neighborhood_learned_aliases_v1() from public,anon,authenticated;

create or replace function private.get_market_learned_neighborhood_candidate_v1(p_listing_id uuid)
returns table (
  neighborhood_id uuid,
  neighborhood_name text,
  confidence numeric,
  aliases jsonb,
  conflict boolean
)
language sql
security definer
set search_path=''
as $function$
  with listing as (
    select l.raw_address
    from public.market_listings l
    join public.market_sources s on s.id=l.source_id
    where l.id=p_listing_id
      and s.code='portal-inmobiliario-vitacura-portal-houses'
  ), tokens as (
    select distinct lower(extensions.unaccent(btrim(token))) as alias_key
    from listing,
         lateral regexp_split_to_table(coalesce(raw_address,''), ',') token
    where length(btrim(token)) between 4 and 80
  ), matches as (
    select
      a.neighborhood_id,
      mn.name as neighborhood_name,
      a.alias_key,
      a.confidence,
      a.support_rows,
      a.total_rows
    from tokens t
    join private.market_neighborhood_learned_aliases_v1 a using(alias_key)
    join public.market_neighborhoods mn on mn.id=a.neighborhood_id
  ), roll as (
    select
      count(distinct neighborhood_id) as neighborhood_count,
      min(neighborhood_id::text)::uuid as only_neighborhood_id,
      max(confidence) as max_confidence,
      jsonb_agg(
        jsonb_build_object(
          'alias',alias_key,
          'neighborhood',neighborhood_name,
          'confidence',confidence,
          'support_rows',support_rows,
          'total_rows',total_rows
        )
        order by confidence desc,alias_key
      ) as evidence
    from matches
  )
  select
    case when r.neighborhood_count=1 then r.only_neighborhood_id else null end,
    case when r.neighborhood_count=1 then mn.name else null end,
    r.max_confidence,
    coalesce(r.evidence,'[]'::jsonb),
    (r.neighborhood_count>1)
  from roll r
  left join public.market_neighborhoods mn on mn.id=r.only_neighborhood_id;
$function$;

revoke all on function private.get_market_learned_neighborhood_candidate_v1(uuid) from public,anon,authenticated;

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
  ) then
    raise exception 'CEO or admin role required';
  end if;

  return query
  with source as (
    select id
    from public.market_sources
    where code='portal-inmobiliario-vitacura-portal-houses'
    limit 1
  ), latest_listing as (
    select distinct on (l.source_listing_id)
      l.id,l.source_listing_id,l.raw_address,l.title,l.url,l.status,l.observed_at
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
    coalesce(sig.neighborhood_id,case when learned.conflict=false then learned.neighborhood_id else null end),
    coalesce(sig.neighborhood_name,case when learned.conflict=false then learned.neighborhood_name else null end),
    case
      when sig.neighborhood_id is not null then coalesce(sig.resolution_kind,'manual')
      when learned.neighborhood_id is not null and learned.conflict=false then 'learned_address_alias_v1'
      else 'manual'
    end,
    case
      when sig.neighborhood_id is not null then coalesce(sig.reason,'La evidencia determinística converge en un barrio KML.')
      when learned.neighborhood_id is not null and learned.conflict=false then
        'Patrón histórico de dirección: ' || learned.neighborhood_name ||
        ' · confianza ' || round(learned.confidence*100,1)::text ||
        '%. Señal aprendida read-only; requiere validación antes de escribir barrio canónico.'
      when learned.conflict=true then
        'La memoria territorial aprendida encuentra señales para más de un barrio. El caso permanece en revisión humana.'
      else 'La evidencia disponible todavía no converge en un único barrio KML.'
    end,
    (sig.neighborhood_id is not null),
    ll.observed_at
  from latest_listing ll
  join latest_review lr using(source_listing_id)
  left join lateral private.resolve_market_neighborhood_signal_v2(ll.id) sig on true
  left join lateral private.get_market_learned_neighborhood_candidate_v1(ll.id) learned on sig.neighborhood_id is null
  where ll.status='active' and lr.decision='pending'
  order by
    case
      when sig.neighborhood_id is not null then 0
      when learned.neighborhood_id is not null and learned.conflict=false then 1
      else 2
    end,
    ll.observed_at desc nulls last,
    ll.source_listing_id;
end;
$function$;

revoke all on function public.get_ceo_market_neighborhood_queue_v1() from public,anon;
grant execute on function public.get_ceo_market_neighborhood_queue_v1() to authenticated;
