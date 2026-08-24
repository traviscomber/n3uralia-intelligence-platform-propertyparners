drop policy if exists "market neighborhood review update leaders" on public.market_neighborhood_review_items;
drop policy if exists "market neighborhood review update requires aal2" on public.market_neighborhood_review_items;
drop policy if exists "market neighborhood review update leaders aal2" on public.market_neighborhood_review_items;

create policy "market neighborhood review update leaders aal2"
on public.market_neighborhood_review_items
for update
to authenticated
using (
  (select auth.jwt() ->> 'aal') = 'aal2'
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin','ceo')
  )
)
with check (
  (select auth.jwt() ->> 'aal') = 'aal2'
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin','ceo')
  )
);

create or replace function private.enforce_market_neighborhood_review_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.listing_id is distinct from old.listing_id
     or new.classification is distinct from old.classification
     or new.suggested_neighborhood_id is distinct from old.suggested_neighborhood_id
     or new.candidate_neighborhoods is distinct from old.candidate_neighborhoods
     or new.evidence is distinct from old.evidence then
    raise exception 'Neighborhood review evidence is immutable';
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
$$;

revoke all on function private.enforce_market_neighborhood_review_update() from public;

drop trigger if exists trg_enforce_market_neighborhood_review_update on public.market_neighborhood_review_items;
create trigger trg_enforce_market_neighborhood_review_update
before update on public.market_neighborhood_review_items
for each row
execute function private.enforce_market_neighborhood_review_update();
