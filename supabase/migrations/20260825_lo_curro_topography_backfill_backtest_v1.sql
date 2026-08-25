create extension if not exists http with schema extensions;

alter table public.valuation_topography_samples
  add column if not exists relative_elevation_m numeric,
  add column if not exists roughness_m numeric,
  add column if not exists terrain_position text;

create or replace function public.valuation_topography_backfill_lo_curro_glo90_v1(p_limit integer default 25)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  r record; resp extensions.http_response; payload jsonb; elev jsonb;
  c numeric; n numeric; s numeric; e numeric; w numeric; lat_delta double precision; lon_delta double precision;
  dx numeric; dy numeric; slope_rad double precision; slope_deg numeric; slope_pct numeric; aspect numeric; rel numeric; rough numeric; terrain text;
  processed integer:=0; failed integer:=0; last_error text:=null;
  v_source_version constant text:='copernicus-dem-2021-glo90-open-meteo-90m';
  v_source_url constant text:='https://open-meteo.com/en/docs/elevation-api';
begin
  for r in
    select distinct on (round(t.latitude::numeric,6),round(t.longitude::numeric,6))
      t.latitude::double precision latitude,t.longitude::double precision longitude
    from public.market_cbrs_reference_transactions t
    where t.property_type ilike '%casa%'
      and t.latitude is not null and t.longitude is not null
      and public.valuation_pp_kml_barrio_at(t.latitude,t.longitude)='Lo Curro'
      and not exists(
        select 1 from public.valuation_topography_samples s0
        where round(s0.latitude::numeric,6)=round(t.latitude::numeric,6)
          and round(s0.longitude::numeric,6)=round(t.longitude::numeric,6)
          and s0.source_version=v_source_version)
    order by round(t.latitude::numeric,6),round(t.longitude::numeric,6),t.transaction_date desc
    limit greatest(coalesce(p_limit,25),1)
  loop
    begin
      lat_delta:=90.0/111320.0;
      lon_delta:=90.0/(111320.0*cos(radians(r.latitude)));
      resp:=extensions.http_get('https://api.open-meteo.com/v1/elevation?latitude='||r.latitude||','||(r.latitude+lat_delta)||','||(r.latitude-lat_delta)||','||r.latitude||','||r.latitude||'&longitude='||r.longitude||','||r.longitude||','||r.longitude||','||(r.longitude+lon_delta)||','||(r.longitude-lon_delta));
      if resp.status<>200 then failed:=failed+1; last_error:='http_'||resp.status; continue; end if;
      payload:=resp.content::jsonb; elev:=payload->'elevation';
      if elev is null or jsonb_array_length(elev)<5 then failed:=failed+1; last_error:='bad_payload'; continue; end if;
      c:=(elev->>0)::numeric; n:=(elev->>1)::numeric; s:=(elev->>2)::numeric; e:=(elev->>3)::numeric; w:=(elev->>4)::numeric;
      dx:=(e-w)/180.0; dy:=(n-s)/180.0;
      slope_rad:=atan(sqrt((dx*dx+dy*dy)::double precision)); slope_deg:=degrees(slope_rad); slope_pct:=tan(slope_rad)*100.0;
      aspect:=mod((degrees(atan2(dy::double precision,(-dx)::double precision))+360.0)::numeric,360.0::numeric);
      rel:=c-((n+s+e+w)/4.0); rough:=greatest(c,n,s,e,w)-least(c,n,s,e,w);
      terrain:=case when rel>=8 then 'upper_slope' when rel<=-8 then 'lower_slope' else 'mid_slope' end;
      insert into public.valuation_topography_samples(latitude,longitude,elevation_m,slope_pct,slope_degrees,aspect_degrees,sample_radius_m,source_name,source_url,source_version,source_observed_at,methodology,metadata,relative_elevation_m,roughness_m,terrain_position)
      values(r.latitude,r.longitude,c,round(slope_pct,3),round(slope_deg,3),round(aspect,3),90,'Copernicus DEM GLO-90 via Open-Meteo',v_source_url,v_source_version,now(),'5-point central-difference terrain sample',jsonb_build_object('gridSpacingM',90,'samples',5,'bootstrapSource','Open-Meteo Elevation API','championAdjustmentPct',0),round(rel,3),round(rough,3),terrain);
      processed:=processed+1;
    exception when others then failed:=failed+1; last_error:=sqlerrm; end;
  end loop;
  return jsonb_build_object('processed',processed,'failed',failed,'lastError',last_error,'sourceVersion',v_source_version,'changesChampionWeights',false,'completedAt',now());
