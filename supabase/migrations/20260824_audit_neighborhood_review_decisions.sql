create table if not exists public.market_neighborhood_review_events (
  id uuid primary key default gen_random_uuid(),
  review_item_id uuid not null references public.market_neighborhood_review_items(id) on delete cascade,
  previous_decision text not null check (previous_decision in ('pending','accepted','discarded')),
  decision text not null check (decision in ('accepted','discarded')),
  reviewer_id uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists market_neighborhood_review_events_item_idx
  on public.market_neighborhood_review_events(review_item_id, created_at desc);

alter table public.market_neighborhood_review_events enable row level security;
revoke all on table public.market_neighborhood_review_events from anon, authenticated;
grant select, insert on table public.market_neighborhood_review_events to authenticated;

create policy "market neighborhood review events read admin"
on public.market_neighborhood_review_events
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  )
);

create policy "market neighborhood review events insert admin aal2"
on public.market_neighborhood_review_events
for insert
to authenticated
with check (
  reviewer_id = (select auth.uid())
  and (select auth.jwt()->>'aal') = 'aal2'
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  )
);

create or replace function private.audit_market_neighborhood_review_decision()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.decision is distinct from old.decision then
    if new.decision not in ('accepted','discarded') then
      raise exception 'Invalid neighborhood review decision transition';
    end if;
    if new.reviewer_id is null or new.reviewed_at is null then
      raise exception 'Neighborhood review decision requires reviewer and timestamp';
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

drop trigger if exists trg_audit_market_neighborhood_review_decision on public.market_neighborhood_review_items;
create trigger trg_audit_market_neighborhood_review_decision
after update of decision on public.market_neighborhood_review_items
for each row execute function private.audit_market_neighborhood_review_decision();
