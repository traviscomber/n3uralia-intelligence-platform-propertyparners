-- Valuation intelligence quality v2
-- Adds objective KML geography, contextual UF/m2 anomaly detection, and reusable CBRS ROL quality.
-- Source rows and issued valuation snapshots remain immutable.

create or replace function private.resolve_vitacura_kml_neighborhood_v1(
  p_lat numeric,
  p_lng numeric
)
returns text
language sql
stable
set search_path = ''
as $$
  select vmn.barrio_nombre
  from public.vitacura_market_neighborhoods vmn
  where p_lat is not null
    and p_lng is not null
    and extensions.st_contains(
      vmn.geometry,
      extensions.st_setsrid(
        extensions.st_makepoint(p_lng::double precision, p_lat::double precision),
        4326
      )
    )
  limit 1
$$;

revoke all on function private.resolve_vitacura_kml_neighborhood_v1(numeric,numeric) from public, anon, authenticated;

create or replace view private.market_cbrs_rol_quality_v1 as
select
  r.rol,
  count(*)::integer as transaction_count,
  min(r.transaction_date) as first_transaction_date,
  max(r.transaction_date) as last_transaction_date,
  min(r.price_uf) filter (where r.price_uf > 0) as min_price_uf,
  max(r.price_uf) filter (where r.price_uf > 0) as max_price_uf,
  case
    when min(r.price_uf) filter (where r.price_uf > 0) > 0
    then round((max(r.price_uf) filter (where r.price_uf > 0) / min(r.price_uf) filter (where r.price_uf > 0))::numeric, 2)
    else null
  end as price_ratio,
  (
    count(*) filter (where r.price_uf > 0) >= 2
    and min(r.price_uf) filter (where r.price_uf > 0) > 0
    and (max(r.price_uf) filter (where r.price_uf > 0) / min(r.price_uf) filter (where r.price_uf > 0)) >= 5
  ) as has_extreme_price_conflict
from public.market_cbrs_reference_transactions r
where nullif(trim(r.rol), '') is not null
group by r.rol;

revoke all on private.market_cbrs_rol_quality_v1 from public, anon, authenticated;

