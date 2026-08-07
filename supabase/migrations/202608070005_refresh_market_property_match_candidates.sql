create or replace function public.refresh_market_property_match_candidates()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer := 0;
  v_updated integer := 0;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    if auth.uid() is null or not exists (
      select 1 from public.profiles
      where id = auth.uid()
        and lower(coalesce(role,'')) in ('admin','ceo','director','subdirector')
    ) then
      raise exception 'Insufficient permissions';
    end if;
  end if;

  with pairs as (
    select
      a.id as left_id,b.id as right_id,a.normalized_address,a.property_type,
      a.bedrooms as a_bedrooms,b.bedrooms as b_bedrooms,
      a.bathrooms as a_bathrooms,b.bathrooms as b_bathrooms,
      a.parking_spaces as a_parking,b.parking_spaces as b_parking,
      case
        when coalesce(a.useful_area_m2,a.built_area_m2) is not null
         and coalesce(b.useful_area_m2,b.built_area_m2) is not null
         and greatest(coalesce(a.useful_area_m2,a.built_area_m2),coalesce(b.useful_area_m2,b.built_area_m2)) > 0
        then abs(coalesce(a.useful_area_m2,a.built_area_m2)-coalesce(b.useful_area_m2,b.built_area_m2))
             / greatest(coalesce(a.useful_area_m2,a.built_area_m2),coalesce(b.useful_area_m2,b.built_area_m2))
        else null
      end as area_delta_ratio
    from public.market_properties a
    join public.market_properties b
      on a.id::text < b.id::text
     and a.property_type is not distinct from b.property_type
     and nullif(trim(a.normalized_address),'') is not null
     and lower(regexp_replace(trim(a.normalized_address),'\s+',' ','g')) = lower(regexp_replace(trim(b.normalized_address),'\s+',' ','g'))
  ), scored as (
    select *,
      least(0.95,
        0.72
        + case when area_delta_ratio is not null and area_delta_ratio <= 0.05 then 0.10 else 0 end
        + case when a_bedrooms is not null and b_bedrooms is not null and a_bedrooms=b_bedrooms then 0.05 else 0 end
        + case when a_bathrooms is not null and b_bathrooms is not null and a_bathrooms=b_bathrooms then 0.05 else 0 end
        + case when a_parking is not null and b_parking is not null and a_parking=b_parking then 0.03 else 0 end
      ) as match_score,
      jsonb_build_array(
        jsonb_build_object('signal','normalized_address_exact','value',normalized_address),
        jsonb_build_object('signal','property_type_equal','value',property_type),
        jsonb_build_object('signal','area_delta_ratio','value',area_delta_ratio),
        jsonb_build_object('signal','bedrooms_equal','value',case when a_bedrooms is not null and b_bedrooms is not null then a_bedrooms=b_bedrooms else null end),
        jsonb_build_object('signal','bathrooms_equal','value',case when a_bathrooms is not null and b_bathrooms is not null then a_bathrooms=b_bathrooms else null end),
        jsonb_build_object('signal','parking_equal','value',case when a_parking is not null and b_parking is not null then a_parking=b_parking else null end)
      ) as match_evidence,
      jsonb_strip_nulls(jsonb_build_object(
        'area',case when area_delta_ratio is not null and area_delta_ratio > 0.15 then jsonb_build_object('delta_ratio',area_delta_ratio) end,
        'bedrooms',case when a_bedrooms is not null and b_bedrooms is not null and abs(a_bedrooms-b_bedrooms)>1 then jsonb_build_object('left',a_bedrooms,'right',b_bedrooms) end,
        'bathrooms',case when a_bathrooms is not null and b_bathrooms is not null and abs(a_bathrooms-b_bathrooms)>1 then jsonb_build_object('left',a_bathrooms,'right',b_bathrooms) end
      )) as match_contradictions
    from pairs
  ), upserted as (
    insert into public.market_property_matches(
      left_entity_type,left_entity_id,right_entity_type,right_entity_id,score,status,evidence,contradictions
    )
    select 'property',left_id,'property',right_id,match_score,
      case when match_score >= 0.88 and match_contradictions='{}'::jsonb then 'candidate_high' else 'candidate_medium' end,
      match_evidence,match_contradictions
    from scored
    on conflict (left_entity_type,left_entity_id,right_entity_type,right_entity_id)
    do update set
      score=excluded.score,
      status=case when public.market_property_matches.status='confirmed' then public.market_property_matches.status else excluded.status end,
      evidence=excluded.evidence,
      contradictions=excluded.contradictions
    returning (xmax = 0) as inserted
  )
  select count(*) filter (where inserted),count(*) filter (where not inserted)
  into v_inserted,v_updated from upserted;

  return jsonb_build_object('inserted',v_inserted,'updated',v_updated,'generated_at',now());
end;
$$;

revoke all on function public.refresh_market_property_match_candidates() from public;
grant execute on function public.refresh_market_property_match_candidates() to authenticated;
