with candidates as (
  select
    ml.id as listing_id,
    ml.source_listing_id,
    ms.code as source_code,
    lower(extensions.unaccent(coalesce(ml.raw_address, '') || ' ' || coalesce(ml.title, ''))) as combined_text
  from public.market_current_listings ml
  join public.market_sources ms on ms.id = ml.source_id
  where ml.property_id is null
    and ms.code in (
      'portal-inmobiliario-vitacura-portal-houses',
      'portal-inmobiliario-vitacura-portal-apartments',
      'portal-inmobiliario-vitacura-portal-projects'
    )
    and not exists (
      select 1 from public.market_neighborhood_review_items i where i.listing_id = ml.id
    )
), matched as (
  select
    c.listing_id,
    c.source_listing_id,
    c.source_code,
    coalesce(array_agg(mn.id order by length(mn.name) desc) filter (where mn.id is not null), array[]::uuid[]) as matched_ids,
    coalesce(array_agg(mn.name order by length(mn.name) desc) filter (where mn.id is not null), array[]::text[]) as matched_names,
    count(mn.id)::integer as match_count
  from candidates c
  left join public.market_neighborhoods mn
    on c.combined_text like '%' || lower(extensions.unaccent(mn.name)) || '%'
  group by c.listing_id,c.source_listing_id,c.source_code
)
insert into public.market_neighborhood_review_items (
  listing_id,classification,suggested_neighborhood_id,candidate_neighborhoods,evidence
)
select
  m.listing_id,
  case when m.match_count = 1 then 'clear' when m.match_count > 1 then 'ambiguous' else 'no_match' end,
  case when m.match_count = 1 then m.matched_ids[1] else null end,
  to_jsonb(m.matched_names),
  jsonb_build_object(
    'source_listing_id',m.source_listing_id,
    'method','auto_exact_name_v1',
    'canonical_write',false,
    'source_code',m.source_code,
    'backfilled',true,
    'generated_at',now()
  )
from matched m
on conflict (listing_id) do nothing;
