create or replace function public.apply_valuation_comparable_decision(
  target_case_id uuid,
  target_comparable_id uuid,
  decision text,
  adjustment_pct numeric default 0,
  notes text default null,
  reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  viewer uuid := auth.uid();
  current_case public.valuation_cases%rowtype;
  current_comp public.valuation_comparables%rowtype;
  role_name text;
  viewer_team text;
  owner_team text;
  v_adjustment numeric := adjustment_pct;
  selected_count integer := 0;
  cbrs_count integer := 0;
  portal_count integer := 0;
  confidence_value text := 'low';
  barrio_reliability text;
  barrio_review_mode text;
  barrio_mape numeric;
begin
  if viewer is null then
    raise exception 'Autenticación requerida' using errcode = '42501';
  end if;

  select lower(coalesce(role, '')), team into role_name, viewer_team
  from public.profiles where id = viewer;

  select * into current_case
  from public.valuation_cases
  where id = target_case_id
  for update;

  if current_case.id is null then raise exception 'Valorización no encontrada'; end if;

  select team into owner_team from public.profiles where id = current_case.requested_by;

  if not (
    current_case.requested_by = viewer
    or role_name in ('admin', 'ceo')
    or (role_name in ('director', 'subdirector') and lower(coalesce(viewer_team, '')) = lower(coalesce(owner_team, '')) and coalesce(viewer_team, '') <> '')
  ) then
    raise exception 'Caso no autorizado' using errcode = '42501';
  end if;

  if current_case.status <> 'draft' then raise exception 'Los comparables sólo pueden modificarse en borrador'; end if;

  select * into current_comp
  from public.valuation_comparables
  where id = target_comparable_id and valuation_case_id = target_case_id
  for update;

  if current_comp.id is null then raise exception 'Comparable no encontrado'; end if;

  if decision = 'select' then
    if v_adjustment < -35 or v_adjustment > 35 then raise exception 'Ajuste fuera de rango contractual'; end if;
    update public.valuation_comparables vc
    set selected = true, match_status = 'accepted', exclusion_reason = null, adjustment_pct = v_adjustment,
        adjustment_notes = nullif(notes, ''), adjusted_value_uf = coalesce(vc.price_uf, vc.base_value_uf),
        selected_by = viewer, selected_at = now(), excluded_by = null, excluded_at = null
    where vc.id = target_comparable_id;
  elsif decision = 'exclude' then
    if coalesce(trim(reason), '') = '' then raise exception 'Motivo de exclusión requerido'; end if;
    update public.valuation_comparables vc
    set selected = false, match_status = 'rejected', exclusion_reason = reason, excluded_by = viewer, excluded_at = now()
    where vc.id = target_comparable_id;
  else
    raise exception 'Decisión no soportada';
  end if;

  select
    count(*) filter (where selected = true and match_status = 'accepted'),
    count(*) filter (where selected = true and match_status = 'accepted' and lower(coalesce(source_type, '')) in ('cbrs', 'transaction')),
    count(*) filter (where selected = true and match_status = 'accepted' and lower(coalesce(source_type, '')) in ('portal', 'toctoc', 'listing'))
  into selected_count, cbrs_count, portal_count
  from public.valuation_comparables
  where valuation_case_id = target_case_id and coalesce(price_uf_m2, 0) > 0;

  if lower(coalesce(current_case.property_type,'')) = 'casa' then
    select r.reliability,r.review_mode,r.mape_pct
      into barrio_reliability,barrio_review_mode,barrio_mape
    from public.valuation_house_reliability_v1(current_case.neighborhood,'property-partners-valuation-v2-kml-house-robust-v4') r;

    confidence_value := case
      when cbrs_count >= 5 and barrio_reliability = 'high' then 'high'
      when cbrs_count >= 3 and barrio_reliability in ('high','medium') then 'medium'
      else 'low'
    end;
  else
    confidence_value := case when selected_count >= 3 then 'medium' else 'low' end;
  end if;

  update public.valuation_cases
  set confidence = confidence_value,
      methodology_version = case when lower(coalesce(current_case.property_type,''))='casa' then 'property-partners-valuation-v2-kml-house-robust-v4' else 'property-partners-valuation-v2' end,
      evidence = coalesce(evidence, '{}'::jsonb) || jsonb_build_object(
        'acceptedComparableCount', selected_count,
        'acceptedCbrsComparableCount', cbrs_count,
        'acceptedPortalComparableCount', portal_count,
        'comparableDecisionUpdatedAt', now(),
        'backtestReliability', barrio_reliability,
        'backtestMapePct', barrio_mape,
        'reviewMode', barrio_review_mode
      ),
      updated_at = now()
  where id = target_case_id;

  insert into public.valuation_decision_log(
    valuation_case_id, comparable_id, action, actor_id, previous_state, new_state, reason, metadata
  ) values (
    target_case_id, target_comparable_id,
    case when decision = 'select' then 'comparable_selected' else 'comparable_excluded' end,
    viewer, to_jsonb(current_comp),
    (select to_jsonb(vc) from public.valuation_comparables vc where vc.id = target_comparable_id),
    coalesce(reason, notes),
    jsonb_build_object(
      'methodologyVersion', case when lower(coalesce(current_case.property_type,''))='casa' then 'property-partners-valuation-v2-kml-house-robust-v4' else 'property-partners-valuation-v2' end,
      'economicRepricingApplied', false,
      'acceptedComparableCount', selected_count,
      'acceptedCbrsComparableCount', cbrs_count,
      'acceptedPortalComparableCount', portal_count,
      'backtestReliability', barrio_reliability,
      'backtestMapePct', barrio_mape,
      'reviewMode', barrio_review_mode
    )
  );

  return jsonb_build_object(
    'updated', true,
    'selectedCount', selected_count,
    'cbrsSelectedCount', cbrs_count,
    'portalSelectedCount', portal_count,
    'minimumRequired', 3,
    'confidence', confidence_value,
    'methodologyVersion', case when lower(coalesce(current_case.property_type,''))='casa' then 'property-partners-valuation-v2-kml-house-robust-v4' else 'property-partners-valuation-v2' end,
    'economicRepricingApplied', false,
    'backtestReliability', barrio_reliability,
    'backtestMapePct', barrio_mape,
    'reviewMode', barrio_review_mode
  );
end;
$$;