end;$$;

revoke all on function public.valuation_topography_backfill_lo_curro_glo90_v1(integer) from public,anon,authenticated;
grant execute on function public.valuation_topography_backfill_lo_curro_glo90_v1(integer) to service_role;

create or replace function public.valuation_topography_backtest_lo_curro_v1()
returns jsonb
language sql
stable
security definer
set search_path=public,private,extensions
as $$
with base as (
  select t.*, s.elevation_m, s.slope_degrees, s.aspect_degrees, s.relative_elevation_m, s.roughness_m,
    (t.built_area_m2 + 0.15*t.land_area_m2)::numeric effective_area,
    t.price_uf/nullif((t.built_area_m2+0.15*t.land_area_m2),0) effective_rate,
    coalesce(q.has_extreme_price_conflict,false) extreme_conflict
  from public.market_cbrs_reference_transactions t
  join public.valuation_topography_samples s on round(s.latitude::numeric,6)=round(t.latitude::numeric,6) and round(s.longitude::numeric,6)=round(t.longitude::numeric,6) and s.source_version='copernicus-dem-2021-glo90-open-meteo-90m'
  left join private.market_cbrs_rol_quality_v1 q on q.rol=t.rol
  where t.property_type ilike '%casa%' and t.price_uf>0 and t.built_area_m2>0 and t.land_area_m2>0 and t.construction_year is not null and public.valuation_pp_kml_barrio_at(t.latitude,t.longitude)='Lo Curro'
), clean as (select * from base where not extreme_conflict), train as (select * from clean where transaction_date<date '2024-01-01'), test as (select * from clean where transaction_date>=date '2024-01-01' and transaction_date<date '2026-01-01'),
sc as (select greatest(percentile_cont(.75) within group(order by ln(built_area_m2))-percentile_cont(.25) within group(order by ln(built_area_m2)),.05) sb,greatest(percentile_cont(.75) within group(order by ln(land_area_m2))-percentile_cont(.25) within group(order by ln(land_area_m2)),.05) sl,greatest(percentile_cont(.75) within group(order by construction_year)-percentile_cont(.25) within group(order by construction_year),5) sy,greatest(percentile_cont(.75) within group(order by elevation_m)-percentile_cont(.25) within group(order by elevation_m),20) se,greatest(percentile_cont(.75) within group(order by slope_degrees)-percentile_cont(.25) within group(order by slope_degrees),2) ss,greatest(percentile_cont(.75) within group(order by relative_elevation_m)-percentile_cont(.25) within group(order by relative_elevation_m),2) sr,greatest(percentile_cont(.75) within group(order by roughness_m)-percentile_cont(.25) within group(order by roughness_m),5) sg from train),
p as (select x.*,
(select sum(effective_rate*w)/sum(w)*x.effective_area from (select effective_rate,1/(.15+d) w from (select tr.effective_rate,abs(ln(tr.built_area_m2/x.built_area_m2))/sc.sb+abs(ln(tr.land_area_m2/x.land_area_m2))/sc.sl+abs(tr.construction_year-x.construction_year)/sc.sy+extract(year from age(x.transaction_date,tr.transaction_date))/10 d from train tr cross join sc where not(round(tr.latitude::numeric,6)=round(x.latitude::numeric,6) and round(tr.longitude::numeric,6)=round(x.longitude::numeric,6))) z order by d limit 8) q) baseline_pred,
(select sum(effective_rate*w)/sum(w)*x.effective_area from (select effective_rate,1/(.15+d) w from (select tr.effective_rate,abs(ln(tr.built_area_m2/x.built_area_m2))/sc.sb+abs(ln(tr.land_area_m2/x.land_area_m2))/sc.sl+abs(tr.construction_year-x.construction_year)/sc.sy+extract(year from age(x.transaction_date,tr.transaction_date))/10+abs(tr.elevation_m-x.elevation_m)/sc.se+abs(tr.slope_degrees-x.slope_degrees)/sc.ss+abs(tr.relative_elevation_m-x.relative_elevation_m)/sc.sr+abs(tr.roughness_m-x.roughness_m)/sc.sg+least(abs(tr.aspect_degrees-x.aspect_degrees),360-abs(tr.aspect_degrees-x.aspect_degrees))/90 d from train tr cross join sc where not(round(tr.latitude::numeric,6)=round(x.latitude::numeric,6) and round(tr.longitude::numeric,6)=round(x.longitude::numeric,6))) z order by d limit 8) q) topo_pred from test x),
y as (select extract(year from transaction_date)::int yr,count(*) n,avg(abs(baseline_pred-price_uf)/price_uf)*100 baseline_mape,avg(abs(topo_pred-price_uf)/price_uf)*100 topo_mape,avg(abs(baseline_pred-price_uf)) baseline_mae,avg(abs(topo_pred-price_uf)) topo_mae,avg(baseline_pred-price_uf) baseline_bias,avg(topo_pred-price_uf) topo_bias from p group by 1),
a as (select count(*) n,avg(abs(baseline_pred-price_uf)/price_uf)*100 baseline_mape,avg(abs(topo_pred-price_uf)/price_uf)*100 topo_mape,avg(abs(baseline_pred-price_uf)) baseline_mae,avg(abs(topo_pred-price_uf)) topo_mae,avg(baseline_pred-price_uf) baseline_bias,avg(topo_pred-price_uf) topo_bias from p)
select jsonb_build_object('status','shadow_evaluation','sourceVersion','copernicus-dem-2021-glo90-open-meteo-90m','trainWindow','2014-2023','holdoutWindow','2024-2025','sameLocationLeakageExcluded',true,'extremeRolConflictsExcluded',true,'changesChampionWeights',false,'overall',jsonb_build_object('n',a.n,'baselineMapePct',round(a.baseline_mape::numeric,2),'topographyMapePct',round(a.topo_mape::numeric,2),'mapeImprovementPp',round((a.baseline_mape-a.topo_mape)::numeric,2),'baselineMaeUf',round(a.baseline_mae::numeric,0),'topographyMaeUf',round(a.topo_mae::numeric,0),'baselineBiasUf',round(a.baseline_bias::numeric,0),'topographyBiasUf',round(a.topo_bias::numeric,0)),'byYear',(select jsonb_agg(jsonb_build_object('year',yr,'n',n,'baselineMapePct',round(baseline_mape::numeric,2),'topographyMapePct',round(topo_mape::numeric,2),'baselineMaeUf',round(baseline_mae::numeric,0),'topographyMaeUf',round(topo_mae::numeric,0),'baselineBiasUf',round(baseline_bias::numeric,0),'topographyBiasUf',round(topo_bias::numeric,0)) order by yr) from y),'decision',case when a.topo_mape<a.baseline_mape*.9 and a.topo_mae<a.baseline_mae then 'PROMOTE_TO_CHALLENGER' else 'HOLD' end) from a;
$$;

revoke all on function public.valuation_topography_backtest_lo_curro_v1() from public,anon;
grant execute on function public.valuation_topography_backtest_lo_curro_v1() to authenticated,service_role;
