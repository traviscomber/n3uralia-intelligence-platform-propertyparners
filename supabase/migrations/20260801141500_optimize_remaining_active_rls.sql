-- Finish auth initplan optimization for the remaining active contractual and
-- operational policies. Policy semantics are unchanged; auth context is read
-- once per statement instead of once per row.

alter policy external_market_benchmarks_insert_auth
on public.external_market_benchmarks
with check ((select auth.role()) = 'authenticated');

alter policy kpi_authenticated_read
on public.kpi_snapshots
using ((select auth.role()) = 'authenticated');

alter policy "management alert rules read leaders"
on public.management_alert_rules
using (public.is_management_leader((select auth.uid())));

alter policy "management change log read scoped"
on public.management_change_log
using (
  public.is_global_management_leader((select auth.uid()))
  or changed_by = (select auth.uid())
);

alter policy "management leaders insert change log"
on public.management_change_log
with check (
  changed_by = (select auth.uid())
  and public.is_management_leader((select auth.uid()))
);

alter policy "management leaders create import runs"
on public.management_import_runs
with check (
  requested_by = (select auth.uid())
  and public.is_management_leader((select auth.uid()))
);

alter policy "management leaders read import runs"
on public.management_import_runs
using (
  public.is_global_management_leader((select auth.uid()))
  or requested_by = (select auth.uid())
);

alter policy "management leaders update import runs"
on public.management_import_runs
using (
  public.is_global_management_leader((select auth.uid()))
  or requested_by = (select auth.uid())
)
with check (
  public.is_global_management_leader((select auth.uid()))
  or requested_by = (select auth.uid())
);

alter policy "management leaders read report distributions"
on public.management_report_distributions
using (public.is_management_leader((select auth.uid())));

alter policy "management leaders create management reports"
on public.management_report_runs
with check (
  generated_by = (select auth.uid())
  and (
    (
      entity_id is null
      and public.is_global_management_leader((select auth.uid()))
    )
    or (
      entity_id is not null
      and (
        public.is_global_management_leader((select auth.uid()))
        or (
          lower(coalesce((
            select profiles.role
            from public.profiles
            where profiles.id = (select auth.uid())
          ), '')) in ('director', 'subdirector')
          and public.can_access_management_entity(entity_id)
        )
      )
    )
  )
);

alter policy "management leaders update management reports"
on public.management_report_runs
using (
  generated_by = (select auth.uid())
  or public.is_global_management_leader((select auth.uid()))
  or (entity_id is not null and public.can_access_management_entity(entity_id))
)
with check (
  generated_by = (select auth.uid())
  or public.is_global_management_leader((select auth.uid()))
  or (entity_id is not null and public.can_access_management_entity(entity_id))
);

alter policy "management leaders read report schedules"
on public.management_report_schedules
using (public.is_management_leader((select auth.uid())));

alter policy market_data_authenticated_read
on public.market_data
using ((select auth.role()) = 'authenticated');

alter policy market_ingestion_runs_authenticated_read
on public.market_ingestion_runs
using ((select auth.role()) = 'authenticated');

alter policy market_properties_canonical_authenticated_read
on public.market_properties_canonical
using ((select auth.role()) = 'authenticated');

alter policy market_property_observations_authenticated_read
on public.market_property_observations
using ((select auth.role()) = 'authenticated');

alter policy neighborhood_market_data_insert_auth
on public.neighborhood_market_data
with check ((select auth.role()) = 'authenticated');

alter policy properties_authenticated_read
on public.properties
using ((select auth.role()) = 'authenticated');

alter policy weekly_reports_insert_auth
on public.weekly_reports
with check ((select auth.role()) = 'authenticated');

alter policy weekly_reports_update_auth
on public.weekly_reports
using ((select auth.role()) = 'authenticated')
with check ((select auth.role()) = 'authenticated');
