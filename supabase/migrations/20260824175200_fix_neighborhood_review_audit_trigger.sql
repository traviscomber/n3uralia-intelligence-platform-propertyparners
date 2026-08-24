create or replace function private.audit_market_neighborhood_review_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.decision is distinct from old.decision then
    if old.decision <> 'pending' or new.decision not in ('accepted','discarded') then
      raise exception 'Invalid neighborhood review decision transition';
    end if;
    if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
      raise exception 'AAL2 required for neighborhood review audit';
    end if;
    if auth.uid() is null or new.reviewer_id is distinct from auth.uid() or new.reviewed_at is null then
      raise exception 'Neighborhood review decision requires authenticated reviewer and timestamp';
    end if;
    if not exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin','ceo')
    ) then
      raise exception 'Neighborhood review decision requires leader role';
    end if;

    insert into public.market_neighborhood_review_events (
      review_item_id,
      previous_decision,
      decision,
      reviewer_id,
      created_at
    ) values (
      new.id,
      old.decision,
      new.decision,
      new.reviewer_id,
      new.reviewed_at
    );
  end if;
  return new;
end;
$$;

revoke all on function private.audit_market_neighborhood_review_decision() from public, anon, authenticated;
