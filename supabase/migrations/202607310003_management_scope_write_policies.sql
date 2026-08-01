-- Complete tenant/business-scope enforcement for Módulo III.

-- Metrics and goals may only be written inside the caller's visible scope.
drop policy if exists "management leaders write metrics" on management_metric_values;
drop policy if exists "management leaders write goals" on management_goals;
drop policy if exists "management leaders update alerts" on management_alerts;

create policy "scoped management leaders write metrics"
on management_metric_values for all to authenticated
using (
  lower(coalesce((select role from profiles where id = auth.uid()),'')) in ('admin','ceo','director','subdirector')
  and can_access_management_entity(entity_id)
)
with check (
  lower(coalesce((select role from profiles where id = auth.uid()),'')) in ('admin','ceo','director','subdirector')
  and can_access_management_entity(entity_id)
);

create policy "scoped management leaders write goals"
on management_goals for all to authenticated
using (
  lower(coalesce((select role from profiles where id = auth.uid()),'')) in ('admin','ceo','director','subdirector')
  and can_access_management_entity(entity_id)
)
with check (
  lower(coalesce((select role from profiles where id = auth.uid()),'')) in ('admin','ceo','director','subdirector')
  and can_access_management_entity(entity_id)
);

create policy "scoped management leaders update alerts"
on management_alerts for all to authenticated
using (
  lower(coalesce((select role from profiles where id = auth.uid()),'')) in ('admin','ceo','director','subdirector')
  and can_access_management_entity(entity_id)
)
with check (
  lower(coalesce((select role from profiles where id = auth.uid()),'')) in ('admin','ceo','director','subdirector')
  and can_access_management_entity(entity_id)
);

-- Reports containing a business entity inherit that entity's scope.
-- Global reports are reserved for CEO and technical admin.
drop policy if exists "authenticated read management reports" on management_report_runs;
drop policy if exists "management leaders create management reports" on management_report_runs;
drop policy if exists "management leaders update management reports" on management_report_runs;

create policy "scoped read management reports"
on management_report_runs for select to authenticated
using (
  case
    when entity_id is null then lower(coalesce((select role from profiles where id = auth.uid()),'')) in ('admin','ceo')
    else can_access_management_entity(entity_id)
  end
);

create policy "scoped create management reports"
on management_report_runs for insert to authenticated
with check (
  lower(coalesce((select role from profiles where id = auth.uid()),'')) in ('admin','ceo','director','subdirector')
  and (
    (entity_id is null and lower(coalesce((select role from profiles where id = auth.uid()),'')) in ('admin','ceo'))
    or (entity_id is not null and can_access_management_entity(entity_id))
  )
);

create policy "scoped update management reports"
on management_report_runs for update to authenticated
using (
  lower(coalesce((select role from profiles where id = auth.uid()),'')) in ('admin','ceo','director','subdirector')
  and (
    (entity_id is null and lower(coalesce((select role from profiles where id = auth.uid()),'')) in ('admin','ceo'))
    or (entity_id is not null and can_access_management_entity(entity_id))
  )
)
with check (
  lower(coalesce((select role from profiles where id = auth.uid()),'')) in ('admin','ceo','director','subdirector')
  and (
    (entity_id is null and lower(coalesce((select role from profiles where id = auth.uid()),'')) in ('admin','ceo'))
    or (entity_id is not null and can_access_management_entity(entity_id))
  )
);

-- Import execution visibility follows requester role. Partners cannot inspect administrative imports.
drop policy if exists "management leaders read import runs" on management_import_runs;
drop policy if exists "management leaders create import runs" on management_import_runs;
drop policy if exists "management leaders update import runs" on management_import_runs;

create policy "management leaders read own import runs"
on management_import_runs for select to authenticated
using (
  lower(coalesce((select role from profiles where id = auth.uid()),'')) in ('admin','ceo')
  or requested_by = auth.uid()
);

create policy "management leaders create own import runs"
on management_import_runs for insert to authenticated
with check (
  lower(coalesce((select role from profiles where id = auth.uid()),'')) in ('admin','ceo','director','subdirector')
  and requested_by = auth.uid()
);

create policy "management leaders update own import runs"
on management_import_runs for update to authenticated
using (
  lower(coalesce((select role from profiles where id = auth.uid()),'')) in ('admin','ceo')
  or requested_by = auth.uid()
)
with check (
  lower(coalesce((select role from profiles where id = auth.uid()),'')) in ('admin','ceo')
  or requested_by = auth.uid()
);

-- Audit log is privileged; directors/subdirectors can see only their own actions.
drop policy if exists "executives read management change log" on management_change_log;
drop policy if exists "management leaders insert change log" on management_change_log;

create policy "scoped read management change log"
on management_change_log for select to authenticated
using (
  lower(coalesce((select role from profiles where id = auth.uid()),'')) in ('admin','ceo')
  or changed_by = auth.uid()
);

create policy "management leaders insert own change log"
on management_change_log for insert to authenticated
with check (
  lower(coalesce((select role from profiles where id = auth.uid()),'')) in ('admin','ceo','director','subdirector')
  and changed_by = auth.uid()
);
