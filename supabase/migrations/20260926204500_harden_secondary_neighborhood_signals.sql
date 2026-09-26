-- Harden secondary neighborhood signals.
-- Only exact Portal coordinate -> canonical KML may auto-resolve.
-- Learned address aliases are retrained exclusively from point-in-KML truth.

create or replace function private.auto_resolve_market_neighborhood_review_v3(p_review_id uuid)
returns boolean
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_review record;
  v_listing record;
  v_signal record;
  v_property_id uuid;
  v_previous_neighborhood uuid;
  v_after_neighborhood uuid;
  v_correction_ready boolean:=false;
  v_action text;
begin
  perform pg_catalog.set_config('app.market_neighborhood_system_resolution','v3',true);

  select r.id,r.listing_id,r.decision
  into v_review
  from public.market_neighborhood_review_items r
  where r.id=p_review_id
  for update;
  if v_review.id is null or v_review.decision<>'pending' then return false; end if;

  select l.id,l.source_listing_id,l.property_id
  into v_listing
  from public.market_listings l
  where l.id=v_review.listing_id;
  if v_listing.id is null then return false; end if;

  select * into v_signal
  from private.resolve_market_neighborhood_signal_v2(v_listing.id)
  limit 1;

  if v_signal.neighborhood_id is null then return false; end if;

  -- Error-minimization gate: memory, text, CBRS, learned aliases and POI
  -- signals remain advisory. Only a unique canonical KML polygon hit may
  -- transition a review item automatically.
  if v_signal.resolution_kind is distinct from 'point_in_kml' then
    return false;
  end if;

  v_property_id:=v_listing.property_id;
  if v_property_id is not null then
    select mp.neighborhood_id into v_previous_neighborhood
    from public.market_properties mp
    where mp.id=v_property_id;

    if v_previous_neighborhood is not null
       and v_previous_neighborhood is distinct from v_signal.neighborhood_id then
      select exists(
        select 1
        from private.market_neighborhood_resolution_evidence_v1 e
        where e.source_listing_id=v_listing.source_listing_id
          and e.neighborhood_id=v_signal.neighborhood_id
          and lower(coalesce(e.evidence->>'correction_ready','false'))='true'
      ) into v_correction_ready;
      if not v_correction_ready then return false; end if;
    end if;
  end if;

  update public.market_neighborhood_review_items
  set classification='clear',
      suggested_neighborhood_id=v_signal.neighborhood_id,
      decision='resolved_by_system',
      resolution_origin='system',
      resolver_version='v3',
      reviewer_id=null,
      reviewed_at=now(),
      updated_at=now()
  where id=p_review_id and decision='pending';
  if not found then return false; end if;

  if v_property_id is null then
    v_action:='listing_territory_resolved';
  else
    select mp.neighborhood_id into v_after_neighborhood
    from public.market_properties mp
    where mp.id=v_property_id;
    if v_previous_neighborhood is null and v_after_neighborhood=v_signal.neighborhood_id then
      v_action:='canonical_assigned';
    elsif v_previous_neighborhood is distinct from v_signal.neighborhood_id and v_after_neighborhood=v_signal.neighborhood_id then
      v_action:='canonical_corrected';
    else
      v_action:='canonical_already_correct';
    end if;
  end if;

  insert into private.market_neighborhood_resolution_audit_v3(
    listing_id,source_listing_id,review_item_id,property_id,action,
    previous_neighborhood_id,resolved_neighborhood_id,resolution_kind,resolver_version,evidence
  ) values (
    v_listing.id,v_listing.source_listing_id,p_review_id,v_property_id,v_action,
    v_previous_neighborhood,v_signal.neighborhood_id,v_signal.resolution_kind,'v3',
    coalesce(v_signal.evidence,'{}'::jsonb) || jsonb_build_object('reason',v_signal.reason)
  );

  return true;
end;
$function$;

revoke all on function private.auto_resolve_market_neighborhood_review_v3(uuid) from public,anon,authenticated;

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
      and sig.resolution_kind='point_in_kml'
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
    and support_rows::numeric/nullif(total_rows,0)>=0.98;

  insert into private.market_neighborhood_learned_aliases_v1(
    alias_key,neighborhood_id,support_rows,total_rows,confidence,source,evidence,refreshed_at
  )
  select
    a.alias_key,
    a.neighborhood_id,
    a.support_rows,
    a.total_rows,
    a.confidence,
    'point_in_kml_portal_houses',
    jsonb_build_object(
      'method','learned_address_alias_v2',
      'neighborhood_name',a.neighborhood_name,
      'support_rows',a.support_rows,
      'total_rows',a.total_rows,
      'confidence',a.confidence,
      'threshold',0.98,
      'minimum_rows',5,
      'training_truth','point_in_kml',
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
  where x.source in ('live_resolved_portal_houses','point_in_kml_portal_houses')
    and not exists (select 1 from tmp_aliases t where t.alias_key=x.alias_key);

  get diagnostics v_deleted = row_count;

  return jsonb_build_object(
    'aliases',(select count(*) from tmp_aliases),
    'upserted',v_upserted,
    'deleted',v_deleted,
    'training_truth','point_in_kml',
    'generated_at',now()
  );
end;
$function$;

revoke all on function private.refresh_market_neighborhood_learned_aliases_v1() from public,anon,authenticated;

comment on function private.auto_resolve_market_neighborhood_review_v3(uuid) is
'Automatic neighborhood resolution restricted to unique Portal coordinate hits inside canonical Vitacura KML. Secondary signals remain advisory.';

comment on function private.refresh_market_neighborhood_learned_aliases_v1() is
'Rebuilds learned address aliases only from point-in-KML resolved live Portal houses to prevent self-training from weak secondary signals.';
