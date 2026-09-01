alter table private.market_address_resolution_memory
  drop constraint if exists market_address_resolution_memory_source_kind_check;

alter table private.market_address_resolution_memory
  add constraint market_address_resolution_memory_source_kind_check
  check (source_kind in ('canonical_unique','human_review','system_resolver'));
