-- Reconciliation migration for the final approved Lo Curro regime runtime state.
-- Idempotent by design: production already contains these objects from supervised migrations.
-- Champion/official valuation remains canonical; all regime output is non-binding shadow evidence.

create schema if not exists private;

create table if not exists private.valuation_house_regime_shadow_predictions (
  id uuid primary key default gen_random_uuid(),
  valuation_case_id uuid not null references public.valuation_cases(id) on delete cascade,
  methodology_version text not null default 'house-regime-router-parallel-shadow-v1',
  barrio text not null,
  feature_key text not null,
  baseline_methodology text,
  baseline_estimated_value_uf numeric,
  challenger_estimated_value_uf numeric not null,
  delta_uf numeric,
  delta_pct numeric,
  evidence jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now(),
  actual_price_uf numeric check (actual_price_uf is null or actual_price_uf > 0),
  actual_observed_at timestamptz,
  resolved_at timestamptz
);

alter table private.valuation_house_regime_shadow_predictions
  add column if not exists actual_price_uf numeric,
  add column if not exists actual_observed_at timestamptz,
  add column if not exists resolved_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='private.valuation_house_regime_shadow_predictions'::regclass
      and conname='valuation_house_regime_shadow_valuation_case_id_methodology_key'
  ) then
    alter table private.valuation_house_regime_shadow_predictions
      add constraint valuation_house_regime_shadow_valuation_case_id_methodology_key
      unique (valuation_case_id, methodology_version, feature_key, challenger_estimated_value_uf);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid='private.valuation_house_regime_shadow_predictions'::regclass
      and conname='valuation_house_regime_shadow_predictions_actual_price_uf_check'
  ) then
    alter table private.valuation_house_regime_shadow_predictions
      add constraint valuation_house_regime_shadow_predictions_actual_price_uf_check
      check (actual_price_uf is null or actual_price_uf > 0);
  end if;
end $$;

