create or replace function private.valuation_case_champion_deviation_v1()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_recommended numeric;
  v_confirmed numeric;
  v_deviation_pct numeric;
  v_abs_deviation_pct numeric;
  v_band text;
  v_warning text;
begin
  if new.property_type is distinct from 'Casa'
     or new.methodology_version is distinct from 'property-partners-house-champion-v5' then
    return new;
  end if;

  v_recommended := nullif(new.evidence->>'recommendedRateUfM2', '')::numeric;
  v_confirmed := nullif(new.built_rate_uf_m2, 0);
  if coalesce(v_recommended, 0) <= 0 or coalesce(v_confirmed, 0) <= 0 then
    return new;
  end if;

  v_deviation_pct := round(((v_confirmed / v_recommended) - 1) * 100, 2);
  v_abs_deviation_pct := abs(v_deviation_pct);
  v_band := case
    when v_abs_deviation_pct <= 10 then 'aligned'
    when v_abs_deviation_pct <= 15 then 'attention'
    when v_abs_deviation_pct <= 20 then 'review'
    else 'material_override'
  end;

  new.evidence := coalesce(new.evidence, '{}'::jsonb) || jsonb_build_object(
    'valuerConfirmedRateUfM2', v_confirmed,
    'valuerDeviationPct', v_deviation_pct,
    'valuerDeviationAbsPct', v_abs_deviation_pct,
    'valuerDeviationBand', v_band,
    'valuerDeviationThresholdPct', 15,
    'championRecommendationPreserved', true
  );

  if v_abs_deviation_pct > 15 then
    v_warning := format(
      'La tasa confirmada por el valorizador se desvía %s%% de la recomendación estadística champion v5; conservar justificación profesional explícita.',
      trim(to_char(v_abs_deviation_pct, 'FM999999990.00'))
    );
    if not coalesce(new.warnings, '{}'::text[]) @> array[v_warning] then
      new.warnings := array_append(coalesce(new.warnings, '{}'::text[]), v_warning);
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.valuation_case_champion_deviation_v1() from public, anon, authenticated;

drop trigger if exists valuation_cases_champion_deviation_audit on public.valuation_cases;
create trigger valuation_cases_champion_deviation_audit
  before insert or update of methodology_version, built_rate_uf_m2, evidence
  on public.valuation_cases
  for each row
  execute function private.valuation_case_champion_deviation_v1();
