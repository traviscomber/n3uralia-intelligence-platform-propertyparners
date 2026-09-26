begin;

drop policy if exists "market_properties_authenticated_read" on public.market_properties;
drop policy if exists "market_properties_authenticated_scoped_read" on public.market_properties;

create policy "market_properties_authenticated_scoped_read"
on public.market_properties
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and lower(coalesce(p.role,'')) in ('admin','ceo','director','subdirector')
  )
  or exists (
    select 1
    from public.property_assignments pa
    where pa.property_id = market_properties.id
      and pa.status = 'active'
      and (
        pa.assigned_to = (select auth.uid())
        or private.has_management_profile_scope(pa.assigned_to,(select auth.uid()))
      )
  )
);

comment on policy "market_properties_authenticated_scoped_read" on public.market_properties is
'Operational read scope: leaders may inspect the review universe; sellers and scoped managers see only properties reachable through active assignments. The table is not a public market publication contract.';

create or replace view private.market_current_listings_production_v3
with (security_invoker = true)
as
select
  ml.id,
  ml.source_id,
  ml.source_listing_id,
  ml.property_id,
  ml.status,
  ml.operation,
  ml.url,
  ml.title,
  ml.raw_address,
  ml.normalized_address,
  ml.price_uf,
  ml.price_uf_m2,
  ml.published_at,
  ml.observed_at,
  ml.removed_at,
  case
    when ml.property_id is null then 'source_listing'
    else 'canonical_property_linked'
  end as identity_level
from public.market_current_listings ml
join public.market_sources ms on ms.id = ml.source_id
where ms.source_type = 'portal'
  and ms.metadata ->> 'pipeline' = 'unit_portal_listing_v2'
  and ms.metadata ->> 'dataset_kind' = 'portal_houses'
  and ml.status in ('active','observed')
  and lower(btrim(coalesce(ml.operation,''))) in ('sale','venta')
  and ml.observed_at >= now() - interval '7 days'
  and nullif(btrim(coalesce(ml.source_listing_id,'')),'') is not null
  and nullif(btrim(coalesce(ml.url,'')),'') is not null;

revoke all on private.market_current_listings_production_v3 from public,anon,authenticated;
grant usage on schema private to service_role;
grant select on private.market_current_listings_production_v3 to service_role;

comment on view private.market_current_listings_production_v3 is
'Server-only decision-grade Portal house listing projection. Source listing identity is sufficient for listing-level market intelligence; property_id remains optional and property-level conclusions must still require canonical identity.';

drop view if exists private.market_production_release_gate_v2;

