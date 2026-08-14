begin;

revoke all on table public.market_sources from anon;
revoke all on table public.market_neighborhoods from anon;
revoke all on table public.market_properties from anon;
revoke all on table public.market_listings from anon;
revoke all on table public.market_transactions from anon;
revoke all on table public.market_property_matches from anon;
revoke all on table public.market_metric_snapshots from anon;
revoke all on table public.valuation_case_versions from anon;
revoke all on table public.valuation_adjustment_catalog from anon;
revoke all on table public.valuation_comparables from anon;

revoke insert, update, delete, truncate, references, trigger on table public.valuation_adjustment_catalog from authenticated;
grant select on table public.valuation_adjustment_catalog to authenticated;

commit;
