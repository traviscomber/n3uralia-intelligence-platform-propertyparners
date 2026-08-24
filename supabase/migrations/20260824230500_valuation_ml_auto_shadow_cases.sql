alter table private.valuation_ml_shadow_predictions
  add column if not exists valuation_case_id uuid references public.valuation_cases(id) on delete set null,
  add column if not exists baseline_methodology text;

create index if not exists valuation_ml_shadow_predictions_case_idx
  on private.valuation_ml_shadow_predictions (valuation_case_id, created_at desc);

create unique index if not exists valuation_ml_shadow_predictions_open_case_baseline_uidx
  on private.valuation_ml_shadow_predictions (valuation_case_id, model_version, baseline_rate_uf_m2)
  where valuation_case_id is not null and resolved_at is null;

create or replace function private.valuation_ml_capture_case_shadow_v1()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_baseline numeric;
  v_weighted_area numeric;
  v_prediction jsonb;
  v_model_version text;
  v_challenger numeric;
  v_adjustment numeric;
  v_confidence text;
  v_evidence_status text;
  v_evidence_id uuid;
  v_features jsonb;
begin
  if new.property_type is distinct from 'Casa'
     or new.methodology_version is distinct from 'property-partners-house-champion-v5'
     or coalesce(new.built_area_m2, 0) <= 0
     or coalesce(new.land_area_m2, 0) <= 0
     or nullif(trim(coalesce(new.neighborhood, '')), '') is null then
    return new;
  end if;

  v_weighted_area := new.built_area_m2 + new.land_area_m2 / 4.0;
  v_baseline := coalesce(
    nullif(new.built_rate_uf_m2, 0),
    case when v_weighted_area > 0 and coalesce(new.estimated_value_uf, 0) > 0
      then new.estimated_value_uf / v_weighted_area
      else null
    end
  );

  if coalesce(v_baseline, 0) <= 0 then
    return new;
  end if;

  v_prediction := public.valuation_ml_house_shadow_v1(
    p_barrio => new.neighborhood,
    p_rol => new.rol,
    p_address => new.address,
    p_built_area_m2 => new.built_area_m2,
    p_land_area_m2 => new.land_area_m2,
    p_construction_year => new.construction_year,
    p_baseline_rate_uf_m2 => v_baseline,
    p_strict_comparable_count => coalesce(
      nullif((new.evidence->>'strictComparableCount')::integer, 0),
      nullif((new.evidence->>'comparableCount')::integer, 0)
    ),
    p_average_similarity => nullif((new.evidence->>'averageSimilarity')::numeric, 0),
    p_comparable_spread => nullif((new.evidence->>'comparableSpread')::numeric, 0),
    p_as_of => now()
  );

  if not coalesce((v_prediction->>'available')::boolean, false) then
    return new;
  end if;

  v_model_version := nullif(v_prediction->>'modelVersion', '');
  v_challenger := nullif(v_prediction->>'challengerRateUfM2', '')::numeric;
  v_adjustment := coalesce(nullif(v_prediction->>'adjustmentPct', '')::numeric, 0);
  v_confidence := coalesce(nullif(v_prediction->>'confidence', ''), 'low');
  v_evidence_status := coalesce(nullif(v_prediction->>'evidenceStatus', ''), 'none');
  v_evidence_id := nullif(v_prediction->>'evidenceId', '')::uuid;
  v_features := coalesce(v_prediction->'features', '{}'::jsonb) || jsonb_build_object(
    'valuationCaseId', new.id,
    'methodologyVersion', new.methodology_version,
    'caseStatus', new.status,
    'capturedBy', 'valuation_case_trigger_v1'
  );

  if v_model_version is null or coalesce(v_challenger, 0) <= 0 then
    return new;
  end if;

  insert into private.valuation_ml_shadow_predictions (
    model_version,
    valuation_case_id,
    subject_rol,
    subject_address,
    barrio,
    baseline_methodology,
    baseline_rate_uf_m2,
    challenger_rate_uf_m2,
    adjustment_pct,
    confidence,
    evidence_status,
    evidence_ids,
    features
  ) values (
    v_model_version,
    new.id,
    new.rol,
    new.address,
    new.neighborhood,
    new.methodology_version,
    v_baseline,
    v_challenger,
    v_adjustment,
    v_confidence,
    v_evidence_status,
    case when v_evidence_id is null then '{}'::uuid[] else array[v_evidence_id] end,
    v_features
  )
  on conflict do nothing;

  return new;
end;
$$;

revoke all on function private.valuation_ml_capture_case_shadow_v1() from public, anon, authenticated;

create or replace trigger valuation_cases_ml_shadow_capture
  after insert or update of methodology_version, built_rate_uf_m2, estimated_value_uf, evidence
  on public.valuation_cases
  for each row
  execute function private.valuation_ml_capture_case_shadow_v1();
