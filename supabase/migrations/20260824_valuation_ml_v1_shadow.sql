create table if not exists private.valuation_ml_models (
  model_version text primary key,
  model_family text not null,
  status text not null check (status in ('shadow','champion','retired')),
  trained_through date,
  baseline_methodology text not null,
  metrics jsonb not null default '{}'::jsonb,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists private.valuation_ml_transformation_evidence (
  id uuid primary key default gen_random_uuid(),
  rol text,
  address text,
  evidence_type text not null,
  source_url text,
  source_observed_at timestamptz not null,
  effective_date date,
  verified boolean not null default false,
  eligible_for_shadow_adjustment boolean not null default false,
  strength smallint not null default 1 check (strength between 1 and 3),
  built_area_override numeric,
  construction_year_override integer,
  adjustment_cap_pct numeric not null default 0.20 check (adjustment_cap_pct between 0 and 0.20),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valuation_ml_transformation_evidence_identity check (rol is not null or address is not null)
);

create unique index if not exists valuation_ml_transformation_evidence_source_uidx
  on private.valuation_ml_transformation_evidence (coalesce(rol,''), evidence_type, coalesce(source_url,''));
create index if not exists valuation_ml_transformation_evidence_rol_idx
  on private.valuation_ml_transformation_evidence (rol, source_observed_at desc);

create table if not exists private.valuation_ml_shadow_predictions (
  id uuid primary key default gen_random_uuid(),
  model_version text not null references private.valuation_ml_models(model_version),
  subject_rol text,
  subject_address text,
  barrio text not null,
  baseline_rate_uf_m2 numeric not null,
  challenger_rate_uf_m2 numeric not null,
  adjustment_pct numeric not null default 0,
  confidence text not null,
  evidence_status text not null,
  evidence_ids uuid[] not null default '{}',
  features jsonb not null default '{}'::jsonb,
  actual_rate_uf_m2 numeric,
  absolute_error_pct numeric,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists valuation_ml_shadow_predictions_created_idx
  on private.valuation_ml_shadow_predictions (created_at desc);

alter table private.valuation_ml_models enable row level security;
alter table private.valuation_ml_transformation_evidence enable row level security;
alter table private.valuation_ml_shadow_predictions enable row level security;

revoke all on private.valuation_ml_models from public, anon, authenticated;
revoke all on private.valuation_ml_transformation_evidence from public, anon, authenticated;
revoke all on private.valuation_ml_shadow_predictions from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update, delete on private.valuation_ml_models to service_role;
grant select, insert, update, delete on private.valuation_ml_transformation_evidence to service_role;
grant select, insert, update, delete on private.valuation_ml_shadow_predictions to service_role;

insert into private.valuation_ml_models (
  model_version, model_family, status, trained_through, baseline_methodology, metrics, config
) values (
  'pp-house-hybrid-ml-v1',
  'hybrid_evidence_calibrated_shadow',
  'shadow',
  date '2025-12-31',
  'property-partners-house-physical-compatibility-v1',
  jsonb_build_object(
    'baseline_mape_2025', 12.79,
    'baseline_within_15_2025', 68.3,
    'baseline_within_20_2025', 77.6,
    'residual_knn_mape_2025', 12.89,
    'residual_knn_promoted', false,
    'verified_transformation_oracle_mape_2025', 12.78,
    'verified_transformation_case_mape_before', 20.53,
    'verified_transformation_case_mape_after_20pct', 7.58
  ),
  jsonb_build_object(
    'mode', 'shadow',
    'max_automatic_adjustment_pct', 0.20,
    'strength_adjustment_pct', jsonb_build_object('1',0.05,'2',0.10,'3',0.20),
    'requires_verified_evidence', true,
    'requires_evidence_observed_before_prediction', true,
    'general_residual_model', 'rejected_until_out_of_sample_gain'
  )
) on conflict (model_version) do update set
  status = excluded.status,
  trained_through = excluded.trained_through,
  metrics = excluded.metrics,
  config = excluded.config,
  updated_at = now();

insert into private.valuation_ml_transformation_evidence (
  rol, address, evidence_type, source_url, source_observed_at, effective_date,
  verified, eligible_for_shadow_adjustment, strength, built_area_override,
  construction_year_override, adjustment_cap_pct, notes, metadata
) values (
  '2125-4',
  'ANTUCO 1157',
  'verified_public_remodel_listing',
  'https://ienfoke.cl/propiedad/casa-antuco/',
  now(),
  date '2024-01-01',
  true,
  true,
  3,
  139,
  2024,
  0.20,
  'Evidencia publica verificada de remodelacion y ficha fisica actualizada. Se observa desde la fecha de investigacion; no se usa retroactivamente en backtests previos.',
  jsonb_build_object('cbrs_built_area_m2',113,'cbrs_construction_year',1970,'prior_sale_uf',10400,'later_sale_uf',16900)
) on conflict (coalesce(rol,''), evidence_type, coalesce(source_url,'')) do update set
  source_observed_at = excluded.source_observed_at,
  verified = excluded.verified,
  eligible_for_shadow_adjustment = excluded.eligible_for_shadow_adjustment,
  strength = excluded.strength,
  built_area_override = excluded.built_area_override,
  construction_year_override = excluded.construction_year_override,
  adjustment_cap_pct = excluded.adjustment_cap_pct,
  notes = excluded.notes,
  metadata = excluded.metadata,
  updated_at = now();

create or replace function public.valuation_ml_house_shadow_v1(
  p_barrio text,
  p_rol text,
  p_address text,
  p_built_area_m2 numeric,
  p_land_area_m2 numeric,
  p_construction_year integer,
  p_baseline_rate_uf_m2 numeric,
  p_strict_comparable_count integer default null,
  p_average_similarity numeric default null,
  p_comparable_spread numeric default null,
  p_as_of timestamptz default now()
) returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_model private.valuation_ml_models%rowtype;
  v_evidence private.valuation_ml_transformation_evidence%rowtype;
  v_adjustment numeric := 0;
  v_confidence text := 'low';
  v_evidence_status text := 'none';
  v_challenger numeric := p_baseline_rate_uf_m2;
  v_strength_map jsonb;
  v_cap numeric := 0.20;
begin
  select * into v_model
  from private.valuation_ml_models
  where model_version = 'pp-house-hybrid-ml-v1' and status in ('shadow','champion')
  limit 1;

  if not found or p_baseline_rate_uf_m2 is null or p_baseline_rate_uf_m2 <= 0 then
    return jsonb_build_object('available', false, 'reason', 'model_or_baseline_unavailable');
  end if;

  v_strength_map := coalesce(v_model.config->'strength_adjustment_pct','{}'::jsonb);
  v_cap := least(0.20, coalesce((v_model.config->>'max_automatic_adjustment_pct')::numeric,0.20));

  select * into v_evidence
  from private.valuation_ml_transformation_evidence e
  where e.verified
    and e.eligible_for_shadow_adjustment
    and e.source_observed_at <= p_as_of
    and (
      (p_rol is not null and e.rol is not null and regexp_replace(lower(e.rol),'[^a-z0-9]','','g') = regexp_replace(lower(p_rol),'[^a-z0-9]','','g'))
      or
      (p_rol is null and p_address is not null and e.address is not null and regexp_replace(lower(e.address),'[^a-z0-9]','','g') = regexp_replace(lower(p_address),'[^a-z0-9]','','g'))
    )
  order by e.strength desc, e.source_observed_at desc
  limit 1;

  if found then
    v_evidence_status := 'verified_transformation';
    v_adjustment := least(
      v_cap,
      v_evidence.adjustment_cap_pct,
      coalesce((v_strength_map->>v_evidence.strength::text)::numeric,0)
    );
  end if;

  if coalesce(p_strict_comparable_count,0) >= 6 and coalesce(p_average_similarity,0) >= 0.70 then
    v_confidence := 'high';
  elsif coalesce(p_strict_comparable_count,0) >= 4 and coalesce(p_average_similarity,0) >= 0.58 then
    v_confidence := 'medium';
  else
    v_confidence := 'low';
  end if;

  v_challenger := p_baseline_rate_uf_m2 * (1 + v_adjustment);

  return jsonb_build_object(
    'available', true,
    'modelVersion', v_model.model_version,
    'mode', v_model.status,
    'baselineRateUfM2', round(p_baseline_rate_uf_m2,2),
    'challengerRateUfM2', round(v_challenger,2),
    'adjustmentPct', round(v_adjustment*100,2),
    'confidence', v_confidence,
    'evidenceStatus', v_evidence_status,
    'evidenceId', case when v_evidence.id is null then null else v_evidence.id end,
    'physicalOverride', case when v_evidence.id is null then null else jsonb_build_object(
      'builtAreaM2', v_evidence.built_area_override,
      'constructionYear', v_evidence.construction_year_override,
      'effectiveDate', v_evidence.effective_date
    ) end,
    'nonBinding', true,
    'promotionGate', 'must_beat_baseline_out_of_sample',
    'features', jsonb_build_object(
      'barrio', p_barrio,
      'builtAreaM2', p_built_area_m2,
      'landAreaM2', p_land_area_m2,
      'constructionYear', p_construction_year,
      'strictComparableCount', p_strict_comparable_count,
      'averageSimilarity', p_average_similarity,
      'comparableSpread', p_comparable_spread
    )
  );
end;
$$;

create or replace function public.valuation_ml_log_shadow_prediction_v1(
  p_model_version text,
  p_subject_rol text,
  p_subject_address text,
  p_barrio text,
  p_baseline_rate_uf_m2 numeric,
  p_challenger_rate_uf_m2 numeric,
  p_adjustment_pct numeric,
  p_confidence text,
  p_evidence_status text,
  p_evidence_id uuid,
  p_features jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_id uuid;
begin
  insert into private.valuation_ml_shadow_predictions (
    model_version, subject_rol, subject_address, barrio,
    baseline_rate_uf_m2, challenger_rate_uf_m2, adjustment_pct,
    confidence, evidence_status, evidence_ids, features
  ) values (
    p_model_version, p_subject_rol, p_subject_address, p_barrio,
    p_baseline_rate_uf_m2, p_challenger_rate_uf_m2, p_adjustment_pct,
    p_confidence, p_evidence_status,
    case when p_evidence_id is null then '{}'::uuid[] else array[p_evidence_id] end,
    coalesce(p_features,'{}'::jsonb)
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.valuation_ml_resolve_shadow_prediction_v1(
  p_prediction_id uuid,
  p_actual_rate_uf_m2 numeric
) returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_row private.valuation_ml_shadow_predictions%rowtype;
begin
  update private.valuation_ml_shadow_predictions
  set actual_rate_uf_m2 = p_actual_rate_uf_m2,
      absolute_error_pct = case when p_actual_rate_uf_m2 > 0 then abs(challenger_rate_uf_m2 / p_actual_rate_uf_m2 - 1) * 100 else null end,
      resolved_at = now()
  where id = p_prediction_id
  returning * into v_row;
  if not found then return jsonb_build_object('updated',false); end if;
  return jsonb_build_object(
    'updated',true,
    'predictionId',v_row.id,
    'modelVersion',v_row.model_version,
    'baselineAbsoluteErrorPct',case when p_actual_rate_uf_m2>0 then round(abs(v_row.baseline_rate_uf_m2/p_actual_rate_uf_m2-1)*100,2) else null end,
    'challengerAbsoluteErrorPct',v_row.absolute_error_pct
  );
end;
$$;

create or replace function public.valuation_ml_model_status_v1()
returns jsonb
language sql
security definer
set search_path = private, public, pg_temp
as $$
  with model as (
    select model_version, model_family, status, trained_through, baseline_methodology, metrics, config, updated_at
    from private.valuation_ml_models
    where model_version='pp-house-hybrid-ml-v1'
    limit 1
  ), live as (
    select
      count(*) filter (where resolved_at is not null and actual_rate_uf_m2>0) as resolved_n,
      (avg(abs(baseline_rate_uf_m2/actual_rate_uf_m2-1)) filter (where resolved_at is not null and actual_rate_uf_m2>0))*100 as baseline_mape,
      (avg(abs(challenger_rate_uf_m2/actual_rate_uf_m2-1)) filter (where resolved_at is not null and actual_rate_uf_m2>0))*100 as challenger_mape,
      (avg((abs(baseline_rate_uf_m2/actual_rate_uf_m2-1)<=.15)::int) filter (where resolved_at is not null and actual_rate_uf_m2>0))*100 as baseline_within15,
      (avg((abs(challenger_rate_uf_m2/actual_rate_uf_m2-1)<=.15)::int) filter (where resolved_at is not null and actual_rate_uf_m2>0))*100 as challenger_within15
    from private.valuation_ml_shadow_predictions
    where model_version='pp-house-hybrid-ml-v1'
  )
  select jsonb_build_object(
    'model',to_jsonb(model),
    'liveEvaluation',jsonb_build_object(
      'resolvedN',coalesce(live.resolved_n,0),
      'baselineMape',case when live.baseline_mape is null then null else round(live.baseline_mape,2) end,
      'challengerMape',case when live.challenger_mape is null then null else round(live.challenger_mape,2) end,
      'baselineWithin15',case when live.baseline_within15 is null then null else round(live.baseline_within15,1) end,
      'challengerWithin15',case when live.challenger_within15 is null then null else round(live.challenger_within15,1) end
    ),
    'promotionPolicy',jsonb_build_object(
      'minimumResolvedCases',30,
      'requiresLowerMape',true,
      'requiresNoMaterialWithin15Regression',true,
      'currentMode','shadow'
    )
  )
  from model cross join live;
$$;

revoke all on function public.valuation_ml_house_shadow_v1(text,text,text,numeric,numeric,integer,numeric,integer,numeric,numeric,timestamptz) from public, anon, authenticated;
grant execute on function public.valuation_ml_house_shadow_v1(text,text,text,numeric,numeric,integer,numeric,integer,numeric,numeric,timestamptz) to service_role;
revoke all on function public.valuation_ml_log_shadow_prediction_v1(text,text,text,text,numeric,numeric,numeric,text,text,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.valuation_ml_log_shadow_prediction_v1(text,text,text,text,numeric,numeric,numeric,text,text,uuid,jsonb) to service_role;
revoke all on function public.valuation_ml_resolve_shadow_prediction_v1(uuid,numeric) from public, anon, authenticated;
grant execute on function public.valuation_ml_resolve_shadow_prediction_v1(uuid,numeric) to service_role;
revoke all on function public.valuation_ml_model_status_v1() from public, anon, authenticated;
grant execute on function public.valuation_ml_model_status_v1() to service_role;
