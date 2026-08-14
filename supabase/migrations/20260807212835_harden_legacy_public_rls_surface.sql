-- tenant-isolation: shared-reference authenticated-read
begin;

revoke all on table public.external_market_benchmarks from anon;
revoke all on table public.neighborhood_market_data from anon;
revoke all on table public.neighborhoods from anon;
revoke all on table public.properties from anon;
revoke all on table public.weekly_reports from anon;

revoke insert, update, delete, truncate, references, trigger on table public.external_market_benchmarks from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.neighborhood_market_data from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.neighborhoods from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.properties from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.weekly_reports from authenticated;

grant select on table public.external_market_benchmarks to authenticated;
grant select on table public.neighborhood_market_data to authenticated;
grant select on table public.neighborhoods to authenticated;
grant select on table public.properties to authenticated;
grant select on table public.weekly_reports to authenticated;

drop policy if exists "external_market_benchmarks_read_all" on public.external_market_benchmarks;
drop policy if exists "external_market_benchmarks_insert_auth" on public.external_market_benchmarks;
create policy "external_market_benchmarks_authenticated_read" on public.external_market_benchmarks for select to authenticated using (true);

drop policy if exists "neighborhood_market_data_read_all" on public.neighborhood_market_data;
drop policy if exists "neighborhood_market_data_insert_auth" on public.neighborhood_market_data;
create policy "neighborhood_market_data_authenticated_read" on public.neighborhood_market_data for select to authenticated using (true);

drop policy if exists "Allow read neighborhoods" on public.neighborhoods;
create policy "neighborhoods_authenticated_read" on public.neighborhoods for select to authenticated using (true);

drop policy if exists "properties_authenticated_read" on public.properties;
create policy "properties_authenticated_read" on public.properties for select to authenticated using (true);

drop policy if exists "weekly_reports_read_all" on public.weekly_reports;
drop policy if exists "weekly_reports_insert_auth" on public.weekly_reports;
drop policy if exists "weekly_reports_update_auth" on public.weekly_reports;
create policy "weekly_reports_authenticated_read" on public.weekly_reports for select to authenticated using (true);

commit;
