create or replace function private.can_access_valuation_case_v1(target_case_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path=public,private,pg_temp
as $$
select
  coalesce((nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role'),'')='service_role'
  or (
    target_user_id is not null
    and exists (
      select 1
      from public.valuation_cases vc
      where vc.id=target_case_id
        and (
          vc.requested_by=target_user_id
          or vc.reviewed_by=target_user_id
          or vc.approved_by=target_user_id
          or private.has_management_profile_scope(vc.requested_by,target_user_id)
        )
    )
  );
$$;
revoke all on function private.can_access_valuation_case_v1(uuid,uuid) from public,anon,authenticated;

alter function public.valuation_house_lo_curro_advisory_v1(uuid) rename to valuation_house_lo_curro_advisory_v1_internal_20260831;
alter function public.valuation_house_lo_curro_advisory_v2(uuid) rename to valuation_house_lo_curro_advisory_v2_internal_20260831;
alter function public.valuation_house_regime_predict_case_v1(uuid) rename to valuation_house_regime_predict_case_v1_internal_20260831;
alter function public.valuation_house_regime_shadow_case_v1(uuid) rename to valuation_house_regime_shadow_case_v1_internal_20260831;
alter function public.valuation_professional_review_v1(uuid) rename to valuation_professional_review_v1_internal_20260831;

revoke execute on function public.valuation_house_lo_curro_advisory_v1_internal_20260831(uuid) from public,anon,authenticated,service_role;
revoke execute on function public.valuation_house_lo_curro_advisory_v2_internal_20260831(uuid) from public,anon,authenticated,service_role;
revoke execute on function public.valuation_house_regime_predict_case_v1_internal_20260831(uuid) from public,anon,authenticated,service_role;
revoke execute on function public.valuation_house_regime_shadow_case_v1_internal_20260831(uuid) from public,anon,authenticated,service_role;
revoke execute on function public.valuation_professional_review_v1_internal_20260831(uuid) from public,anon,authenticated,service_role;

create function public.valuation_house_lo_curro_advisory_v1(p_case_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp
as $$ begin if not private.can_access_valuation_case_v1(p_case_id) then return jsonb_build_object('available',false,'reason','case_not_found'); end if; return public.valuation_house_lo_curro_advisory_v1_internal_20260831(p_case_id); end $$;

create function public.valuation_house_lo_curro_advisory_v2(p_case_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,private,extensions,pg_temp
as $$ begin if not private.can_access_valuation_case_v1(p_case_id) then return jsonb_build_object('available',false,'reason','case_not_found'); end if; return public.valuation_house_lo_curro_advisory_v2_internal_20260831(p_case_id); end $$;

create function public.valuation_house_regime_predict_case_v1(p_case_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,private,extensions,pg_temp
as $$ begin if not private.can_access_valuation_case_v1(p_case_id) then return jsonb_build_object('available',false,'reason','case_not_found'); end if; return public.valuation_house_regime_predict_case_v1_internal_20260831(p_case_id); end $$;

create function public.valuation_house_regime_shadow_case_v1(p_case_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp
as $$ begin if not private.can_access_valuation_case_v1(p_case_id) then return jsonb_build_object('available',false,'reason','case_not_found'); end if; return public.valuation_house_regime_shadow_case_v1_internal_20260831(p_case_id); end $$;

create function public.valuation_professional_review_v1(p_case_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp
as $$ begin if not private.can_access_valuation_case_v1(p_case_id) then return jsonb_build_object('available',false,'reason','case_not_found'); end if; return public.valuation_professional_review_v1_internal_20260831(p_case_id); end $$;

revoke execute on function public.valuation_house_lo_curro_advisory_v1(uuid) from public,anon;
revoke execute on function public.valuation_house_lo_curro_advisory_v2(uuid) from public,anon;
revoke execute on function public.valuation_house_regime_predict_case_v1(uuid) from public,anon;
revoke execute on function public.valuation_house_regime_shadow_case_v1(uuid) from public,anon;
revoke execute on function public.valuation_professional_review_v1(uuid) from public,anon;
grant execute on function public.valuation_house_lo_curro_advisory_v1(uuid) to authenticated,service_role;
grant execute on function public.valuation_house_lo_curro_advisory_v2(uuid) to authenticated,service_role;
grant execute on function public.valuation_house_regime_predict_case_v1(uuid) to authenticated,service_role;
grant execute on function public.valuation_house_regime_shadow_case_v1(uuid) to authenticated,service_role;
grant execute on function public.valuation_professional_review_v1(uuid) to authenticated,service_role;
