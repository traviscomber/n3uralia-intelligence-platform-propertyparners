-- Reconcile a clean install and the connected Property Partners database.
-- Every operation is safe to run again.

begin;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('ceo','director','subdirector','seller','admin'));

-- Privileged RPCs require an authenticated session; trigger helpers are never public endpoints.
revoke execute on function public.apply_valuation_comparable_decision(uuid,uuid,text,numeric,text,text) from public, anon;
grant execute on function public.apply_valuation_comparable_decision(uuid,uuid,text,numeric,text,text) to authenticated;
revoke execute on function public.has_management_profile_scope(uuid,uuid) from public, anon;
grant execute on function public.has_management_profile_scope(uuid,uuid) to authenticated;
revoke execute on function public.has_valuation_case_scope(uuid,uuid) from public, anon;
grant execute on function public.has_valuation_case_scope(uuid,uuid) to authenticated;
revoke execute on function public.is_global_management_leader(uuid) from public, anon;
grant execute on function public.is_global_management_leader(uuid) to authenticated;
revoke execute on function public.can_access_management_entity(uuid) from public, anon;
grant execute on function public.can_access_management_entity(uuid) to authenticated;
revoke execute on function public.evaluate_management_alerts(date,date) from public, anon;
grant execute on function public.evaluate_management_alerts(date,date) to authenticated;

alter function public.normalize_management_text(text) set search_path = public;
alter function public.set_management_task_updated_at() set search_path = public;
alter function public.touch_property_assignment_updated_at() set search_path = public;

revoke all on function public.enforce_valuation_minimum_comparables() from public, anon, authenticated;
revoke all on function public.log_management_task_change() from public, anon, authenticated;
revoke all on function public.log_management_task_comment() from public, anon, authenticated;
revoke all on function public.log_property_assignment_change() from public, anon, authenticated;
revoke all on function public.protect_valuation_case_update() from public, anon, authenticated;
revoke all on function public.protect_valuation_comparable_mutation() from public, anon, authenticated;

-- Remove both legacy ALL policies and any prior copy of the replacement policies.
drop policy if exists "executive manage management entities" on public.management_entities;
drop policy if exists "executive insert management entities" on public.management_entities;
drop policy if exists "executive update management entities" on public.management_entities;
drop policy if exists "executive delete management entities" on public.management_entities;
drop policy if exists "executives manage management assignments" on public.management_entity_assignments;
drop policy if exists "executives insert management assignments" on public.management_entity_assignments;
drop policy if exists "executives update management assignments" on public.management_entity_assignments;
drop policy if exists "executives delete management assignments" on public.management_entity_assignments;
drop policy if exists "management leaders write metrics" on public.management_metric_values;
drop policy if exists "management leaders insert metrics" on public.management_metric_values;
drop policy if exists "management leaders update metrics" on public.management_metric_values;
drop policy if exists "management leaders delete metrics" on public.management_metric_values;
drop policy if exists "management leaders write goals" on public.management_goals;
drop policy if exists "management leaders insert goals" on public.management_goals;
drop policy if exists "management leaders update goals" on public.management_goals;
drop policy if exists "management leaders delete goals" on public.management_goals;
drop policy if exists "management leaders update alerts" on public.management_alerts;
drop policy if exists "management leaders insert alerts" on public.management_alerts;
drop policy if exists "management leaders delete alerts" on public.management_alerts;

create policy "executive insert management entities" on public.management_entities for insert to authenticated
with check (public.is_global_management_leader((select auth.uid())));
create policy "executive update management entities" on public.management_entities for update to authenticated
using (public.is_global_management_leader((select auth.uid())))
with check (public.is_global_management_leader((select auth.uid())));
create policy "executive delete management entities" on public.management_entities for delete to authenticated
using (public.is_global_management_leader((select auth.uid())));

create policy "executives insert management assignments" on public.management_entity_assignments for insert to authenticated
with check (public.is_global_management_leader((select auth.uid())));
create policy "executives update management assignments" on public.management_entity_assignments for update to authenticated
using (public.is_global_management_leader((select auth.uid())))
with check (public.is_global_management_leader((select auth.uid())));
create policy "executives delete management assignments" on public.management_entity_assignments for delete to authenticated
using (public.is_global_management_leader((select auth.uid())));

