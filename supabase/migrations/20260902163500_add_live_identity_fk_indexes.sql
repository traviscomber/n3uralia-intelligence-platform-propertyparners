-- Pre-UAT hardening: cover foreign keys used by the live listing identity review flow.
-- Non-destructive indexes only; no data or authorization semantics change.

create index if not exists market_listing_identity_memory_v1_property_id_idx
  on private.market_listing_identity_memory_v1(property_id);

create index if not exists market_listing_identity_memory_v1_decided_by_idx
  on private.market_listing_identity_memory_v1(decided_by);

create index if not exists market_live_identity_decisions_v1_listing_id_idx
  on private.market_live_identity_decisions_v1(listing_id);

create index if not exists market_live_identity_decisions_v1_source_id_idx
  on private.market_live_identity_decisions_v1(source_id);

create index if not exists market_live_identity_decisions_v1_property_id_idx
  on private.market_live_identity_decisions_v1(property_id);

create index if not exists market_live_identity_decisions_v1_match_id_idx
  on private.market_live_identity_decisions_v1(match_id);

create index if not exists market_live_identity_decisions_v1_decided_by_idx
  on private.market_live_identity_decisions_v1(decided_by);
