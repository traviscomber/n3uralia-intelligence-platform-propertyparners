-- Replace broad FOR ALL write policies with command-specific policies.
-- This removes duplicate permissive SELECT evaluation while preserving the
-- exact read and write authorization boundaries.

-- Property assignments: scoped read plus leadership writes.
drop policy if exists property_assignments_manage_leadership
  on public.property_assignments;
drop policy if exists property_assignments_insert_leadership
  on public.property_assignments;
drop policy if exists property_assignments_update_leadership
  on public.property_assignments;
drop policy if exists property_assignments_delete_leadership
  on public.property_assignments;

create policy property_assignments_insert_leadership
on public.property_assignments
for insert
to authenticated
with check (
  public.has_management_profile_scope(assigned_to, (select auth.uid()))
  and assigned_to <> (select auth.uid())
);

create policy property_assignments_update_leadership
on public.property_assignments
for update
to authenticated
using (
  public.has_management_profile_scope(assigned_to, (select auth.uid()))
  and assigned_to <> (select auth.uid())
)
with check (
  public.has_management_profile_scope(assigned_to, (select auth.uid()))
  and assigned_to <> (select auth.uid())
);

create policy property_assignments_delete_leadership
on public.property_assignments
for delete
to authenticated
using (
  public.has_management_profile_scope(assigned_to, (select auth.uid()))
  and assigned_to <> (select auth.uid())
);

-- Alert rules: all management leaders read; only global leaders write.
drop policy if exists "executive manage alert rules"
  on public.management_alert_rules;
drop policy if exists management_alert_rules_insert_executive
  on public.management_alert_rules;
drop policy if exists management_alert_rules_update_executive
  on public.management_alert_rules;
drop policy if exists management_alert_rules_delete_executive
  on public.management_alert_rules;

create policy management_alert_rules_insert_executive
on public.management_alert_rules
for insert
to authenticated
with check (
  public.is_global_management_leader((select auth.uid()))
);

create policy management_alert_rules_update_executive
on public.management_alert_rules
for update
to authenticated
using (
  public.is_global_management_leader((select auth.uid()))
)
with check (
  public.is_global_management_leader((select auth.uid()))
);

create policy management_alert_rules_delete_executive
on public.management_alert_rules
for delete
to authenticated
using (
  public.is_global_management_leader((select auth.uid()))
);

-- Report schedules: management leaders read; global leaders write.
drop policy if exists "executives manage report schedules"
  on public.management_report_schedules;
drop policy if exists management_report_schedules_insert_executive
  on public.management_report_schedules;
drop policy if exists management_report_schedules_update_executive
  on public.management_report_schedules;
drop policy if exists management_report_schedules_delete_executive
  on public.management_report_schedules;

create policy management_report_schedules_insert_executive
on public.management_report_schedules
for insert
to authenticated
with check (
  public.is_global_management_leader((select auth.uid()))
);

create policy management_report_schedules_update_executive
on public.management_report_schedules
for update
to authenticated
using (
  public.is_global_management_leader((select auth.uid()))
)
with check (
  public.is_global_management_leader((select auth.uid()))
);

create policy management_report_schedules_delete_executive
on public.management_report_schedules
for delete
to authenticated
using (
  public.is_global_management_leader((select auth.uid()))
);

-- Report distributions: management leaders both read and write.
drop policy if exists "management leaders manage report distributions"
  on public.management_report_distributions;
drop policy if exists management_report_distributions_insert_leader
  on public.management_report_distributions;
drop policy if exists management_report_distributions_update_leader
  on public.management_report_distributions;
drop policy if exists management_report_distributions_delete_leader
  on public.management_report_distributions;

create policy management_report_distributions_insert_leader
on public.management_report_distributions
for insert
to authenticated
with check (
  public.is_management_leader((select auth.uid()))
);

create policy management_report_distributions_update_leader
on public.management_report_distributions
for update
to authenticated
using (
  public.is_management_leader((select auth.uid()))
)
with check (
  public.is_management_leader((select auth.uid()))
);

create policy management_report_distributions_delete_leader
on public.management_report_distributions
for delete
to authenticated
using (
  public.is_management_leader((select auth.uid()))
);
