-- Restrict management report mutation to organizational leadership.
-- Read access remains scoped by management entity visibility, but assigned
-- executives must not be able to update persisted management reports.

drop policy if exists "management leaders update management reports"
  on public.management_report_runs;

create policy "management leaders update management reports"
on public.management_report_runs
for update
to authenticated
using (
  private.is_global_management_leader(auth.uid())
  or (
    generated_by = auth.uid()
    and entity_id is not null
    and lower(coalesce((select role from public.profiles where id = auth.uid()), '')) in ('director', 'subdirector')
    and private.can_access_management_entity(entity_id)
  )
)
with check (
  private.is_global_management_leader(auth.uid())
  or (
    generated_by = auth.uid()
    and entity_id is not null
    and lower(coalesce((select role from public.profiles where id = auth.uid()), '')) in ('director', 'subdirector')
    and private.can_access_management_entity(entity_id)
  )
);

comment on policy "management leaders update management reports"
on public.management_report_runs is
  'Only global management leaders or the director/subdirector who generated an in-scope report may update it. Executives retain scoped read access only.';
