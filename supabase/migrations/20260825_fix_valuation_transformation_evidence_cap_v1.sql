create or replace function public.valuation_ml_upsert_transformation_evidence_v1(
  p_rol text,
  p_address text,
  p_evidence_type text,
  p_source_url text,
  p_source_observed_at timestamptz,
  p_effective_date date,
  p_verified boolean,
  p_strength smallint,
  p_built_area_override numeric,
  p_construction_year_override integer,
  p_notes text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  target_id uuid;
  normalized_strength smallint := greatest(1, least(coalesce(p_strength,1),3));
  eligible boolean := coalesce(p_verified, false) and greatest(1, least(coalesce(p_strength,1),3)) >= 2;
begin
  if coalesce(trim(p_rol), '') = '' and coalesce(trim(p_address), '') = '' then
    raise exception 'rol or address required';
  end if;
  if coalesce(trim(p_evidence_type), '') = '' then
    raise exception 'evidence type required';
  end if;

  select id into target_id
  from private.valuation_ml_transformation_evidence
  where coalesce(rol, '') = coalesce(trim(p_rol), '')
    and coalesce(address, '') = coalesce(trim(p_address), '')
    and evidence_type = trim(p_evidence_type)
    and coalesce(source_url, '') = coalesce(trim(p_source_url), '')
  order by updated_at desc
  limit 1;

  if target_id is null then
    insert into private.valuation_ml_transformation_evidence(
      rol,address,evidence_type,source_url,source_observed_at,effective_date,verified,
      eligible_for_shadow_adjustment,strength,built_area_override,construction_year_override,
      adjustment_cap_pct,notes,metadata
    ) values (
      nullif(trim(p_rol), ''), nullif(trim(p_address), ''), trim(p_evidence_type), nullif(trim(p_source_url), ''),
      coalesce(p_source_observed_at, now()), p_effective_date, coalesce(p_verified,false), eligible,
      normalized_strength, p_built_area_override, p_construction_year_override,
      case when eligible then 0.20 else 0 end, p_notes, coalesce(p_metadata,'{}'::jsonb)
    ) returning id into target_id;
  else
    update private.valuation_ml_transformation_evidence set
      source_observed_at = coalesce(p_source_observed_at, source_observed_at),
      effective_date = p_effective_date,
      verified = coalesce(p_verified,false),
      eligible_for_shadow_adjustment = eligible,
      strength = normalized_strength,
      built_area_override = p_built_area_override,
      construction_year_override = p_construction_year_override,
      adjustment_cap_pct = case when eligible then 0.20 else 0 end,
      notes = p_notes,
      metadata = coalesce(p_metadata,'{}'::jsonb),
      updated_at = now()
    where id = target_id;
  end if;

  return target_id;
end;
$$;

revoke all on function public.valuation_ml_upsert_transformation_evidence_v1(text,text,text,text,timestamptz,date,boolean,smallint,numeric,integer,text,jsonb) from public, anon, authenticated;
grant execute on function public.valuation_ml_upsert_transformation_evidence_v1(text,text,text,text,timestamptz,date,boolean,smallint,numeric,integer,text,jsonb) to service_role;