create policy "management leaders insert metrics" on public.management_metric_values for insert to authenticated
with check (
  public.is_global_management_leader((select auth.uid()))
  or (lower(coalesce((select role from public.profiles where id=(select auth.uid())),'')) in ('director','subdirector')
      and public.can_access_management_entity(entity_id))
);
create policy "management leaders update metrics" on public.management_metric_values for update to authenticated
using (
  public.is_global_management_leader((select auth.uid()))
  or (lower(coalesce((select role from public.profiles where id=(select auth.uid())),'')) in ('director','subdirector')
      and public.can_access_management_entity(entity_id))
)
with check (
  public.is_global_management_leader((select auth.uid()))
  or (lower(coalesce((select role from public.profiles where id=(select auth.uid())),'')) in ('director','subdirector')
      and public.can_access_management_entity(entity_id))
);
create policy "management leaders delete metrics" on public.management_metric_values for delete to authenticated
using (
  public.is_global_management_leader((select auth.uid()))
  or (lower(coalesce((select role from public.profiles where id=(select auth.uid())),'')) in ('director','subdirector')
      and public.can_access_management_entity(entity_id))
);

create policy "management leaders insert goals" on public.management_goals for insert to authenticated
with check (
  public.is_global_management_leader((select auth.uid()))
  or (lower(coalesce((select role from public.profiles where id=(select auth.uid())),'')) in ('director','subdirector')
      and public.can_access_management_entity(entity_id))
);
create policy "management leaders update goals" on public.management_goals for update to authenticated
using (
  public.is_global_management_leader((select auth.uid()))
  or (lower(coalesce((select role from public.profiles where id=(select auth.uid())),'')) in ('director','subdirector')
      and public.can_access_management_entity(entity_id))
)
with check (
  public.is_global_management_leader((select auth.uid()))
  or (lower(coalesce((select role from public.profiles where id=(select auth.uid())),'')) in ('director','subdirector')
      and public.can_access_management_entity(entity_id))
);
create policy "management leaders delete goals" on public.management_goals for delete to authenticated
using (
  public.is_global_management_leader((select auth.uid()))
  or (lower(coalesce((select role from public.profiles where id=(select auth.uid())),'')) in ('director','subdirector')
      and public.can_access_management_entity(entity_id))
);

create policy "management leaders insert alerts" on public.management_alerts for insert to authenticated
with check (
  public.is_global_management_leader((select auth.uid()))
  or (lower(coalesce((select role from public.profiles where id=(select auth.uid())),'')) in ('director','subdirector')
      and public.can_access_management_entity(entity_id))
);
create policy "management leaders update alerts" on public.management_alerts for update to authenticated
using (
  public.is_global_management_leader((select auth.uid()))
  or (lower(coalesce((select role from public.profiles where id=(select auth.uid())),'')) in ('director','subdirector')
      and public.can_access_management_entity(entity_id))
)
with check (
  public.is_global_management_leader((select auth.uid()))
  or (lower(coalesce((select role from public.profiles where id=(select auth.uid())),'')) in ('director','subdirector')
      and public.can_access_management_entity(entity_id))
);
create policy "management leaders delete alerts" on public.management_alerts for delete to authenticated
using (
  public.is_global_management_leader((select auth.uid()))
  or (lower(coalesce((select role from public.profiles where id=(select auth.uid())),'')) in ('director','subdirector')
      and public.can_access_management_entity(entity_id))
);

-- Cover foreign keys used by management and valuation workflows.
create index if not exists management_alert_rules_metric_code_idx on public.management_alert_rules(metric_code);
create index if not exists management_alerts_rule_id_idx on public.management_alerts(rule_id);
create index if not exists management_alerts_metric_code_idx on public.management_alerts(metric_code);
create index if not exists management_alerts_assigned_to_idx on public.management_alerts(assigned_to);
create index if not exists management_alerts_acknowledged_by_idx on public.management_alerts(acknowledged_by);
create index if not exists management_alerts_resolved_by_idx on public.management_alerts(resolved_by);
create index if not exists management_goals_metric_code_idx on public.management_goals(metric_code);
create index if not exists management_goals_approved_by_idx on public.management_goals(approved_by);
create index if not exists management_import_runs_requested_by_idx on public.management_import_runs(requested_by);
create index if not exists management_change_log_changed_by_idx on public.management_change_log(changed_by);
create index if not exists management_report_runs_entity_id_idx on public.management_report_runs(entity_id);
create index if not exists management_report_runs_generated_by_idx on public.management_report_runs(generated_by);
create index if not exists valuation_cases_requested_by_idx on public.valuation_cases(requested_by);
create index if not exists valuation_cases_reviewed_by_idx on public.valuation_cases(reviewed_by);
create index if not exists valuation_cases_approved_by_idx on public.valuation_cases(approved_by);
create index if not exists valuation_cases_organization_id_idx on public.valuation_cases(organization_id);
create index if not exists valuation_case_versions_created_by_idx on public.valuation_case_versions(created_by);
create index if not exists valuation_comparables_selected_by_idx on public.valuation_comparables(selected_by);
create index if not exists valuation_comparables_excluded_by_idx on public.valuation_comparables(excluded_by);
create index if not exists valuation_decision_log_actor_id_idx on public.valuation_decision_log(actor_id);
create index if not exists valuation_decision_log_comparable_id_idx on public.valuation_decision_log(comparable_id);

commit;
