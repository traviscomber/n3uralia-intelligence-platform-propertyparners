revoke all on table public.market_neighborhood_review_items from anon, authenticated;
grant select, update on table public.market_neighborhood_review_items to authenticated;

create policy "market neighborhood review update requires aal2"
on public.market_neighborhood_review_items
as restrictive
for update
to authenticated
using ((select auth.jwt()->>'aal') = 'aal2')
with check ((select auth.jwt()->>'aal') = 'aal2');

create or replace function private.enqueue_market_neighborhood_review_item()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  source_code text;
  matched_ids uuid[];
  matched_names text[];
  match_count integer;
  combined_text text;
begin
  if new.property_id is not null then
    return new;
  end if;

  select ms.code into source_code
  from public.market_sources ms
  where ms.id = new.source_id;

  if source_code not in (
    'portal-inmobiliario-vitacura-portal-houses',
    'portal-inmobiliario-vitacura-portal-apartments',
    'portal-inmobiliario-vitacura-portal-projects'
  ) then
    return new;
  end if;

  combined_text := lower(extensions.unaccent(coalesce(new.raw_address, '') || ' ' || coalesce(new.title, '')));

  select
    coalesce(array_agg(mn.id order by length(mn.name) desc), array[]::uuid[]),
    coalesce(array_agg(mn.name order by length(mn.name) desc), array[]::text[]),
    count(*)::integer
  into matched_ids, matched_names, match_count
  from public.market_neighborhoods mn
  where combined_text like '%' || lower(extensions.unaccent(mn.name)) || '%';

  insert into public.market_neighborhood_review_items (
    listing_id,
    classification,
    suggested_neighborhood_id,
    candidate_neighborhoods,
    evidence
  ) values (
    new.id,
    case when match_count = 1 then 'clear' when match_count > 1 then 'ambiguous' else 'no_match' end,
    case when match_count = 1 then matched_ids[1] else null end,
    to_jsonb(matched_names),
    jsonb_build_object(
      'source_listing_id', new.source_listing_id,
      'method', 'auto_exact_name_v1',
      'canonical_write', false,
      'source_code', source_code,
      'generated_at', now()
    )
  )
  on conflict (listing_id) do nothing;

  return new;
end;
$$;

revoke all on function private.enqueue_market_neighborhood_review_item() from public, anon, authenticated;

drop trigger if exists trg_enqueue_market_neighborhood_review_item on public.market_listings;
create trigger trg_enqueue_market_neighborhood_review_item
after insert on public.market_listings
for each row execute function private.enqueue_market_neighborhood_review_item();
