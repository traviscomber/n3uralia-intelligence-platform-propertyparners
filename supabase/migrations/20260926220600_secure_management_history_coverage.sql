-- Preserve management RLS through the historical coverage projection.
alter view public.management_history_coverage_v1 set (security_invoker = true);

comment on view public.management_history_coverage_v1 is
'Observed management metric coverage by entity and period from 2025 onward. SECURITY INVOKER preserves management entity/metric RLS. Annual-only facts are never fabricated into monthly values.';
