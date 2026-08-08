revoke select on table public.neighborhood_market_data from authenticated;
drop policy if exists neighborhood_market_data_authenticated_read on public.neighborhood_market_data;

create or replace view private.neighborhood_market_data_verified_v1
with (security_invoker = true)
as
select *
from public.neighborhood_market_data
where source_url is not null
  and btrim(source_url) <> ''
  and source is not null
  and btrim(source) <> '';

revoke all on private.neighborhood_market_data_verified_v1 from public, anon, authenticated;
grant usage on schema private to service_role;
grant select on private.neighborhood_market_data_verified_v1 to service_role;

comment on view private.neighborhood_market_data_verified_v1 is 'Server-only neighborhood market data eligible for production use. Rows without explicit source provenance remain quarantined in the source table and are not exposed to authenticated clients.';
