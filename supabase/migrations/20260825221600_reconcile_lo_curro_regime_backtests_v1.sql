-- Reproducible evidence functions for the approved Lo Curro topography regime.
-- These functions are analytical only and never change Champion weights or official valuations.

create or replace function public.valuation_lo_curro_topography_segment_backtest_v1()
returns table(terrain_position text, n bigint, baseline_mape_pct numeric, topography_mape_pct numeric, improvement_pp numeric, baseline_mae_uf numeric, topography_mae_uf numeric, win_rate_pct numeric)
language sql
stable security definer
set search_path to 'public', 'private', 'extensions', 'pg_temp'
as $function$
with base as (
 select t.*,s.elevation_m,s.slope_degrees,s.aspect_degrees,s.relative_elevation_m,s.roughness_m,s.terrain_position,
        (t.built_area_m2+0.15*t.land_area_m2)::numeric effective_area,
        t.price_uf/nullif(t.built_area_m2+0.15*t.land_area_m2,0) effective_rate,
        coalesce(q.has_extreme_price_conflict,false) extreme_conflict
 from public.market_cbrs_reference_transactions t
 join public.valuation_topography_samples s on round(s.latitude::numeric,6)=round(t.latitude::numeric,6) and round(s.longitude::numeric,6)=round(t.longitude::numeric,6) and s.source_version='copernicus-dem-2021-glo90-open-meteo-90m'
 left join private.market_cbrs_rol_quality_v1 q on q.rol=t.rol
 where t.property_type ilike '%casa%' and t.price_uf>0 and t.built_area_m2>0 and t.land_area_m2>0 and t.construction_year is not null and public.valuation_pp_kml_barrio_at(t.latitude,t.longitude)='Lo Curro'
), qstats as (
 select percentile_cont(.25) within group(order by effective_rate) q1, percentile_cont(.5) within group(order by effective_rate) med, percentile_cont(.75) within group(order by effective_rate) q3 from base where transaction_date<date '2024-01-01' and not extreme_conflict
), clean as (
 select b.* from base b cross join qstats q where not b.extreme_conflict and b.effective_rate>=greatest(q.q1-1.5*(q.q3-q.q1),q.med/3.0)
), train as (select * from clean where transaction_date<date '2024-01-01'), test as (select * from clean where transaction_date>=date '2024-01-01' and transaction_date<date '2026-01-01'),
sc as (
 select greatest(percentile_cont(.75) within group(order by ln(built_area_m2))-percentile_cont(.25) within group(order by ln(built_area_m2)),.05) sb,
        greatest(percentile_cont(.75) within group(order by ln(land_area_m2))-percentile_cont(.25) within group(order by ln(land_area_m2)),.05) sl,
        greatest(percentile_cont(.75) within group(order by construction_year)-percentile_cont(.25) within group(order by construction_year),5) sy,
        greatest(percentile_cont(.75) within group(order by elevation_m)-percentile_cont(.25) within group(order by elevation_m),20) se,
        greatest(percentile_cont(.75) within group(order by slope_degrees)-percentile_cont(.25) within group(order by slope_degrees),2) ss,
        greatest(percentile_cont(.75) within group(order by relative_elevation_m)-percentile_cont(.25) within group(order by relative_elevation_m),2) sr,
        greatest(percentile_cont(.75) within group(order by roughness_m)-percentile_cont(.25) within group(order by roughness_m),5) sg from train
), p as (
 select x.*,
   (select sum(effective_rate*w)/sum(w)*x.effective_area from (select effective_rate,1/(.15+d) w from (select tr.effective_rate,abs(ln(tr.built_area_m2/x.built_area_m2))/sc.sb+abs(ln(tr.land_area_m2/x.land_area_m2))/sc.sl+abs(tr.construction_year-x.construction_year)/sc.sy+extract(year from age(x.transaction_date,tr.transaction_date))/10 d from train tr cross join sc where not(round(tr.latitude::numeric,6)=round(x.latitude::numeric,6) and round(tr.longitude::numeric,6)=round(x.longitude::numeric,6))) z order by d limit 8) q) baseline_pred,
   (select sum(effective_rate*w)/sum(w)*x.effective_area from (select effective_rate,1/(.15+d) w from (select tr.effective_rate,abs(ln(tr.built_area_m2/x.built_area_m2))/sc.sb+abs(ln(tr.land_area_m2/x.land_area_m2))/sc.sl+abs(tr.construction_year-x.construction_year)/sc.sy+extract(year from age(x.transaction_date,tr.transaction_date))/10+abs(tr.elevation_m-x.elevation_m)/sc.se+abs(tr.slope_degrees-x.slope_degrees)/sc.ss+abs(tr.relative_elevation_m-x.relative_elevation_m)/sc.sr+abs(tr.roughness_m-x.roughness_m)/sc.sg+least(abs(tr.aspect_degrees-x.aspect_degrees),360-abs(tr.aspect_degrees-x.aspect_degrees))/90 d from train tr cross join sc where not(round(tr.latitude::numeric,6)=round(x.latitude::numeric,6) and round(tr.longitude::numeric,6)=round(x.longitude::numeric,6))) z order by d limit 8) q) topo_pred
 from test x
)
select coalesce(terrain_position,'unknown'),count(*),round((avg(abs(baseline_pred-price_uf)/price_uf)*100)::numeric,2),round((avg(abs(topo_pred-price_uf)/price_uf)*100)::numeric,2),round(((avg(abs(baseline_pred-price_uf)/price_uf)-avg(abs(topo_pred-price_uf)/price_uf))*100)::numeric,2),round(avg(abs(baseline_pred-price_uf))::numeric,0),round(avg(abs(topo_pred-price_uf))::numeric,0),round((100.0*count(*) filter(where abs(topo_pred-price_uf)<abs(baseline_pred-price_uf))/nullif(count(*),0))::numeric,1)
from p group by coalesce(terrain_position,'unknown') order by count(*) desc;
$function$;

