-- tenant-isolation: shared-reference authenticated-read
begin;

revoke all on table public.market_data from anon;
revoke insert, update, delete, truncate, references, trigger on table public.market_data from authenticated;
grant select on table public.market_data to authenticated;

drop policy if exists "market_data_authenticated_read" on public.market_data;
drop policy if exists "market_data_read_all" on public.market_data;
drop policy if exists "market_data_insert_auth" on public.market_data;
drop policy if exists "market_data_update_auth" on public.market_data;
create policy "market_data_authenticated_read" on public.market_data for select to authenticated using (true);

revoke execute on function public.get_neighborhood_by_point(double precision,double precision) from public;
revoke execute on function public.get_neighborhood_by_point(double precision,double precision) from anon;
grant execute on function public.get_neighborhood_by_point(double precision,double precision) to authenticated, service_role;

commit;
