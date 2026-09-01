create or replace function private.enforce_market_neighborhood_review_update()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  v_resolution_count integer := 0;
  v_resolution_id uuid;
  v_allowed_resolution boolean := false;
begin
  if new.listing_id is distinct from old.listing_id
     or new.candidate_neighborhoods is distinct from old.candidate_neighborhoods
     or new.evidence is distinct from old.evidence
     or new.classification is distinct from old.classification
     or new.suggested_neighborhood_id is distinct from old.suggested_neighborhood_id then

    v_allowed_resolution :=
      old.decision = 'pending'
      and new.decision = 'accepted'
      and old.classification = 'ambiguous'
      and new.classification = 'clear'
      and old.suggested_neighborhood_id is null
      and new.suggested_neighborhood_id is not null
      and new.listing_id is not distinct from old.listing_id
      and new.candidate_neighborhoods is not distinct from old.candidate_neighborhoods
      and new.evidence is not distinct from old.evidence;

    if v_allowed_resolution then
      if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' or auth.uid() is null then
        raise exception 'AAL2 required for canonical neighborhood resolution';
      end if;

      if not exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and lower(coalesce(p.role, '')) in ('admin','ceo')
      ) then
        raise exception 'Canonical neighborhood resolution requires CEO or admin role';
      end if;

      select count(*)::integer, min(mn.id)
      into v_resolution_count, v_resolution_id
      from pg_catalog.jsonb_array_elements_text(old.candidate_neighborhoods) candidate(name)
      join public.market_neighborhoods mn
        on pg_catalog.lower(mn.name) = pg_catalog.lower(candidate.name)
      join public.market_sources ms
        on ms.id = mn.geometry_source_id
       and ms.code = 'kml_vitacura_barrios_2026_08_12';

      if v_resolution_count <> 1 or v_resolution_id is distinct from new.suggested_neighborhood_id then
        raise exception 'Canonical neighborhood resolution is not uniquely supported by the Property Partners KML';
      end if;
    else
      raise exception 'Neighborhood review evidence is immutable';
    end if;
  end if;

  if new.decision is distinct from old.decision then
    if old.decision <> 'pending' or new.decision not in ('accepted','discarded') then
      raise exception 'Neighborhood review decision transition is invalid';
    end if;

    if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
      raise exception 'AAL2 required for neighborhood review decision';
    end if;

    new.reviewer_id := auth.uid();
    new.reviewed_at := pg_catalog.now();
    new.updated_at := pg_catalog.now();
  elsif new.reviewer_id is distinct from old.reviewer_id
     or new.reviewed_at is distinct from old.reviewed_at then
    raise exception 'Neighborhood review audit fields are immutable';
  end if;

  return new;
end;
$function$;
