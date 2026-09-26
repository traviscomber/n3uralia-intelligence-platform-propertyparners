drop policy if exists "market neighborhood review read leaders" on public.market_neighborhood_review_items;
drop policy if exists "market neighborhood review update leaders aal2" on public.market_neighborhood_review_items;

create policy "market neighborhood review read operational leaders"
on public.market_neighborhood_review_items
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and lower(coalesce(p.role,'')) in ('admin','ceo','director','subdirector')
  )
);

create policy "market neighborhood review update operational leaders aal2"
on public.market_neighborhood_review_items
for update
to authenticated
using (
  (select auth.jwt() ->> 'aal') = 'aal2'
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and lower(coalesce(p.role,'')) in ('admin','ceo','director','subdirector')
  )
)
with check (
  (select auth.jwt() ->> 'aal') = 'aal2'
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and lower(coalesce(p.role,'')) in ('admin','ceo','director','subdirector')
  )
);

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
    sig.neighborhood_id,
    sig.neighborhood_name,
    coalesce(sig.resolution_kind,'manual'),
    coalesce(sig.reason,'La evidencia disponible todavía no converge en un único barrio KML.'),
    (sig.neighborhood_id is not null),
    ll.observed_at
  from latest_listing ll
  join latest_review lr using(source_listing_id)
  left join lateral private.resolve_market_neighborhood_signal_v2(ll.id) sig on true
  where ll.status='active' and lr.decision='pending'
  order by case when sig.neighborhood_id is not null then 0 else 1 end,ll.observed_at desc nulls last,ll.source_listing_id;
end;
$function$;

revoke all on function public.get_ceo_market_neighborhood_queue_v1() from public,anon;
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
  v_allowed_human_resolution boolean := false;
  v_system_context boolean := false;
  v_signal record;
