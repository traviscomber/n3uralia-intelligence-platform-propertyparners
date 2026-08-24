-- UAT intelligence for Pedro Pablo: confidence, evidence, exception visibility and known-address metrics.

update public.market_neighborhood_review_items r
set evidence = coalesce(r.evidence, '{}'::jsonb) || jsonb_build_object(
  'confidence_score', case (r.evidence->>'source_listing_id')
    when '4087925792' then 99
    when '4335445638' then 99
    when '2140673187' then 99
    when '4340796354' then 98
    when '4328817258' then 98
    when '2061516525' then 98
    when '4029202872' then 97
    when '1838428351' then 97
    when '4354065840' then 97
    when '4313538294' then 96
    when '4329445598' then 96
    when '2146478711' then 95
    when '4335438310' then 94
    when '2146541437' then 92
    when '2147886509' then 91
    when '4354065940' then 55
    when '2149472381' then 55
    else case when r.classification = 'no_match' then 20 else 90 end
  end,
  'review_priority', case
    when r.classification <> 'clear' then 'mandatory_review'
    when (case (r.evidence->>'source_listing_id')
      when '4087925792' then 99 when '4335445638' then 99 when '2140673187' then 99
      when '4340796354' then 98 when '4328817258' then 98 when '2061516525' then 98
      when '4029202872' then 97 when '1838428351' then 97 when '4354065840' then 97
      when '4313538294' then 96 when '4329445598' then 96 when '2146478711' then 95
      when '4335438310' then 94 when '2146541437' then 92 when '2147886509' then 91
      else 90 end) >= 97 then 'approve_recommended'
    when (case (r.evidence->>'source_listing_id')
      when '4313538294' then 96 when '4329445598' then 96 when '2146478711' then 95
      when '4335438310' then 94 else 0 end) >= 93 then 'quick_review'
    else 'mandatory_review'
  end,
  'geometry_evidence', case
    when r.classification = 'ambiguous' then 'kml_boundary_requires_coordinates_or_human_criterion'
    when r.classification = 'no_match' then 'no_unambiguous_kml_match'
    else 'name_evidence_not_coordinate_verified'
  end,
  'coordinate_status', 'missing_in_source_cut'
)
where r.evidence->>'source_cut' = '2026-08-17';

create or replace function public.market_neighborhood_uat_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select lower(coalesce(p.role, '')) into v_role
  from public.profiles p
  where p.id = auth.uid();

  if v_role not in ('admin', 'ceo') then
    raise exception 'Insufficient permissions';
  end if;

  select jsonb_build_object(
    'known_addresses', (select count(*) from private.market_address_resolution_memory),
    'learned_from_reviews', (select count(*) from private.market_address_resolution_memory where source_kind = 'human_review'),
    'reuse_hits', (select coalesce(sum(hit_count), 0) from private.market_address_resolution_memory),
    'clear_pending', (select count(*) from public.market_neighborhood_review_items where classification = 'clear' and decision = 'pending'),
    'approve_recommended', (select count(*) from public.market_neighborhood_review_items where classification = 'clear' and decision = 'pending' and coalesce((evidence->>'confidence_score')::int, 0) >= 97),
    'quick_review', (select count(*) from public.market_neighborhood_review_items where classification = 'clear' and decision = 'pending' and coalesce((evidence->>'confidence_score')::int, 0) between 93 and 96),
    'mandatory_clear_review', (select count(*) from public.market_neighborhood_review_items where classification = 'clear' and decision = 'pending' and coalesce((evidence->>'confidence_score')::int, 0) < 93),
    'ambiguous', (select count(*) from public.market_neighborhood_review_items where classification = 'ambiguous' and decision = 'pending'),
    'no_match', (select count(*) from public.market_neighborhood_review_items where classification = 'no_match' and decision = 'pending'),
    'reviewed', (select count(*) from public.market_neighborhood_review_items where decision <> 'pending')
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.market_neighborhood_uat_snapshot() from public, anon;
grant execute on function public.market_neighborhood_uat_snapshot() to authenticated;
