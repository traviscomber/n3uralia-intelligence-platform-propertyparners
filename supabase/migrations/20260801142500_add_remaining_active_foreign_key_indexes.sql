-- Complete covering indexes for foreign keys in active management reporting.

create index if not exists kpi_snapshots_director_id_idx
  on public.kpi_snapshots (director_id);

create index if not exists management_report_schedules_entity_id_idx
  on public.management_report_schedules (entity_id);

create index if not exists management_report_schedules_created_by_idx
  on public.management_report_schedules (created_by);
