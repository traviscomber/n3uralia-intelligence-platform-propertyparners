-- Prevent authenticated callers from supplying another user's identity to
-- SECURITY DEFINER scope helpers exposed through PostgREST.
--
-- Service-role and direct database maintenance sessions have no auth.uid(),
-- so existing administrative and trigger behavior remains available.

create or replace function public.is_global_management_leader(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (auth.uid() is null or user_id = auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = user_id
        and lower(coalesce(p.role, '')) = any(array['admin', 'ceo'])
    );
$$;

create or replace function public.is_management_leader(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (auth.uid() is null or user_id = auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = user_id
        and lower(coalesce(p.role, '')) = any(array['admin', 'ceo', 'director', 'subdirector'])
    );
$$;

create or replace function public.has_management_profile_scope(
  target_profile_id uuid,
  viewer_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (auth.uid() is null or viewer_id = auth.uid())
    and (
      target_profile_id = viewer_id
      or public.is_global_management_leader(viewer_id)
      or exists (
        select 1
        from public.profiles viewer
        join public.management_entities target_partner
          on target_partner.profile_id = target_profile_id
         and target_partner.entity_type = 'partner'
         and target_partner.active = true
        join public.management_entities target_office
          on target_office.id = target_partner.parent_id
         and target_office.entity_type = 'office'
         and target_office.active = true
        where viewer.id = viewer_id
          and lower(coalesce(viewer.role, '')) = any(array['director', 'subdirector'])
          and public.normalize_management_text(viewer.team) =
              public.normalize_management_text(target_office.name)
      )
    );
$$;

create or replace function public.has_valuation_case_scope(
  target_case_id uuid,
  viewer_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (auth.uid() is null or viewer_id = auth.uid())
    and exists (
      select 1
      from public.valuation_cases vc
      where vc.id = target_case_id
        and (
          vc.requested_by = viewer_id
          or vc.reviewed_by = viewer_id
          or vc.approved_by = viewer_id
          or public.has_management_profile_scope(vc.requested_by, viewer_id)
        )
    );
$$;

create or replace function public.can_access_management_task(
  p_task_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (auth.uid() is null or p_user_id = auth.uid())
    and exists (
      select 1
      from public.management_tasks t
      where t.id = p_task_id
        and (
          public.is_global_management_leader(p_user_id)
          or t.created_by = p_user_id
          or t.assigned_to = p_user_id
          or (
            lower(coalesce((select role from public.profiles where id = p_user_id), ''))
              in ('director', 'subdirector')
            and lower(coalesce(t.office, '')) = lower(coalesce(
              (select team from public.profiles where id = p_user_id),
              ''
            ))
          )
        )
    );
$$;

create or replace function public.is_own_management_entity(
  target_entity_id uuid,
  user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (auth.uid() is null or user_id = auth.uid())
    and exists (
      select 1
      from public.management_entities e
      where e.id = target_entity_id
        and e.profile_id = user_id
    );
$$;

create or replace function public.is_own_or_parent_management_entity(
  target_entity_id uuid,
  user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (auth.uid() is null or user_id = auth.uid())
    and (
      exists (
        select 1
        from public.management_entities own
        where own.profile_id = user_id
          and own.active = true
          and (own.id = target_entity_id or own.parent_id = target_entity_id)
      )
      or public.is_global_management_leader(user_id)
      or exists (
        select 1
        from public.profiles viewer
        join public.management_entities target
          on target.id = target_entity_id
         and target.active = true
        left join public.management_entities target_office
          on target_office.id = case
            when target.entity_type = 'office' then target.id
            else target.parent_id
          end
         and target_office.entity_type = 'office'
         and target_office.active = true
        where viewer.id = user_id
          and lower(coalesce(viewer.role, '')) = any(array['director', 'subdirector'])
          and public.normalize_management_text(viewer.team) =
              public.normalize_management_text(target_office.name)
      )
    );
$$;

create or replace function public.valuation_case_has_minimum_comparables(
  target_case_id uuid,
  minimum_count integer default 3
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (auth.uid() is null or public.has_valuation_case_scope(target_case_id, auth.uid()))
    and (
      select count(*) >= minimum_count
      from public.valuation_comparables
      where valuation_case_id = target_case_id
        and selected = true
        and match_status = 'accepted'
    );
$$;
