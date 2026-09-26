create or replace function private.refresh_market_neighborhood_signal_quality_v1()
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_rows integer:=0;
begin
  create temporary table tmp_signal_quality on commit drop as
  with source as (
    select id from public.market_sources
    where code='portal-inmobiliario-vitacura-portal-houses'
    limit 1
  ), linked as (
    select l.id,l.source_listing_id,mp.neighborhood_id as canonical_neighborhood_id
    from public.market_current_listings l
    join public.market_properties mp on mp.id=l.property_id
    where l.source_id=(select id from source)
      and l.status in ('active','observed')
      and mp.neighborhood_id is not null
  ), resolver_signals as (
    select
      coalesce(r.resolution_kind,'none') as signal_code,
      count(*) filter(where r.neighborhood_id is not null)::integer as sample_size,
      count(*) filter(where r.neighborhood_id=x.canonical_neighborhood_id)::integer as correct_count,
      count(*) filter(where r.neighborhood_id is not null and r.neighborhood_id<>x.canonical_neighborhood_id)::integer as wrong_count
    from linked x
    left join lateral private.resolve_market_neighborhood_signal_v2(x.id) r on true
    group by coalesce(r.resolution_kind,'none')
  ), learned as (
    select
      'learned_address_alias_v1'::text as signal_code,
      count(*) filter(where c.neighborhood_id is not null and not coalesce(c.conflict,false))::integer as sample_size,
      count(*) filter(where c.neighborhood_id=x.canonical_neighborhood_id and not coalesce(c.conflict,false))::integer as correct_count,
      count(*) filter(where c.neighborhood_id is not null and c.neighborhood_id<>x.canonical_neighborhood_id and not coalesce(c.conflict,false))::integer as wrong_count
    from linked x
    left join lateral private.get_market_learned_neighborhood_candidate_v1(x.id) c on true
  ), poi as (
    select
      'portal_nearby_poi_consensus_v1'::text as signal_code,
      count(*) filter(where c.neighborhood_id is not null and not coalesce(c.conflict,false))::integer as sample_size,
      count(*) filter(where c.neighborhood_id=x.canonical_neighborhood_id and not coalesce(c.conflict,false))::integer as correct_count,
      count(*) filter(where c.neighborhood_id is not null and c.neighborhood_id<>x.canonical_neighborhood_id and not coalesce(c.conflict,false))::integer as wrong_count
    from linked x
    left join lateral private.get_market_nearby_poi_neighborhood_candidate_v1(x.id) c on true
  ), near_boundary as (
    select
      'near_boundary_kml_advisory'::text as signal_code,
      count(*) filter(where c.advisory)::integer as sample_size,
      count(*) filter(where c.advisory and c.neighborhood_id=x.canonical_neighborhood_id)::integer as correct_count,
      count(*) filter(where c.advisory and c.neighborhood_id<>x.canonical_neighborhood_id)::integer as wrong_count
    from linked x
    left join lateral private.get_market_near_boundary_kml_candidate_v1(x.id) c on true
  ), combined as (
    select * from resolver_signals where signal_code<>'none'
    union all select * from learned
    union all select * from poi
    union all select * from near_boundary
  ), scored as (
    select
      signal_code,
      sample_size,
      correct_count,
      wrong_count,
      case when sample_size>0 then correct_count::numeric/sample_size else null end as precision,
      case when sample_size>0 then
        greatest(
          0::numeric,
          least(
            1::numeric,
            (
              (
                correct_count::numeric/sample_size
                + (1.96*1.96)/(2*sample_size)
                - 1.96*sqrt(
                  (correct_count::numeric/sample_size)*(1-correct_count::numeric/sample_size)/sample_size
                  + (1.96*1.96)/(4*sample_size*sample_size)
                )
              )
              /
              (1 + (1.96*1.96)/sample_size)
            )
          )
        )
        else null end as wilson_lower_95
    from combined
  )
  select
    signal_code,
    sample_size,
    correct_count,
    wrong_count,
    precision,
    wilson_lower_95,
    false::boolean as auto_write_eligible,
    case
      when signal_code='point_in_kml' then 'Deterministic geometry authority is governed separately by canonical KML uniqueness, not by statistical promotion.'
      when sample_size<50 then 'Secondary signal remains advisory: insufficient calibration sample.'
      when coalesce(wilson_lower_95,0)<0.995 then 'Secondary signal remains advisory: 95% precision lower bound is below 99.5%.'
      else 'Secondary signal remains advisory by policy; evidence may support review prioritization only.'
    end as policy_reason
  from scored;

  insert into private.market_neighborhood_signal_quality_v1(
    signal_code,sample_size,correct_count,wrong_count,precision,wilson_lower_95,
    auto_write_eligible,policy_reason,refreshed_at
  )
  select
    signal_code,sample_size,correct_count,wrong_count,precision,wilson_lower_95,
    auto_write_eligible,policy_reason,now()
  from tmp_signal_quality
  on conflict(signal_code) do update set
    sample_size=excluded.sample_size,
    correct_count=excluded.correct_count,
    wrong_count=excluded.wrong_count,
    precision=excluded.precision,
    wilson_lower_95=excluded.wilson_lower_95,
    auto_write_eligible=false,
    policy_reason=excluded.policy_reason,
    refreshed_at=excluded.refreshed_at;

  get diagnostics v_rows=row_count;

  delete from private.market_neighborhood_signal_quality_v1 q
  where not exists(select 1 from tmp_signal_quality t where t.signal_code=q.signal_code);

  return jsonb_build_object(
    'signals',(select count(*) from tmp_signal_quality),
    'rows_written',v_rows,
    'auto_write_eligible',0,
    'generated_at',now()
  );
end;
$function$;

revoke all on function private.refresh_market_neighborhood_signal_quality_v1() from public,anon,authenticated;

comment on function private.refresh_market_neighborhood_signal_quality_v1() is
'Backtests resolver, learned alias, Portal POI and near-boundary KML advisory signals against linked canonical properties. Observational only; never grants write authority.';
