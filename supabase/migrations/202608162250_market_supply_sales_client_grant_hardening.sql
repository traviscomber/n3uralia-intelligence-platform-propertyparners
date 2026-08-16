-- Defense in depth for a server-owned market intelligence aggregate.
-- RLS was already enabled and no client policies exist; explicit grants are
-- revoked so anon/authenticated cannot retain table privileges accidentally.

revoke all on table public.market_supply_sales_intelligence from anon;
revoke all on table public.market_supply_sales_intelligence from authenticated;

grant all on table public.market_supply_sales_intelligence to service_role;

comment on table public.market_supply_sales_intelligence is
  'Server-owned market supply-vs-sales intelligence aggregate. Client roles have no direct table privileges; access is mediated by authorized server surfaces.';
