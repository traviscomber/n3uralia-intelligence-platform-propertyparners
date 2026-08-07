-- Harden privileged RPC execution without changing canonical data.
-- This migration mirrors the production grant changes applied on 2026-08-07.

revoke execute on function public.refresh_market_property_match_candidates() from anon;

revoke execute on function public.ingest_portal_listing_snapshot(text, text, text, timestamptz, jsonb, boolean) from anon, authenticated;
grant execute on function public.ingest_portal_listing_snapshot(text, text, text, timestamptz, jsonb, boolean) to service_role;
