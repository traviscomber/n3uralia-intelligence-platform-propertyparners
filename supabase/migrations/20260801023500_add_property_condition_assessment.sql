alter table public.valuation_cases
  add column if not exists condition_assessment jsonb not null default '{}'::jsonb,
  add column if not exists condition_result jsonb not null default '{}'::jsonb,
  add column if not exists condition_status text,
  add column if not exists condition_score numeric,
  add column if not exists condition_version text;

alter table public.valuation_cases
  drop constraint if exists valuation_cases_condition_status_check;

alter table public.valuation_cases
  add constraint valuation_cases_condition_status_check
  check (condition_status is null or condition_status = any(array[
    'critical', 'deficient', 'regular', 'good', 'excellent', 'not_evaluable'
  ]));

alter table public.valuation_cases
  drop constraint if exists valuation_cases_condition_score_check;

alter table public.valuation_cases
  add constraint valuation_cases_condition_score_check
  check (condition_score is null or condition_score between 1 and 5);

create or replace function public.validate_valuation_condition_payload()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  result_status text;
  result_score numeric;
  result_version text;
begin
  if new.condition_assessment = '{}'::jsonb and new.condition_result = '{}'::jsonb then
    new.condition_status := null;
    new.condition_score := null;
    new.condition_version := null;
    return new;
  end if;

  if jsonb_typeof(new.condition_assessment) <> 'object'
     or jsonb_typeof(new.condition_result) <> 'object' then
    raise exception 'La evaluación de estado debe ser un objeto JSON válido';
  end if;

  result_status := nullif(new.condition_result->>'status', '');
  result_version := nullif(new.condition_result->>'version', '');
  result_score := nullif(new.condition_result->>'score', '')::numeric;

  if result_status is null or result_version is null then
    raise exception 'La evaluación de estado requiere status y version';
  end if;

  if result_status = 'not_evaluable' and result_score is not null then
    raise exception 'Una evaluación no evaluable no puede tener puntaje';
  end if;

  if result_status <> 'not_evaluable' and result_score is null then
    raise exception 'Una evaluación clasificada requiere puntaje';
  end if;

  if coalesce(new.condition_result#>>'{economicAdjustment,status}', '') <> 'not_calculated' then
    raise exception 'El estado físico no puede aplicar automáticamente un ajuste económico';
  end if;

  new.condition_status := result_status;
  new.condition_score := result_score;
  new.condition_version := result_version;
  return new;
end;
$$;

drop trigger if exists trg_validate_valuation_condition_payload on public.valuation_cases;
create trigger trg_validate_valuation_condition_payload
before insert or update of condition_assessment, condition_result
on public.valuation_cases
for each row execute function public.validate_valuation_condition_payload();

comment on column public.valuation_cases.condition_assessment is
  'Ficha de inspección declarada, con criterios 1-5 y evidencia. No representa por sí sola un ajuste económico.';
comment on column public.valuation_cases.condition_result is
  'Resultado determinístico y versionado de la clasificación de estado.';
comment on column public.valuation_cases.condition_status is
  'Clasificación material: critical, deficient, regular, good, excellent o not_evaluable.';
comment on column public.valuation_cases.condition_score is
  'Puntaje ponderado de estado entre 1 y 5. Nulo cuando no evaluable.';
comment on column public.valuation_cases.condition_version is
  'Versión del motor de clasificación de estado.';