create or replace function private.cbrs_reference_quality_v2(
  p_source_reference text,
  p_price_uf numeric,
  p_price_uf_m2 numeric,
  p_neighborhood text,
  p_property_type text
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_event_key text;
  v_rol text;
  v_ref public.market_cbrs_reference_transactions%rowtype;
  v_kml_neighborhood text;
  v_rol_quality record;
  v_median_uf_m2 numeric;
  v_ratio_to_median numeric;
  v_geo_conflict boolean := false;
  v_price_outlier boolean := false;
begin
  v_event_key := substring(coalesce(p_source_reference, '') from '^([^ ]+\|[^ ]+\|[0-9]{4}-[0-9]{2}-[0-9]{2}\|[0-9]{4})');
  v_rol := substring(coalesce(p_source_reference, '') from 'ROL ([^ ]+)$');

  if v_event_key is not null then
    select * into v_ref
    from public.market_cbrs_reference_transactions r
    where r.event_key = v_event_key
    limit 1;
  end if;

  if v_ref.id is null and v_rol is not null then
    select * into v_ref
    from public.market_cbrs_reference_transactions r
    where r.rol = v_rol
      and (p_price_uf is null or r.price_uf = p_price_uf)
    order by r.transaction_date desc
    limit 1;
  end if;

  v_rol := coalesce(v_ref.rol, v_rol);
  v_kml_neighborhood := private.resolve_vitacura_kml_neighborhood_v1(v_ref.latitude, v_ref.longitude);

  if v_rol is not null then
    select * into v_rol_quality
    from private.market_cbrs_rol_quality_v1 q
    where q.rol = v_rol;
  end if;

  if v_ref.id is not null
     and nullif(trim(coalesce(v_ref.neighborhood, '')), '') is not null
     and nullif(trim(coalesce(v_ref.property_type, '')), '') is not null then
    select percentile_cont(0.5) within group (
      order by rr.price_uf / nullif(rr.built_area_m2, 0)
    )
    into v_median_uf_m2
    from public.market_cbrs_reference_transactions rr
    where rr.price_uf > 0
      and rr.built_area_m2 > 0
      and lower(extensions.unaccent(coalesce(rr.neighborhood, ''))) = lower(extensions.unaccent(coalesce(v_ref.neighborhood, '')))
      and lower(extensions.unaccent(coalesce(rr.property_type, ''))) = lower(extensions.unaccent(coalesce(v_ref.property_type, '')));
  end if;

  if coalesce(p_price_uf_m2, 0) > 0 and coalesce(v_median_uf_m2, 0) > 0 then
    v_ratio_to_median := p_price_uf_m2 / v_median_uf_m2;
    v_price_outlier := v_ratio_to_median >= 3 or v_ratio_to_median <= (1.0 / 3.0);
  end if;

  if nullif(trim(coalesce(v_kml_neighborhood, '')), '') is not null
     and nullif(trim(coalesce(p_neighborhood, '')), '') is not null then
    v_geo_conflict := lower(extensions.unaccent(v_kml_neighborhood)) <> lower(extensions.unaccent(p_neighborhood));
  end if;

  return jsonb_build_object(
    'referenceFound', v_ref.id is not null,
    'eventKey', v_event_key,
    'rol', v_rol,
    'kmlNeighborhood', v_kml_neighborhood,
    'storedNeighborhood', v_ref.neighborhood,
    'comparableNeighborhood', p_neighborhood,
    'geographyConflict', v_geo_conflict,
    'transactionCount', coalesce(v_rol_quality.transaction_count, 0),
    'minUf', v_rol_quality.min_price_uf,
    'maxUf', v_rol_quality.max_price_uf,
    'priceRatio', v_rol_quality.price_ratio,
    'sameRolPriceConflict', coalesce(v_rol_quality.has_extreme_price_conflict, false),
    'neighborhoodTypeMedianUfM2', case when v_median_uf_m2 is null then null else round(v_median_uf_m2::numeric, 2) end,
    'ufM2RatioToMedian', case when v_ratio_to_median is null then null else round(v_ratio_to_median::numeric, 2) end,
    'priceOutlier', v_price_outlier,
    'policy', 'cbrs_quality_v2_kml_same_rol_contextual_ufm2'
  );
end;
$$;

revoke all on function private.cbrs_reference_quality_v2(text,numeric,numeric,text,text) from public, anon, authenticated;

create or replace function private.enforce_cbrs_valuation_conflict_guard_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quality jsonb;
  v_messages text[] := array[]::text[];
  v_block boolean := false;
begin
  if lower(coalesce(new.source_type, '')) <> 'cbrs' then
    return new;
  end if;

  v_quality := private.cbrs_reference_quality_v2(
    new.source_reference,
    new.price_uf,
    new.price_uf_m2,
    new.neighborhood,
    new.property_type
  );

  if coalesce((v_quality->>'sameRolPriceConflict')::boolean, false) then
    v_messages := v_messages || format(
      'Conflicto CBRS: ROL %s registra valores entre UF %s y UF %s (%sx). Requiere validar la naturaleza de la inscripción antes de usarla como comparable.',
      v_quality->>'rol', v_quality->>'minUf', v_quality->>'maxUf', v_quality->>'priceRatio'
    );
    v_block := true;
  end if;

  if coalesce((v_quality->>'geographyConflict')::boolean, false) then
    v_messages := v_messages || format(
      'Conflicto geográfico: el KML canónico ubica la operación en %s, pero el comparable está clasificado como %s.',
      v_quality->>'kmlNeighborhood', v_quality->>'comparableNeighborhood'
    );
    v_block := true;
  end if;

  if coalesce((v_quality->>'priceOutlier')::boolean, false) then
    v_messages := v_messages || format(
      'Anomalía económica: UF/m² equivale a %sx la mediana de la misma tipología en el mismo barrio (%s UF/m²). Requiere validación.',
      v_quality->>'ufM2RatioToMedian', v_quality->>'neighborhoodTypeMedianUfM2'
    );
    v_block := true;
  end if;

  if cardinality(v_messages) > 0 then
    new.contradictions := array(
      select distinct message
      from unnest(coalesce(new.contradictions, array[]::text[]) || v_messages) as message
    );
    new.evidence := coalesce(new.evidence, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('cbrsQuality', v_quality));
  end if;

  if v_block and (new.selected = true or new.match_status = 'accepted') then
    raise exception 'Comparable CBRS bloqueado por control de calidad: %', array_to_string(v_messages, ' ');
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_cbrs_valuation_conflict_guard_v1() from public, anon, authenticated;

-- Re-evaluate only editable draft comparables. Approved/issued evidence is not touched.
update public.valuation_comparables vc
set evidence = vc.evidence
from public.valuation_cases vcase
where vcase.id = vc.valuation_case_id
  and vcase.status = 'draft'
  and lower(coalesce(vc.source_type, '')) = 'cbrs';
