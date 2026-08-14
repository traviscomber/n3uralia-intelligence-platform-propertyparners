begin;

revoke insert, update, delete, truncate, references, trigger on table public.market_identity_decisions from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.market_listings from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.market_metric_snapshots from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.market_neighborhoods from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.market_properties from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.market_property_matches from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.market_sources from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.market_transactions from authenticated;

grant select on table public.market_identity_decisions to authenticated;
grant select on table public.market_listings to authenticated;
grant select on table public.market_metric_snapshots to authenticated;
grant select on table public.market_neighborhoods to authenticated;
grant select on table public.market_properties to authenticated;
grant select on table public.market_property_matches to authenticated;
grant select on table public.market_sources to authenticated;
grant select on table public.market_transactions to authenticated;

commit;