create or replace function public.valuation_lo_curro_high_rough_walkforward_weights_v1()
returns jsonb
language sql
stable security definer
set search_path to 'public', 'private', 'extensions', 'pg_temp'
as $function$
with base as (
  select t.*,s.elevation_m,s.slope_degrees,s.aspect_degrees,s.relative_elevation_m,s.roughness_m,s.terrain_position,
         (t.built_area_m2+0.15*t.land_area_m2)::numeric effective_area,
         t.price_uf/nullif(t.built_area_m2+0.15*t.land_area_m2,0) effective_rate,
         coalesce(q.has_extreme_price_conflict,false) extreme_conflict
  from public.market_cbrs_reference_transactions t
  join public.valuation_topography_samples s on round(s.latitude::numeric,6)=round(t.latitude::numeric,6) and round(s.longitude::numeric,6)=round(t.longitude::numeric,6) and s.source_version='copernicus-dem-2021-glo90-open-meteo-90m'
  left join private.market_cbrs_rol_quality_v1 q on q.rol=t.rol
  where t.property_type ilike '%casa%' and t.price_uf>0 and t.built_area_m2>0 and t.land_area_m2>0 and t.construction_year is not null and public.valuation_pp_kml_barrio_at(t.latitude,t.longitude)='Lo Curro'
), qs as (
 select percentile_cont(.25) within group(order by effective_rate) q1,percentile_cont(.5) within group(order by effective_rate) med,percentile_cont(.75) within group(order by effective_rate) q3 from base where transaction_date<date '2024-01-01' and not extreme_conflict
), clean as (
 select b.* from base b cross join qs where not b.extreme_conflict and b.effective_rate>=greatest(q1-1.5*(q3-q1),med/3.0)
), train as (select * from clean where transaction_date<date '2024-01-01'),
 test as (select * from clean where transaction_date>=date '2024-01-01' and transaction_date<date '2026-01-01' and terrain_position='mid_slope' and roughness_m>=30),
 sc as (
 select greatest(percentile_cont(.75) within group(order by ln(built_area_m2))-percentile_cont(.25) within group(order by ln(built_area_m2)),.05) sb,greatest(percentile_cont(.75) within group(order by ln(land_area_m2))-percentile_cont(.25) within group(order by ln(land_area_m2)),.05) sl,greatest(percentile_cont(.75) within group(order by construction_year)-percentile_cont(.25) within group(order by construction_year),5) sy,greatest(percentile_cont(.75) within group(order by elevation_m)-percentile_cont(.25) within group(order by elevation_m),20) se,greatest(percentile_cont(.75) within group(order by slope_degrees)-percentile_cont(.25) within group(order by slope_degrees),2) ss,greatest(percentile_cont(.75) within group(order by relative_elevation_m)-percentile_cont(.25) within group(order by relative_elevation_m),2) sr,greatest(percentile_cont(.75) within group(order by roughness_m)-percentile_cont(.25) within group(order by roughness_m),5) sg from train
), grid as (
 select ws::numeric slope_weight,wr::numeric rough_weight from unnest(array[0.5,0.75,1.0,1.25,1.5]::numeric[]) ws cross join unnest(array[0.5,0.75,1.0,1.25,1.5,2.0]::numeric[]) wr
), preds as (
 select g.slope_weight,g.rough_weight,x.transaction_date,x.price_uf,
 (select sum(effective_rate*w)/sum(w)*x.effective_area from (select effective_rate,1/(.15+d) w from (select tr.effective_rate,abs(ln(tr.built_area_m2/x.built_area_m2))/sc.sb+abs(ln(tr.land_area_m2/x.land_area_m2))/sc.sl+abs(tr.construction_year-x.construction_year)/sc.sy+extract(year from age(x.transaction_date,tr.transaction_date))/10 d from train tr cross join sc where not(round(tr.latitude::numeric,6)=round(x.latitude::numeric,6) and round(tr.longitude::numeric,6)=round(x.longitude::numeric,6))) z order by d limit 8) q) baseline_pred,
 (select sum(effective_rate*w)/sum(w)*x.effective_area from (select effective_rate,1/(.15+d) w from (select tr.effective_rate,abs(ln(tr.built_area_m2/x.built_area_m2))/sc.sb+abs(ln(tr.land_area_m2/x.land_area_m2))/sc.sl+abs(tr.construction_year-x.construction_year)/sc.sy+extract(year from age(x.transaction_date,tr.transaction_date))/10+abs(tr.elevation_m-x.elevation_m)/sc.se+g.slope_weight*abs(tr.slope_degrees-x.slope_degrees)/sc.ss+abs(tr.relative_elevation_m-x.relative_elevation_m)/sc.sr+g.rough_weight*abs(tr.roughness_m-x.roughness_m)/sc.sg+least(abs(tr.aspect_degrees-x.aspect_degrees),360-abs(tr.aspect_degrees-x.aspect_degrees))/90 d from train tr cross join sc where not(round(tr.latitude::numeric,6)=round(x.latitude::numeric,6) and round(tr.longitude::numeric,6)=round(x.longitude::numeric,6))) z order by d limit 8) q) challenger_pred
 from grid g cross join test x
), yearly as (
 select slope_weight,rough_weight,extract(year from transaction_date)::int yr,count(*) n,avg(abs(baseline_pred-price_uf)/price_uf)*100 baseline_mape,avg(abs(challenger_pred-price_uf)/price_uf)*100 challenger_mape,avg(abs(baseline_pred-price_uf)) baseline_mae,avg(abs(challenger_pred-price_uf)) challenger_mae from preds group by 1,2,3
), selected as (
 select slope_weight,rough_weight,row_number() over(order by challenger_mape,challenger_mae) rn from yearly where yr=2024 and challenger_mape<baseline_mape and challenger_mae<baseline_mae
), chosen as (select * from selected where rn=1), report as (
 select y.* from yearly y join chosen c using(slope_weight,rough_weight)
)
select jsonb_build_object('segment','Lo Curro mid_slope roughness>=30','selectionWindow','2024_only','evaluationWindow','2025_only','nonBinding',true,'changesChampionWeights',false,
 'chosenWeights',(select jsonb_build_object('slopeWeight',slope_weight,'roughWeight',rough_weight) from chosen),
 'byYear',(select jsonb_agg(jsonb_build_object('year',yr,'n',n,'baselineMapePct',round(baseline_mape::numeric,2),'challengerMapePct',round(challenger_mape::numeric,2),'baselineMaeUf',round(baseline_mae::numeric,0),'challengerMaeUf',round(challenger_mae::numeric,0),'pass',challenger_mape<baseline_mape and challenger_mae<baseline_mae) order by yr) from report),
 'blind2025Pass',(select challenger_mape<baseline_mape and challenger_mae<baseline_mae from report where yr=2025));
$function$;

revoke all on function public.valuation_lo_curro_topography_segment_backtest_v1() from public;
revoke all on function public.valuation_lo_curro_high_rough_walkforward_weights_v1() from public;
grant execute on function public.valuation_lo_curro_topography_segment_backtest_v1() to authenticated,service_role;
grant execute on function public.valuation_lo_curro_high_rough_walkforward_weights_v1() to authenticated,service_role;