begin
  v_system_context := current_user='postgres'
    and current_setting('app.market_neighborhood_system_resolution',true)='v3';

  if new.listing_id is distinct from old.listing_id
     or new.candidate_neighborhoods is distinct from old.candidate_neighborhoods
     or new.evidence is distinct from old.evidence
     or new.classification is distinct from old.classification
     or new.suggested_neighborhood_id is distinct from old.suggested_neighborhood_id then

    if new.listing_id is distinct from old.listing_id
       or new.candidate_neighborhoods is distinct from old.candidate_neighborhoods
       or new.evidence is distinct from old.evidence then
      raise exception 'Neighborhood review evidence is immutable';
    end if;

    v_allowed_human_resolution :=
      old.decision='pending'
      and new.decision='accepted'
      and old.classification in ('ambiguous','no_match')
      and new.classification='clear'
      and new.suggested_neighborhood_id is not null;

    if v_allowed_human_resolution then
      if coalesce(auth.jwt()->>'aal','') <> 'aal2' or auth.uid() is null then
        raise exception 'AAL2 required for canonical neighborhood resolution';
      end if;
      if not exists (
        select 1 from public.profiles p
        where p.id=auth.uid()
          and lower(coalesce(p.role,'')) in ('admin','ceo','director','subdirector')
      ) then
        raise exception 'Canonical neighborhood resolution requires operational leader role';
      end if;

      select count(*)::integer,(array_agg(mn.id order by mn.id::text))[1]
      into v_resolution_count,v_resolution_id
      from pg_catalog.jsonb_array_elements_text(old.candidate_neighborhoods) candidate(name)
      join public.market_neighborhoods mn on lower(mn.name)=lower(candidate.name)
      join public.market_sources ms on ms.id=mn.geometry_source_id and ms.code='kml_vitacura_barrios_2026_08_12';

      select e.neighborhood_id into v_evidence_id
      from private.market_neighborhood_resolution_evidence_v1 e
      join public.market_listings l on l.source_listing_id=e.source_listing_id
      where l.id=old.listing_id
      limit 1;

      if not (
        (v_resolution_count=1 and v_resolution_id is not distinct from new.suggested_neighborhood_id)
        or (v_evidence_id is not null and v_evidence_id is not distinct from new.suggested_neighborhood_id)
      ) then
        raise exception 'Canonical neighborhood resolution is not supported by deterministic evidence';
      end if;
    elsif v_system_context
      and old.decision='pending'
      and new.decision='resolved_by_system'
      and new.classification='clear'
      and new.suggested_neighborhood_id is not null
      and new.resolution_origin='system'
      and new.resolver_version='v3' then
      select * into v_signal
      from private.resolve_market_neighborhood_signal_v2(old.listing_id)
      limit 1;
      if v_signal.neighborhood_id is null
         or v_signal.neighborhood_id is distinct from new.suggested_neighborhood_id then
        raise exception 'System neighborhood resolution no longer matches deterministic evidence';
      end if;
    else
      raise exception 'Neighborhood review evidence is immutable';
    end if;
  end if;

  if new.decision is distinct from old.decision then
    if old.decision <> 'pending' then
      raise exception 'Neighborhood review decision transition is invalid';
    end if;

    if new.decision in ('accepted','discarded') then
      if coalesce(auth.jwt()->>'aal','') <> 'aal2' or auth.uid() is null then
        raise exception 'AAL2 required for neighborhood review decision';
      end if;
      if not exists (
        select 1 from public.profiles p
        where p.id=auth.uid()
          and lower(coalesce(p.role,'')) in ('admin','ceo','director','subdirector')
      ) then
        raise exception 'Neighborhood review decision requires operational leader role';
      end if;
      new.resolution_origin:='human';
      new.resolver_version:=null;
      new.reviewer_id:=auth.uid();
      new.reviewed_at:=now();
      new.updated_at:=now();
    elsif new.decision='resolved_by_system' then
      if not v_system_context then
        raise exception 'System neighborhood resolution requires internal resolver context';
      end if;
      if new.classification<>'clear' or new.suggested_neighborhood_id is null then
        raise exception 'System neighborhood resolution requires a clear canonical suggestion';
      end if;
      new.resolution_origin:='system';
      new.resolver_version:='v3';
      new.reviewer_id:=null;
      new.reviewed_at:=now();
      new.updated_at:=now();
    else
      raise exception 'Neighborhood review decision transition is invalid';
    end if;
  elsif new.reviewer_id is distinct from old.reviewer_id
     or new.reviewed_at is distinct from old.reviewed_at
     or new.resolution_origin is distinct from old.resolution_origin
     or new.resolver_version is distinct from old.resolver_version then
    raise exception 'Neighborhood review audit fields are immutable';
  end if;

  return new;
end;
$function$;

create or replace function private.audit_market_neighborhood_review_decision()
returns trigger
language plpgsql
security definer
set search_path=''
as $function$
begin
  if new.decision is not distinct from old.decision then return new; end if;

  if new.decision='resolved_by_system' then
    if current_user<>'postgres'
       or current_setting('app.market_neighborhood_system_resolution',true)<>'v3'
       or new.resolution_origin<>'system'
       or new.reviewer_id is not null
       or new.reviewed_at is null then
      raise exception 'Invalid system neighborhood resolution audit context';
    end if;
    return new;
  end if;

  if old.decision <> 'pending' or new.decision not in ('accepted','discarded') then
    raise exception 'Invalid neighborhood review decision transition';
  end if;
  if coalesce(auth.jwt()->>'aal','') <> 'aal2' then
    raise exception 'AAL2 required for neighborhood review audit';
  end if;
  if auth.uid() is null or new.reviewer_id is distinct from auth.uid() or new.reviewed_at is null then
    raise exception 'Neighborhood review decision requires authenticated reviewer and timestamp';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id=auth.uid()
      and lower(coalesce(p.role,'')) in ('admin','ceo','director','subdirector')
  ) then
    raise exception 'Neighborhood review decision requires operational leader role';
  end if;

  insert into public.market_neighborhood_review_events(
    review_item_id,previous_decision,decision,reviewer_id,created_at
  ) values (
    new.id,old.decision,new.decision,new.reviewer_id,new.reviewed_at
  );
  return new;
end;
$function$;
