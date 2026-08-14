alter table public.market_cbrs_reference_transactions alter column price_uf drop not null;
alter table public.market_cbrs_reference_transactions alter column built_area_m2 drop not null;
alter table public.market_cbrs_reference_transactions alter column neighborhood drop not null;
alter table public.market_cbrs_reference_transactions add column if not exists component_count integer;
alter table public.market_cbrs_reference_transactions add column if not exists source_sha256 text;
create unique index if not exists market_cbrs_reference_transactions_event_key_uidx on public.market_cbrs_reference_transactions(event_key);
create index if not exists market_cbrs_reference_transactions_lookup_idx on public.market_cbrs_reference_transactions(property_type, neighborhood, transaction_date desc) where price_uf is not null and built_area_m2 is not null;
