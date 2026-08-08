revoke select on table public.market_properties from authenticated;
revoke select on table public.market_listings from authenticated;

drop policy if exists "authenticated users read market properties" on public.market_properties;
drop policy if exists "authenticated users read listings" on public.market_listings;

create or replace view private.market_properties_production_v1
with (security_invoker = true)
as
select mp.*
from public.market_properties mp
join private.market_identity_quality_effective_v1 iq
  on iq.property_id = mp.id
where mp.identity_status = 'confirmed'
  and iq.provenance_origin <> 'unresolved'
  and iq.identity_signal_class <> 'conflicting_external_identity'
  and (mp.last_seen_at is not null and current_date - mp.last_seen_at::date <= 7)
  and (
    iq.identity_signal_class <> 'probable_duplicate_listing'
    or exists (
      select 1
      from private.market_identity_quality_effective_v1 iq2
      join public.market_property_matches m
        on m.status = 'confirmed'
       and m.left_entity_type = 'property'
       and m.right_entity_type = 'property'
       and ((m.left_entity_id = mp.id and m.right_entity_id = iq2.property_id)
         or (m.right_entity_id = mp.id and m.left_entity_id = iq2.property_id))
      where iq2.effective_external_listing_id = iq.effective_external_listing_id
        and iq2.property_id <> mp.id
    )
  );

create or replace view private.market_listings_production_v1
with (security_invoker = true)
as
select ml.*
from public.market_listings ml
join private.market_properties_production_v1 mp on mp.id = ml.property_id;

revoke all on private.market_properties_production_v1 from public, anon, authenticated;
revoke all on private.market_listings_production_v1 from public, anon, authenticated;
grant usage on schema private to service_role;
grant select on private.market_properties_production_v1 to service_role;
grant select on private.market_listings_production_v1 to service_role;

comment on view private.market_properties_production_v1 is 'Server-only production-eligible market properties: confirmed identity, resolved provenance, no external identity conflict, duplicate evidence reconciled when applicable, and freshness within seven days.';
comment on view private.market_listings_production_v1 is 'Server-only production listings whose property passes the production identity and provenance contract.';
