alter view public.management_monthly_source_aggregates set (security_invoker = true);
alter view public.management_verified_monthly_source_aggregates set (security_invoker = true);

alter table public.valuation_house_regime_router_rules enable row level security;
revoke all on table public.valuation_house_regime_router_rules from anon, authenticated;
grant select on table public.valuation_house_regime_router_rules to service_role;
