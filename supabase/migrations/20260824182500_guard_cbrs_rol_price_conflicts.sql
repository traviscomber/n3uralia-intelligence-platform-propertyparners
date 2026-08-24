-- CBRS is registry evidence, not proof that every inscription is an arm's-length market sale.
-- Preserve conflicting source rows, but quarantine them from valuation selection until validated.

create or replace function private.cbrs_rol_price_conflict_v1(
  p_source_reference text,
  p_price_uf numeric
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_rol text;
  v_tx_date date;
  v_min numeric;
  v_max numeric;
  v_count integer;
  v_ratio numeric;
begin
  v_rol := substring(coalesce(p_source_reference, '') from 'ROL ([^ ]+)$');
  begin
    v_tx_date := substring(coalesce(p_source_reference, '') from '([0-9]{4}-[0-9]{2}-[0-9]{2})')::date;
  exception when others then
    v_tx_date := null;
  end;

  if v_rol is null or p_price_uf is null or p_price_uf <= 0 then
    return jsonb_build_object('conflict', false);
  end if;

  select min(r.price_uf), max(r.price_uf), count(*)::integer
    into v_min, v_max, v_count
  from public.market_cbrs_reference_transactions r
  where r.rol = v_rol
    and r.price_uf > 0
    and (
      v_tx_date is null
      or r.transaction_date between (v_tx_date - interval '5 years')::date and (v_tx_date + interval '5 years')::date
    );

  v_ratio := case when coalesce(v_min, 0) > 0 then v_max / v_min else null end;

  return jsonb_build_object(
    'conflict', coalesce(v_count >= 2 and v_ratio >= 5, false),
    'rol', v_rol,
    'count', coalesce(v_count, 0),
    'minUf', v_min,
    'maxUf', v_max,
    'ratio', case when v_ratio is null then null else round(v_ratio, 2) end,
    'policy', 'same_rol_5x_within_5y_requires_validation'
  );
end;
$$;

revoke all on function private.cbrs_rol_price_conflict_v1(text,numeric) from public, anon, authenticated;

create or replace function private.enforce_cbrs_valuation_conflict_guard_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quality jsonb;
begin
  if lower(coalesce(new.source_type, '')) <> 'cbrs' then
    return new;
  end if;

  v_quality := private.cbrs_rol_price_conflict_v1(new.source_reference, new.price_uf);

  if coalesce((v_quality->>'conflict')::boolean, false) then
    new.contradictions := array(
      select distinct x
      from unnest(
        coalesce(new.contradictions, array[]::text[]) || array[
          format(
            'Conflicto CBRS: ROL %s registra valores entre UF %s y UF %s (%.2sx). Requiere validar la naturaleza de la inscripción antes de usarla como comparable.',
            v_quality->>'rol',
            v_quality->>'minUf',
            v_quality->>'maxUf',
            coalesce((v_quality->>'ratio')::numeric, 0)
          )
        ]
      ) as x
    );

    if new.selected = true or new.match_status = 'accepted' then
      raise exception 'Comparable CBRS bloqueado: el mismo ROL % presenta una diferencia registral de %x entre UF % y UF %. Requiere validación antes de seleccionarlo.',
        v_quality->>'rol',
        v_quality->>'ratio',
        v_quality->>'minUf',
        v_quality->>'maxUf';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_cbrs_valuation_conflict_guard_v1() from public, anon, authenticated;

drop trigger if exists trg_enforce_cbrs_valuation_conflict_guard_v1 on public.valuation_comparables;
create trigger trg_enforce_cbrs_valuation_conflict_guard_v1
before insert or update on public.valuation_comparables
for each row execute function private.enforce_cbrs_valuation_conflict_guard_v1();

-- Quarantine only live draft comparables. Issued/approved historical snapshots remain untouched.
with conflict_rows as (
  select
    vc.id,
    vc.valuation_case_id,
    private.cbrs_rol_price_conflict_v1(vc.source_reference, vc.price_uf) as quality
  from public.valuation_comparables vc
  join public.valuation_cases c on c.id = vc.valuation_case_id
  where c.status = 'draft'
    and lower(coalesce(vc.source_type, '')) = 'cbrs'
), affected as (
  update public.valuation_comparables vc
  set selected = false,
      match_status = 'rejected',
      exclusion_reason = format(
        '[CBRS_CONFLICT] Mismo ROL %s con rango UF %s–%s (%sx). Validación registral requerida.',
        cr.quality->>'rol',
        cr.quality->>'minUf',
        cr.quality->>'maxUf',
        cr.quality->>'ratio'
      ),
      contradictions = array(
        select distinct x
        from unnest(
          coalesce(vc.contradictions, array[]::text[]) || array[
            format(
              'Conflicto CBRS: ROL %s registra UF %s y UF %s. No usar automáticamente hasta validar la inscripción.',
              cr.quality->>'rol', cr.quality->>'minUf', cr.quality->>'maxUf'
            )
          ]
        ) as x
      ),
      selected_by = null,
      selected_at = null
  from conflict_rows cr
  where vc.id = cr.id
    and coalesce((cr.quality->>'conflict')::boolean, false)
  returning vc.valuation_case_id
), affected_cases as (
  select distinct valuation_case_id from affected
)
update public.valuation_cases c
set confidence = case
      when (select count(*) from public.valuation_comparables vc where vc.valuation_case_id=c.id and vc.selected=true and vc.match_status='accepted') >= 3 then c.confidence
      else 'low'
    end,
    warnings = case
      when 'Existen inscripciones CBRS del mismo ROL con diferencias de precio >=5x; requieren validación antes de usarse como comparables.' = any(coalesce(c.warnings,array[]::text[])) then c.warnings
      else coalesce(c.warnings,array[]::text[]) || array['Existen inscripciones CBRS del mismo ROL con diferencias de precio >=5x; requieren validación antes de usarse como comparables.']
    end,
    evidence = coalesce(c.evidence,'{}'::jsonb) || jsonb_build_object(
      'cbrsConflictGuard','same_rol_5x_within_5y_requires_validation',
      'cbrsConflictGuardUpdatedAt',now()
    ),
    updated_at = now()
from affected_cases ac
where c.id = ac.valuation_case_id;