create view private.market_production_release_gate_v2
with (security_invoker = true)
as
with
refresh as (
  select
    count(*)::bigint as required_dataset_count,
    count(*) filter (where refresh_status='fresh')::bigint as fresh_dataset_count,
    count(*) filter (where refresh_status<>'fresh')::bigint as unhealthy_dataset_count,
    max(completed_at) as latest_refresh_completed_at
  from private.market_source_refresh_health_v1
),
current_v2 as (
  select
    count(*)::bigint as current_listing_rows,
    count(*) filter (where ml.property_id is null)::bigint as unlinked_current_listing_rows,
    count(*) filter (where ml.property_id is not null and mp.identity_status <> 'confirmed')::bigint as linked_unconfirmed_property_rows
  from public.market_current_listings ml
  join public.market_sources ms on ms.id=ml.source_id
  left join public.market_properties mp on mp.id=ml.property_id
  where ms.source_type='portal'
    and ms.metadata->>'pipeline'='unit_portal_listing_v2'
    and ms.metadata->>'dataset_kind'='portal_houses'
    and ml.status in ('active','observed')
    and ml.observed_at >= now()-interval '7 days'
),
current_link_conflicts as (
  select count(*)::bigint as conflicting_current_external_ids
  from (
    select private.normalize_market_external_id(ml.source_listing_id) as external_id
    from public.market_current_listings ml
    join public.market_sources ms on ms.id=ml.source_id
    where ms.source_type='portal'
      and ms.metadata->>'pipeline'='unit_portal_listing_v2'
      and ms.metadata->>'dataset_kind'='portal_houses'
      and ml.status in ('active','observed')
      and ml.observed_at >= now()-interval '7 days'
      and ml.property_id is not null
    group by private.normalize_market_external_id(ml.source_listing_id)
    having count(distinct ml.property_id)>1
  ) x
),
production as (
  select
    (select count(*)::bigint from private.market_properties_production_v2) as production_property_rows,
    (select count(*)::bigint from private.market_current_listings_production_v3) as production_listing_rows
),
legacy_backlog as (
  select
    count(*) filter (where q.property_identity_status='candidate')::bigint as legacy_candidate_rows,
    count(*) filter (where q.provenance_origin='unresolved')::bigint as unresolved_provenance_rows,
    count(*) filter (where q.identity_signal_class='conflicting_external_identity')::bigint as conflicting_external_identity_rows,
    count(*) filter (where q.identity_signal_class='probable_duplicate_listing')::bigint as probable_duplicate_rows
  from private.market_identity_quality_effective_v1 q
),
exposure as (
  select
    has_table_privilege('authenticated','public.market_properties','SELECT') as authenticated_can_read_market_properties,
    has_table_privilege('authenticated','public.market_listings','SELECT') as authenticated_can_read_market_listings,
    has_table_privilege('authenticated','public.neighborhood_market_data','SELECT') as authenticated_can_read_neighborhood_source,
    coalesce((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='market_properties'),false) as market_properties_rls_enabled,
    exists(
      select 1 from pg_policies p
      where p.schemaname='public'
        and p.tablename='market_properties'
        and p.cmd='SELECT'
        and 'authenticated'=any(p.roles)
        and lower(regexp_replace(coalesce(p.qual,''),'[[:space:]()]','','g'))='true'
    ) as market_properties_has_unscoped_read_policy
),
capability as (
  select
    (select count(*)::bigint from private.neighborhood_market_data_verified_v1) as neighborhood_verified_rows,
    (select count(*)::bigint from public.market_transactions) as transaction_rows,
    (select count(*)::bigint from public.valuation_cases) as valuation_case_rows,
    (select count(*)::bigint from public.valuation_comparables) as valuation_comparable_rows,
    (select count(*)::bigint from public.management_approved_metric_values) as management_approved_rows
),
assembled as (
  select r.*,c.*,clc.*,p.*,lb.*,e.*,cap.*
  from refresh r
  cross join current_v2 c
  cross join current_link_conflicts clc
  cross join production p
  cross join legacy_backlog lb
  cross join exposure e
  cross join capability cap
),
classified as (
  select a.*,
    array_remove(array[
      case when a.authenticated_can_read_market_properties
                  and (not a.market_properties_rls_enabled or a.market_properties_has_unscoped_read_policy)
        then 'unscoped_market_properties_exposed_to_authenticated' end,
      case when a.authenticated_can_read_market_listings then 'quarantined_market_listings_exposed_to_authenticated' end,
      case when a.unhealthy_dataset_count>0 then 'required_market_refresh_missing_or_stale' end,
      case when a.conflicting_current_external_ids>0 then 'current_source_identity_conflict' end,
      case when a.production_listing_rows=0 then 'no_publishable_market_listing_dataset' end
    ],null) as blockers,
    array_remove(array[
      case when a.production_property_rows=0 then 'property_identity_unavailable_disable_property_level_market_features' end,
      case when a.legacy_candidate_rows>0 then 'legacy_identity_candidates_quarantined' end,
      case when a.unresolved_provenance_rows>0 then 'legacy_provenance_backlog_quarantined' end,
      case when a.probable_duplicate_rows>0 then 'legacy_duplicate_backlog_quarantined' end,
      case when a.unlinked_current_listing_rows>0 then 'current_listing_identity_backlog_quarantined' end,
      case when a.neighborhood_verified_rows=0 then 'neighborhood_data_unverified_disable_neighborhood_features' end,
      case when a.transaction_rows=0 then 'transactions_unavailable_disable_transaction_features' end,
      case when a.valuation_case_rows=0 or a.valuation_comparable_rows=0 then 'valuation_evidence_unavailable_disable_valuation_features' end,
      case when a.management_approved_rows=0 then 'management_metrics_unpublished_use_verified_evaluable_layer' end
    ],null) as limitations
  from assembled a
)
select
  now() as evaluated_at,
  case when cardinality(blockers)>0 then 'BLOCK'
       when cardinality(limitations)>0 then 'HOLD'
       else 'PASS' end as release_verdict,
  cardinality(blockers)::integer as blocker_count,
  blockers,
  cardinality(limitations)::integer as limitation_count,
  limitations,
  required_dataset_count,
  fresh_dataset_count,
  unhealthy_dataset_count,
  latest_refresh_completed_at,
  current_listing_rows,
  unlinked_current_listing_rows,
  linked_unconfirmed_property_rows,
  conflicting_current_external_ids,
  production_property_rows,
  production_listing_rows,
  legacy_candidate_rows,
  unresolved_provenance_rows,
  conflicting_external_identity_rows,
  probable_duplicate_rows,
  authenticated_can_read_market_properties,
  authenticated_can_read_market_listings,
  authenticated_can_read_neighborhood_source,
  neighborhood_verified_rows,
  transaction_rows,
  valuation_case_rows,
  valuation_comparable_rows,
  management_approved_rows
from classified;

revoke all on private.market_production_release_gate_v2 from public,anon,authenticated;
grant usage on schema private to service_role;
grant select on private.market_production_release_gate_v2 to service_role;

comment on view private.market_production_release_gate_v2 is
'Server-only market release gate. Listing-level market intelligence may publish fresh source-identified Portal houses without canonical property linkage; property-level features remain disabled until identity/provenance gates pass.';

commit;
