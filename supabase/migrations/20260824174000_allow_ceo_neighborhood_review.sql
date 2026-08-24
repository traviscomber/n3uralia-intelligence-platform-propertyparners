drop policy if exists "market neighborhood review read admin" on public.market_neighborhood_review_items;
drop policy if exists "market neighborhood review update admin" on public.market_neighborhood_review_items;
drop policy if exists "market neighborhood review read leaders" on public.market_neighborhood_review_items;
drop policy if exists "market neighborhood review update leaders" on public.market_neighborhood_review_items;

create policy "market neighborhood review read leaders"
on public.market_neighborhood_review_items
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin','ceo')
  )
);

create policy "market neighborhood review update leaders"
on public.market_neighborhood_review_items
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin','ceo')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin','ceo')
  )
);
