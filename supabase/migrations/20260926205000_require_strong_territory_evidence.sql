-- Human canonical territory decisions must also be supported by strong evidence.
-- Weak candidate lists or advisory resolver outputs are not sufficient.

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

      select * into v_signal
      from private.resolve_market_neighborhood_signal_v2(old.listing_id)
      limit 1;

      -- A human may confirm only strong deterministic evidence. Candidate text by
      -- itself is advisory and cannot become canonical.
      if not (
        (v_evidence_id is not null and v_evidence_id is not distinct from new.suggested_neighborhood_id)
        or (
          v_signal.neighborhood_id is not null
          and v_signal.resolution_kind='point_in_kml'
          and v_signal.neighborhood_id is not distinct from new.suggested_neighborhood_id
        )
      ) then
        raise exception 'Canonical neighborhood resolution requires point-in-KML or validated territorial evidence';
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
         or v_signal.resolution_kind<>'point_in_kml'
         or v_signal.neighborhood_id is distinct from new.suggested_neighborhood_id then
        raise exception 'System neighborhood resolution requires unique point-in-KML evidence';
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

comment on function private.enforce_market_neighborhood_review_update() is
'Guards canonical territory decisions. Candidate text and advisory secondary signals cannot be accepted without point-in-KML or validated territorial evidence.';
