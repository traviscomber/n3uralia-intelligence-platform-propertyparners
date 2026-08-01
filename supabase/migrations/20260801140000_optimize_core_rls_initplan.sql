-- Evaluate auth.uid() once per statement in the active valuation and management
-- workflows. This preserves policy semantics while avoiding per-row Auth calls.

alter policy management_task_comments_insert_scoped
on public.management_task_comments
with check (
  author_id = (select auth.uid())
  and public.can_access_management_task(task_id, (select auth.uid()))
);

alter policy management_task_comments_select_scoped
on public.management_task_comments
using (
  public.can_access_management_task(task_id, (select auth.uid()))
);

alter policy management_task_events_select_scoped
on public.management_task_events
using (
  public.can_access_management_task(task_id, (select auth.uid()))
);

alter policy management_tasks_insert_scoped
on public.management_tasks
with check (
  created_by = (select auth.uid())
  and (
    public.is_global_management_leader((select auth.uid()))
    or (
      lower(coalesce((
        select profiles.role
        from public.profiles
        where profiles.id = (select auth.uid())
      ), '')) in ('director', 'subdirector')
      and lower(coalesce(office, '')) = lower(coalesce((
        select profiles.team
        from public.profiles
        where profiles.id = (select auth.uid())
      ), ''))
      and (
        subject_profile_id is null
        or public.has_management_profile_scope(
          subject_profile_id,
          (select auth.uid())
        )
      )
      and (
        assigned_to is null
        or public.has_management_profile_scope(
          assigned_to,
          (select auth.uid())
        )
        or assigned_to = (select auth.uid())
      )
    )
  )
);

alter policy management_tasks_select_scoped
on public.management_tasks
using (
  public.is_global_management_leader((select auth.uid()))
  or created_by = (select auth.uid())
  or assigned_to = (select auth.uid())
  or (
    lower(coalesce((
      select profiles.role
      from public.profiles
      where profiles.id = (select auth.uid())
    ), '')) in ('director', 'subdirector')
    and lower(coalesce(office, '')) = lower(coalesce((
      select profiles.team
      from public.profiles
      where profiles.id = (select auth.uid())
    ), ''))
  )
);

alter policy management_tasks_update_scoped
on public.management_tasks
using (
  public.is_global_management_leader((select auth.uid()))
  or created_by = (select auth.uid())
  or (
    lower(coalesce((
      select profiles.role
      from public.profiles
      where profiles.id = (select auth.uid())
    ), '')) in ('director', 'subdirector')
    and lower(coalesce(office, '')) = lower(coalesce((
      select profiles.team
      from public.profiles
      where profiles.id = (select auth.uid())
    ), ''))
  )
)
with check (
  public.is_global_management_leader((select auth.uid()))
  or (
    lower(coalesce((
      select profiles.role
      from public.profiles
      where profiles.id = (select auth.uid())
    ), '')) in ('director', 'subdirector')
    and lower(coalesce(office, '')) = lower(coalesce((
      select profiles.team
      from public.profiles
      where profiles.id = (select auth.uid())
    ), ''))
    and (
      subject_profile_id is null
      or public.has_management_profile_scope(
        subject_profile_id,
        (select auth.uid())
      )
    )
  )
);

alter policy property_assignment_history_read_scope
on public.property_assignment_history
using (
  assigned_to = (select auth.uid())
  or public.has_management_profile_scope(
    assigned_to,
    (select auth.uid())
  )
);

alter policy property_assignments_manage_leadership
on public.property_assignments
using (
  public.has_management_profile_scope(
    assigned_to,
    (select auth.uid())
  )
  and assigned_to <> (select auth.uid())
)
with check (
  public.has_management_profile_scope(
    assigned_to,
    (select auth.uid())
  )
  and assigned_to <> (select auth.uid())
);

alter policy property_assignments_read_scope
on public.property_assignments
using (
  assigned_to = (select auth.uid())
  or public.has_management_profile_scope(
    assigned_to,
    (select auth.uid())
  )
);

alter policy "valuation versions insert scoped"
on public.valuation_case_versions
with check (
  created_by = (select auth.uid())
  and public.has_valuation_case_scope(
    valuation_case_id,
    (select auth.uid())
  )
);

alter policy "valuation versions read scoped"
on public.valuation_case_versions
using (
  public.has_valuation_case_scope(
    valuation_case_id,
    (select auth.uid())
  )
);

alter policy "valuation cases delete own"
on public.valuation_cases
using (
  requested_by = (select auth.uid())
  and status = 'draft'
);

alter policy "valuation cases insert own"
on public.valuation_cases
with check (
  requested_by = (select auth.uid())
);

alter policy "valuation cases read scoped"
on public.valuation_cases
using (
  requested_by = (select auth.uid())
  or reviewed_by = (select auth.uid())
  or approved_by = (select auth.uid())
  or public.has_management_profile_scope(
    requested_by,
    (select auth.uid())
  )
);

alter policy "valuation cases update scoped"
on public.valuation_cases
using (
  requested_by = (select auth.uid())
  or public.has_management_profile_scope(
    requested_by,
    (select auth.uid())
  )
)
with check (
  requested_by = (select auth.uid())
  or public.has_management_profile_scope(
    requested_by,
    (select auth.uid())
  )
);

alter policy "valuation comparables delete scoped"
on public.valuation_comparables
using (
  public.has_valuation_case_scope(
    valuation_case_id,
    (select auth.uid())
  )
);

alter policy "valuation comparables insert scoped"
on public.valuation_comparables
with check (
  public.has_valuation_case_scope(
    valuation_case_id,
    (select auth.uid())
  )
);

alter policy "valuation comparables read scoped"
on public.valuation_comparables
using (
  public.has_valuation_case_scope(
    valuation_case_id,
    (select auth.uid())
  )
);

alter policy "valuation comparables update scoped"
on public.valuation_comparables
using (
  public.has_valuation_case_scope(
    valuation_case_id,
    (select auth.uid())
  )
)
with check (
  public.has_valuation_case_scope(
    valuation_case_id,
    (select auth.uid())
  )
);

alter policy valuation_decision_log_insert
on public.valuation_decision_log
with check (
  actor_id = (select auth.uid())
  and public.has_valuation_case_scope(
    valuation_case_id,
    (select auth.uid())
  )
);

alter policy valuation_decision_log_read
on public.valuation_decision_log
using (
  public.has_valuation_case_scope(
    valuation_case_id,
    (select auth.uid())
  )
);