create or replace function public.valuation_house_regime_predict_case_v1(p_case_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public', 'private', 'extensions', 'pg_temp'
as $function$
declare
  c public.valuation_cases%rowtype;
  v_feature text;
  v_status text;
  v_eff_area numeric;
  v_age numeric;
  v_log_age numeric;
  v_land_to_built numeric;
  v_topo jsonb;
  v_elev numeric;
  v_slope numeric;
  v_aspect numeric;
  v_pred numeric;
  v_n integer;
  v_source jsonb := '{}'::jsonb;
begin
  select * into c from public.valuation_cases where id=p_case_id;
  if not found then return jsonb_build_object('available',false,'reason','case_not_found'); end if;
  if c.property_type is distinct from 'Casa' then return jsonb_build_object('available',false,'reason','not_house'); end if;
  if coalesce(c.built_area_m2,0)<=0 or coalesce(c.land_area_m2,0)<=0 or c.construction_year is null then
    return jsonb_build_object('available',false,'reason','missing_structural_inputs');
  end if;

  select feature_key,status into v_feature,v_status
  from public.valuation_house_regime_router_rules
  where barrio=c.neighborhood and status='shadow_challenger'
  order by updated_at desc limit 1;
  if v_feature is null then return jsonb_build_object('available',false,'reason','champion_route','barrio',c.neighborhood); end if;

  v_eff_area := c.built_area_m2 + 0.15*c.land_area_m2;
  v_age := greatest(extract(year from coalesce(c.valuation_date,current_date))::int-c.construction_year,0);
  v_log_age := ln(1+v_age);
  v_land_to_built := c.land_area_m2/nullif(c.built_area_m2,0);

  if v_feature='topography' then
    if c.latitude is null or c.longitude is null then return jsonb_build_object('available',false,'reason','missing_coordinates','feature',v_feature); end if;
    v_topo := public.valuation_topography_lookup_v1(c.latitude::double precision,c.longitude::double precision,120);
    if not coalesce((v_topo->>'available')::boolean,false) then return jsonb_build_object('available',false,'reason','missing_topography','feature',v_feature,'topography',v_topo); end if;
    v_elev := nullif(v_topo->>'elevationM','')::numeric;
    v_slope := nullif(v_topo->>'slopeDegrees','')::numeric;
    v_aspect := nullif(v_topo->>'aspectDegrees','')::numeric;
  end if;

  with base as (
    select t.*, (t.built_area_m2+0.15*t.land_area_m2)::numeric effective_area,
      t.price_uf/nullif(t.built_area_m2+0.15*t.land_area_m2,0) effective_rate,
      ln(1+greatest(extract(year from t.transaction_date)::int-t.construction_year,0))::numeric log_age,
      (t.land_area_m2/nullif(t.built_area_m2,0))::numeric land_to_built,
      coalesce(q.has_extreme_price_conflict,false) extreme_conflict,
      s.elevation_m,s.slope_degrees,s.aspect_degrees
    from public.market_cbrs_reference_transactions t
    left join private.market_cbrs_rol_quality_v1 q on q.rol=t.rol
    left join public.valuation_topography_samples s on round(s.latitude::numeric,6)=round(t.latitude::numeric,6) and round(s.longitude::numeric,6)=round(t.longitude::numeric,6) and s.source_version='copernicus-dem-2021-glo90-open-meteo-90m'
    where t.property_type ilike '%casa%' and t.price_uf>0 and t.built_area_m2>0 and t.land_area_m2>0 and t.construction_year is not null
      and t.transaction_date < coalesce(c.valuation_date,current_date)
      and public.valuation_pp_kml_barrio_at(t.latitude,t.longitude)=c.neighborhood
  ), qstats as (
    select percentile_cont(.25) within group(order by effective_rate) q1,
      percentile_cont(.5) within group(order by effective_rate) med,
      percentile_cont(.75) within group(order by effective_rate) q3
    from base where not extreme_conflict
  ), train as (
    select b.* from base b cross join qstats q
    where not b.extreme_conflict and b.effective_rate >= greatest(q.q1-1.5*(q.q3-q.q1),q.med/3.0)
  ), sc as (
    select greatest(percentile_cont(.75) within group(order by ln(built_area_m2))-percentile_cont(.25) within group(order by ln(built_area_m2)),.05) sb,
      greatest(percentile_cont(.75) within group(order by ln(land_area_m2))-percentile_cont(.25) within group(order by ln(land_area_m2)),.05) sl,
      greatest(percentile_cont(.75) within group(order by construction_year)-percentile_cont(.25) within group(order by construction_year),5) sy,
      greatest(percentile_cont(.75) within group(order by log_age)-percentile_cont(.25) within group(order by log_age),.15) sla,
      greatest(percentile_cont(.75) within group(order by land_to_built)-percentile_cont(.25) within group(order by land_to_built),.2) slb,
      greatest(percentile_cont(.75) within group(order by elevation_m)-percentile_cont(.25) within group(order by elevation_m),20) se,
      greatest(percentile_cont(.75) within group(order by slope_degrees)-percentile_cont(.25) within group(order by slope_degrees),2) ss
    from train
  ), ranked as (
    select tr.effective_rate,
      case v_feature
        when 'nonlinear_age' then abs(ln(tr.built_area_m2/c.built_area_m2))/sc.sb + abs(ln(tr.land_area_m2/c.land_area_m2))/sc.sl + abs(tr.log_age-v_log_age)/sc.sla + extract(year from age(coalesce(c.valuation_date,current_date),tr.transaction_date))/10
        when 'land_dominance' then abs(ln(tr.built_area_m2/c.built_area_m2))/sc.sb + abs(ln(tr.land_area_m2/c.land_area_m2))/sc.sl + abs(tr.construction_year-c.construction_year)/sc.sy + abs(tr.land_to_built-v_land_to_built)/sc.slb + extract(year from age(coalesce(c.valuation_date,current_date),tr.transaction_date))/10
        when 'topography' then abs(ln(tr.built_area_m2/c.built_area_m2))/sc.sb + abs(ln(tr.land_area_m2/c.land_area_m2))/sc.sl + abs(tr.construction_year-c.construction_year)/sc.sy + extract(year from age(coalesce(c.valuation_date,current_date),tr.transaction_date))/10 + abs(tr.elevation_m-v_elev)/sc.se + abs(tr.slope_degrees-v_slope)/sc.ss + least(abs(tr.aspect_degrees-v_aspect),360-abs(tr.aspect_degrees-v_aspect))/90
        else 1e9
      end d
    from train tr cross join sc
    where (v_feature<>'topography' or (tr.elevation_m is not null and tr.slope_degrees is not null and tr.aspect_degrees is not null))
      and not (c.latitude is not null and c.longitude is not null and round(tr.latitude::numeric,6)=round(c.latitude::numeric,6) and round(tr.longitude::numeric,6)=round(c.longitude::numeric,6))
  ), nearest as (
    select effective_rate,1/(.15+d) w from ranked order by d limit 8
  )
  select count(*)::int, (sum(effective_rate*w)/nullif(sum(w),0))*v_eff_area into v_n,v_pred from nearest;

  if v_n<5 or coalesce(v_pred,0)<=0 then return jsonb_build_object('available',false,'reason','insufficient_training_neighbors','feature',v_feature,'neighbors',v_n); end if;
  v_source := case when v_feature='topography' then jsonb_build_object('topography',v_topo) else '{}'::jsonb end;
  return jsonb_build_object('available',true,'barrio',c.neighborhood,'feature',v_feature,'challengerEstimatedValueUf',round(v_pred,0),'neighbors',v_n,'methodologyVersion','house-regime-router-parallel-shadow-v1','nonBinding',true,'changesChampionWeights',false,'evidence',v_source);
end;$function$;

create or replace function private.valuation_house_regime_capture_case_shadow_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $function$
declare
  v_pred jsonb;
  v_challenger numeric;
  v_baseline numeric;
  v_feature text;
begin
  if new.property_type is distinct from 'Casa'
     or new.methodology_version not in ('property-partners-house-champion-v5','property-partners-valuation-v2-kml-house-robust-v4') then
    return new;
  end if;
  v_pred := public.valuation_house_regime_predict_case_v1(new.id);
  if not coalesce((v_pred->>'available')::boolean,false) then return new; end if;
  v_challenger := nullif(v_pred->>'challengerEstimatedValueUf','')::numeric;
  v_baseline := nullif(new.estimated_value_uf,0);
  v_feature := nullif(v_pred->>'feature','');
  if coalesce(v_challenger,0)<=0 or v_feature is null then return new; end if;
  insert into private.valuation_house_regime_shadow_predictions(
    valuation_case_id,barrio,feature_key,baseline_methodology,baseline_estimated_value_uf,challenger_estimated_value_uf,delta_uf,delta_pct,evidence
  ) values (
    new.id,new.neighborhood,v_feature,new.methodology_version,v_baseline,v_challenger,
    case when v_baseline is null then null else v_challenger-v_baseline end,
    case when coalesce(v_baseline,0)>0 then round(((v_challenger/v_baseline)-1)*100,2) else null end,
    v_pred || jsonb_build_object(
      'caseStatus',new.status,
      'capturedAt',now(),
      'officialResultUnchanged',true,
      'officialRateAnchor',new.evidence->>'rateAnchor',
      'officialBuiltRateUfM2',new.built_rate_uf_m2,
      'officialReviewMode',new.evidence->>'reviewMode'
    )
  ) on conflict do nothing;
  return new;
end;$function$;

drop trigger if exists valuation_cases_regime_shadow_capture on public.valuation_cases;
create trigger valuation_cases_regime_shadow_capture
after insert or update of methodology_version, estimated_value_uf, built_area_m2, land_area_m2, construction_year, latitude, longitude, neighborhood, evidence
on public.valuation_cases
for each row execute function private.valuation_house_regime_capture_case_shadow_v1();

create or replace function public.valuation_house_regime_resolve_actuals_v1()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $function$
declare
  v_holdout integer:=0;
  v_future integer:=0;
begin
  with resolved as (
    select p.id,t.price_uf,t.transaction_date,t.event_key
    from private.valuation_house_regime_shadow_predictions p
    join public.valuation_cases vc on vc.id=p.valuation_case_id
    join public.market_cbrs_reference_transactions t on t.event_key=nullif(vc.evidence->>'subjectHoldoutEventKey','')
    where p.methodology_version='house-regime-router-parallel-shadow-v1'
      and p.actual_price_uf is null and t.price_uf>0
  )
  update private.valuation_house_regime_shadow_predictions p
  set actual_price_uf=r.price_uf, actual_observed_at=r.transaction_date::timestamptz, resolved_at=now(),
      evidence=coalesce(p.evidence,'{}'::jsonb)||jsonb_build_object('actualResolutionSource','subject_holdout_event_key','actualEventKey',r.event_key)
  from resolved r where p.id=r.id;
  get diagnostics v_holdout=row_count;

  with candidates as (
    select p.id,t.price_uf,t.transaction_date,t.event_key,
           row_number() over(partition by p.id order by t.transaction_date,t.event_key) rn
    from private.valuation_house_regime_shadow_predictions p
    join public.valuation_cases vc on vc.id=p.valuation_case_id
    join public.market_cbrs_reference_transactions t on t.rol=vc.rol
    left join public.valuation_cbrs_barrio_quality_stats qs on qs.barrio=p.barrio
    where p.methodology_version='house-regime-router-parallel-shadow-v1'
      and p.actual_price_uf is null and vc.valuation_date is not null
      and t.transaction_date>vc.valuation_date
      and t.transaction_date<=vc.valuation_date+interval '730 days'
      and t.price_uf>0
      and (qs.robust_lower_fence is null or t.built_area_m2 is null or t.land_area_m2 is null or t.built_area_m2<=0 or t.land_area_m2<=0 or t.price_uf/nullif(t.built_area_m2+0.15*t.land_area_m2,0)>=qs.robust_lower_fence)
  ), resolved as (select * from candidates where rn=1)
  update private.valuation_house_regime_shadow_predictions p
  set actual_price_uf=r.price_uf, actual_observed_at=r.transaction_date::timestamptz, resolved_at=now(),
      evidence=coalesce(p.evidence,'{}'::jsonb)||jsonb_build_object('actualResolutionSource','first_clean_future_rol_sale','actualEventKey',r.event_key)
  from resolved r where p.id=r.id;
  get diagnostics v_future=row_count;

  return jsonb_build_object('resolvedHoldout',v_holdout,'resolvedFuture',v_future,'resolvedTotal',v_holdout+v_future,'nonDestructive',true,'changesOfficialValue',false);
end;$function$;

create or replace function public.valuation_house_regime_prospective_scoreboard_v1()
returns table(barrio text,feature_key text,prospective_n bigint,resolved_n bigint,baseline_mape_pct numeric,challenger_mape_pct numeric,baseline_mae_uf numeric,challenger_mae_uf numeric,challenger_win_rate_pct numeric,avg_delta_pct numeric,max_abs_delta_pct numeric,status text)
language sql stable security definer set search_path=public,private,pg_temp as $function$
with p as (
  select s.*,
    case when s.actual_price_uf>0 then abs(s.baseline_estimated_value_uf-s.actual_price_uf)/s.actual_price_uf*100 end baseline_ape,
    case when s.actual_price_uf>0 then abs(s.challenger_estimated_value_uf-s.actual_price_uf)/s.actual_price_uf*100 end challenger_ape,
    case when s.actual_price_uf>0 then abs(s.baseline_estimated_value_uf-s.actual_price_uf) end baseline_ae,
    case when s.actual_price_uf>0 then abs(s.challenger_estimated_value_uf-s.actual_price_uf) end challenger_ae
  from private.valuation_house_regime_shadow_predictions s
  where s.methodology_version='house-regime-router-parallel-shadow-v1'
), a as (
  select barrio,feature_key,count(*) prospective_n,count(actual_price_uf) resolved_n,
    round(avg(baseline_ape) filter(where actual_price_uf>0),2) baseline_mape_pct,
    round(avg(challenger_ape) filter(where actual_price_uf>0),2) challenger_mape_pct,
    round(avg(baseline_ae) filter(where actual_price_uf>0),0) baseline_mae_uf,
    round(avg(challenger_ae) filter(where actual_price_uf>0),0) challenger_mae_uf,
    round(100.0*count(*) filter(where actual_price_uf>0 and challenger_ape<baseline_ape)/nullif(count(*) filter(where actual_price_uf>0),0),1) challenger_win_rate_pct,
    round(avg(delta_pct),2) avg_delta_pct,round(max(abs(delta_pct)),2) max_abs_delta_pct
  from p group by barrio,feature_key
)
select a.*,case when resolved_n>=20 and challenger_mape_pct<baseline_mape_pct and challenger_mae_uf<baseline_mae_uf and challenger_win_rate_pct>=60 then 'PROMOTE_REVIEW' when resolved_n>=10 then 'ADVISORY_REVIEW' when resolved_n>0 then 'ACCUMULATING' else 'WAITING_FOR_ACTUAL' end status
from a order by case when barrio='Lo Curro' then 0 else 1 end,barrio;
$function$;

create or replace function public.valuation_house_regime_prospective_scoreboard_v2()
returns table(barrio text,feature_key text,mode text,prospective_n bigint,resolved_n bigint,baseline_mape_pct numeric,challenger_mape_pct numeric,baseline_mae_uf numeric,challenger_mae_uf numeric,challenger_win_rate_pct numeric,status text)
language sql stable security definer set search_path=public,private,pg_temp as $function$
select s.barrio,s.feature_key,
 case when s.barrio='Lo Curro' and s.feature_key='topography' then 'ACTIVE_ADVISORY_SHADOW' else 'OBSERVATION_ONLY' end mode,
 s.prospective_n,s.resolved_n,s.baseline_mape_pct,s.challenger_mape_pct,s.baseline_mae_uf,s.challenger_mae_uf,s.challenger_win_rate_pct,
 case when s.barrio='Lo Curro' and s.feature_key='topography' and s.resolved_n>=20 and s.challenger_mape_pct<s.baseline_mape_pct and s.challenger_mae_uf<s.baseline_mae_uf and s.challenger_win_rate_pct>=60 then 'PROMOTE_REVIEW'
      when s.barrio='Lo Curro' and s.feature_key='topography' then 'ACCUMULATING_ACTIVE'
      else 'OBSERVING' end status
from public.valuation_house_regime_prospective_scoreboard_v1() s
order by case when s.barrio='Lo Curro' then 0 else 1 end,s.barrio;
$function$;

create or replace function public.valuation_house_regime_focus_v1()
returns jsonb language sql stable security definer set search_path=public,private,pg_temp as $function$
select jsonb_build_object(
 'activeChallenger',jsonb_build_object('barrio','Lo Curro','feature','topography','segment','mid_slope','strongCondition','roughness>=30','mode','ADVISORY_SHADOW','nonBinding',true),
 'observationOnly',jsonb_build_array(jsonb_build_object('barrio','Jardín del Este','feature','nonlinear_age','mode','OBSERVATION_ONLY'),jsonb_build_object('barrio','Club de Polo','feature','land_dominance','mode','OBSERVATION_ONLY')),
 'promotionGate',jsonb_build_object('minResolved',20,'maxMapeVsChampion','lower','maxMaeVsChampion','lower','minWinRatePct',60,'requiresProspectiveEvidence',true),
 'changesChampionWeights',false
);
$function$;

create or replace function public.valuation_house_lo_curro_advisory_v1(p_case_id uuid)
returns jsonb language sql stable security definer set search_path=public,private,pg_temp as $function$
with c as (
 select vc.id,vc.neighborhood,vc.estimated_value_uf,vc.latitude,vc.longitude,vc.status,
        s.challenger_estimated_value_uf,s.delta_pct,s.feature_key,s.evidence,s.captured_at,
        topo.terrain_position,topo.slope_degrees,topo.relative_elevation_m,topo.roughness_m,topo.elevation_m,topo.coord_distance
 from public.valuation_cases vc
 left join lateral (
   select x.* from private.valuation_house_regime_shadow_predictions x
   where x.valuation_case_id=vc.id and x.methodology_version='house-regime-router-parallel-shadow-v1'
   order by x.captured_at desc limit 1
 ) s on true
 left join lateral (
   select ts.terrain_position,ts.slope_degrees,ts.relative_elevation_m,ts.roughness_m,ts.elevation_m,
          sqrt(power(ts.latitude-vc.latitude::double precision,2)+power(ts.longitude-vc.longitude::double precision,2)) coord_distance
   from public.valuation_topography_samples ts
   where vc.latitude is not null and vc.longitude is not null and ts.source_version='copernicus-dem-2021-glo90-open-meteo-90m'
   order by coord_distance limit 1
 ) topo on true
 where vc.id=p_case_id
)
select case
 when not exists(select 1 from c) then jsonb_build_object('available',false,'reason','case_not_found')
 when (select neighborhood from c)<>'Lo Curro' then jsonb_build_object('available',false,'reason','not_lo_curro','nonBinding',true)
 when (select challenger_estimated_value_uf from c) is null then jsonb_build_object('available',false,'reason','no_shadow_prediction','nonBinding',true)
 else (select jsonb_build_object(
   'available',true,'barrio',neighborhood,'feature',feature_key,
   'officialValueUf',estimated_value_uf,'challengerValueUf',challenger_estimated_value_uf,'deltaPct',delta_pct,
   'terrainPosition',terrain_position,
   'topography',jsonb_build_object('elevationM',elevation_m,'slopeDegrees',slope_degrees,'relativeElevationM',relative_elevation_m,'roughnessM',roughness_m),
   'segmentConfidence',case when terrain_position='mid_slope' and roughness_m>=30 then 'strong' when terrain_position='mid_slope' and slope_degrees>=10 then 'promising' when terrain_position='mid_slope' then 'medium' else 'exploratory' end,
   'segmentEvidence',case
      when terrain_position='mid_slope' and roughness_m>=30 then jsonb_build_object('n',12,'baselineMapePct',27.16,'topographyMapePct',12.91,'improvementPp',14.25,'winRatePct',66.7,'walkForward2024',jsonb_build_object('n',4,'baselineMapePct',29.80,'topographyMapePct',18.19,'baselineMaeUf',10219,'topographyMaeUf',6381,'winRatePct',75.0),'walkForward2025',jsonb_build_object('n',8,'baselineMapePct',16.38,'topographyMapePct',9.92,'baselineMaeUf',4578,'topographyMaeUf',3148,'winRatePct',75.0))
      when terrain_position='mid_slope' and slope_degrees>=10 then jsonb_build_object('n',10,'baselineMapePct',24.74,'topographyMapePct',10.85,'improvementPp',13.89,'winRatePct',70.0,'walkForward2024',jsonb_build_object('n',3,'baselineMapePct',14.88,'topographyMapePct',13.96,'baselineMaeUf',4085,'topographyMaeUf',4556,'winRatePct',66.7),'walkForward2025',jsonb_build_object('n',7,'baselineMapePct',18.05,'topographyMapePct',9.07,'baselineMaeUf',4887,'topographyMaeUf',2418,'winRatePct',85.7))
      when terrain_position='mid_slope' then jsonb_build_object('n',24,'baselineMapePct',27.40,'topographyMapePct',20.38,'improvementPp',7.02,'winRatePct',66.7)
      else jsonb_build_object('n',0,'status','insufficient_segment_evidence') end,
   'advisoryEligible',terrain_position='mid_slope' and (roughness_m>=30 or abs(delta_pct)>=15),
   'material',abs(delta_pct)>=15,
   'severity',case when terrain_position='mid_slope' and roughness_m>=30 and abs(delta_pct)>=15 then 'high' when abs(delta_pct)>=15 then 'review' when abs(delta_pct)>=10 then 'attention' else 'aligned' end,
   'message',case when terrain_position='mid_slope' and roughness_m>=30 and abs(delta_pct)>=15 then 'Lo Curro: terreno rugoso en mid-slope tiene evidencia topográfica fuerte y el challenger difiere materialmente. Revisar ambos valores antes de confirmar.' when terrain_position='mid_slope' and slope_degrees>=10 and abs(delta_pct)>=15 then 'Lo Curro: pendiente alta muestra señal prometedora, pero la evidencia es menos estable que la rugosidad. Revisar como apoyo, no como sustitución automática.' when abs(delta_pct)>=15 then 'Lo Curro: challenger topográfico materialmente distinto. Revisión profesional recomendada.' else 'Champion y challenger topográfico están razonablemente alineados.' end,
   'nonBinding',true,'changesOfficialValue',false,'requiresProfessionalReview',abs(delta_pct)>=15
 ) from c)
end;
$function$;

revoke all on function public.valuation_house_regime_predict_case_v1(uuid) from public;
revoke all on function public.valuation_house_regime_resolve_actuals_v1() from public;
revoke all on function public.valuation_house_regime_prospective_scoreboard_v1() from public;
revoke all on function public.valuation_house_regime_prospective_scoreboard_v2() from public;
revoke all on function public.valuation_house_regime_focus_v1() from public;
revoke all on function public.valuation_house_lo_curro_advisory_v1(uuid) from public;
grant execute on function public.valuation_house_regime_predict_case_v1(uuid) to authenticated,service_role;
grant execute on function public.valuation_house_regime_resolve_actuals_v1() to service_role;
grant execute on function public.valuation_house_regime_prospective_scoreboard_v1() to authenticated,service_role;
grant execute on function public.valuation_house_regime_prospective_scoreboard_v2() to authenticated,service_role;
grant execute on function public.valuation_house_regime_focus_v1() to authenticated,service_role;
grant execute on function public.valuation_house_lo_curro_advisory_v1(uuid) to authenticated,service_role;
