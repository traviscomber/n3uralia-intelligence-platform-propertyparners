create or replace function public.valuation_ml_resolve_from_cbrs_v1(p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  r record;
  tx record;
  v_subject_built numeric;
  v_subject_land numeric;
  v_subject_weighted_area numeric;
  v_actual_rate numeric;
  v_resolved integer := 0;
  v_scanned integer := 0;
begin
  for r in
    select p.*
    from private.valuation_ml_shadow_predictions p
    where p.resolved_at is null
      and nullif(trim(coalesce(p.subject_rol, '')), '') is not null
    order by p.created_at asc
    limit greatest(1, least(coalesce(p_limit, 100), 1000))
  loop
    v_scanned := v_scanned + 1;

    select t.event_key, t.transaction_date, t.price_uf, t.built_area_m2, t.land_area_m2, t.created_at
    into tx
    from public.market_cbrs_reference_transactions t
    where t.property_type = 'Casa'
      and t.rol = r.subject_rol
      and t.transaction_date > r.created_at::date
      and coalesce(t.price_uf, 0) > 0
    order by t.transaction_date asc, t.created_at asc
    limit 1;

    if tx.event_key is null then
      continue;
    end if;

    v_subject_built := nullif(r.features->>'builtAreaM2', '')::numeric;
    v_subject_land := nullif(r.features->>'landAreaM2', '')::numeric;
    v_subject_weighted_area := coalesce(v_subject_built, 0) + coalesce(v_subject_land, 0) / 4.0;

    if v_subject_weighted_area <= 0 then
      v_subject_weighted_area := coalesce(tx.built_area_m2, 0) + coalesce(tx.land_area_m2, 0) / 4.0;
    end if;

    if v_subject_weighted_area <= 0 then
      continue;
    end if;

    v_actual_rate := tx.price_uf / v_subject_weighted_area;

    perform public.valuation_ml_resolve_shadow_prediction_v1(r.id, v_actual_rate);

    update private.valuation_ml_shadow_predictions
    set features = coalesce(features, '{}'::jsonb) || jsonb_build_object(
      'resolvedFrom', 'CBRS',
      'resolvedEventKey', tx.event_key,
      'resolvedTransactionDate', tx.transaction_date,
      'resolvedPriceUf', tx.price_uf,
      'resolvedCbrsCreatedAt', tx.created_at,
      'resolutionPolicy', 'first_future_same_rol_sale_v1'
    )
    where id = r.id;

    v_resolved := v_resolved + 1;
  end loop;

  return jsonb_build_object(
    'scanned', v_scanned,
    'resolved', v_resolved,
    'policy', 'first_future_same_rol_sale_v1'
  );
end;
$$;

revoke all on function public.valuation_ml_resolve_from_cbrs_v1(integer) from public, anon, authenticated;
grant execute on function public.valuation_ml_resolve_from_cbrs_v1(integer) to service_role;
