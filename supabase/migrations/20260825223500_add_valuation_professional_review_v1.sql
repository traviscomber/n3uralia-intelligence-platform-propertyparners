create or replace function public.valuation_professional_review_v1(p_case_id uuid)
returns jsonb
language sql
stable
security definer
set search_path=public,private,pg_temp
as $function$
with vc as (
  select * from public.valuation_cases where id=p_case_id
), cmp as (
  select
    count(*) filter(where selected) selected_n,
    count(*) filter(where selected and lower(coalesce(source_type,'')) like '%cbrs%') cbrs_n,
    count(*) filter(where selected and lower(coalesce(source_type,'')) not like '%cbrs%') offer_n,
    count(*) filter(where selected and coalesce(array_length(contradictions,1),0)>0) contradiction_n,
    avg(price_uf_m2) filter(where selected and price_uf_m2>0) avg_uf_m2,
    percentile_cont(.5) within group(order by price_uf_m2) filter(where selected and price_uf_m2>0) median_uf_m2,
    min(price_uf_m2) filter(where selected and price_uf_m2>0) min_uf_m2,
    max(price_uf_m2) filter(where selected and price_uf_m2>0) max_uf_m2,
    max(source_observed_at) filter(where selected) freshest_observed_at,
    min(source_observed_at) filter(where selected) oldest_observed_at,
    avg(similarity_score) filter(where selected) avg_similarity
  from public.valuation_comparables where valuation_case_id=p_case_id
), adv as (
  select case when exists(select 1 from vc where neighborhood='Lo Curro')
    then public.valuation_house_lo_curro_advisory_v2(p_case_id)
    else jsonb_build_object('available',false,'reason','not_lo_curro','nonBinding',true)
  end advisory
), s as (
  select vc.*,cmp.*,
    case when cmp.median_uf_m2>0 then round(((cmp.max_uf_m2-cmp.min_uf_m2)/cmp.median_uf_m2*100)::numeric,1) end dispersion_pct,
    case when cmp.freshest_observed_at is not null then greatest(0,extract(day from now()-cmp.freshest_observed_at))::int end freshness_days
  from vc cross join cmp
)
select case when not exists(select 1 from vc) then jsonb_build_object('available',false,'reason','case_not_found') else (
select jsonb_build_object(
  'available',true,
  'caseId',id,
  'officialValueUf',estimated_value_uf,
  'officialRangeUf',jsonb_build_object('low',low_value_uf,'high',high_value_uf),
  'methodologyVersion',methodology_version,
  'caseConfidence',confidence,
  'evidence',jsonb_build_object(
    'selectedComparables',coalesce(selected_n,0),
    'cbrsComparables',coalesce(cbrs_n,0),
    'offerComparables',coalesce(offer_n,0),
    'medianUfM2',round(median_uf_m2::numeric,1),
    'averageUfM2',round(avg_uf_m2::numeric,1),
    'dispersionPct',dispersion_pct,
    'averageSimilarity',round(avg_similarity::numeric,3),
    'freshnessDays',freshness_days,
    'contradictions',coalesce(contradiction_n,0)
  ),
  'quality',jsonb_build_object(
    'grade',case
      when coalesce(selected_n,0)>=3 and coalesce(cbrs_n,0)>=2 and coalesce(dispersion_pct,999)<=30 and coalesce(contradiction_n,0)=0 then 'A'
      when coalesce(selected_n,0)>=3 and coalesce(cbrs_n,0)>=1 and coalesce(dispersion_pct,999)<=45 then 'B'
      when coalesce(selected_n,0)>=3 then 'C'
      else 'D' end,
    'status',case
      when coalesce(selected_n,0)<3 then 'BLOCK_REVIEW'
      when coalesce(contradiction_n,0)>0 then 'REVIEW_CONTRADICTIONS'
      when coalesce(dispersion_pct,0)>45 then 'REVIEW_DISPERSION'
      when freshness_days is not null and freshness_days>365 then 'REVIEW_FRESHNESS'
      else 'READY_FOR_PROFESSIONAL_REVIEW' end,
    'reasons',jsonb_strip_nulls(jsonb_build_object(
      'sample',case when coalesce(selected_n,0)<3 then 'Menos de 3 comparables seleccionados' end,
      'dispersion',case when coalesce(dispersion_pct,0)>45 then 'Dispersión alta entre comparables' end,
      'contradictions',case when coalesce(contradiction_n,0)>0 then contradiction_n||' comparables con contradicciones' end,
      'freshness',case when freshness_days is not null and freshness_days>365 then 'Evidencia principal antigua' end
    ))
  ),
  'loCurroAdvisory',(select advisory from adv),
  'nonBindingIntelligence',true,
  'changesOfficialValue',false
) from s)
end;
$function$;

revoke all on function public.valuation_professional_review_v1(uuid) from public;
grant execute on function public.valuation_professional_review_v1(uuid) to authenticated,service_role;