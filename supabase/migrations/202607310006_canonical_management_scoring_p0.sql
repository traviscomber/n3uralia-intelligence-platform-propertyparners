-- Canonical management scoring P0: versioned definitions, reconciliation and publication gate.
-- Idempotent by design.

begin;

insert into public.management_metric_definitions (
  code, label, description, unit, aggregation, numerator_code, denominator_code,
  active, sort_order, methodology, formula_version, aggregation_config, evaluation_policy
) values
  ('portfolio_stock_score', 'Cartera / meta', 'Subscore canónico de stock contra meta, limitado a 100.', 'score', 'average_of_individual_scores', 'stock', 'stock_target', true, 100, 'min(stock/meta,1)*100. Meta cero se muestra no evaluable y aporta score operativo 0.', 1, '{"weight":0.3333333333}'::jsonb, '{"zeroTarget":"operational_zero_display_not_evaluable"}'::jsonb),
  ('portfolio_requirements_score', 'Requerimientos por tipología', 'Subscore canónico de requerimientos contra referencia esperada, limitado a 100.', 'score', 'average_of_individual_scores', 'requirements', 'requirements_reference', true, 110, 'min(requerimientos/referencia,1)*100.', 1, '{"weight":0.3333333333}'::jsonb, '{"missingBenchmark":"blocked"}'::jsonb),
  ('portfolio_pricing_score', 'Calidad de precio', 'Subscore canónico de calidad de precio por bandas de desviación.', 'score', 'average_of_individual_scores', null, null, true, 120, '(n<=1.05*100 + n<=1.10*50 + n>1.10*0) / propiedades elegibles.', 1, '{"weight":0.3333333333,"bands":[{"max":1.05,"score":100},{"max":1.10,"score":50},{"above":1.10,"score":0}]}'::jsonb, '{"zeroEligible":"not_evaluable"}'::jsonb),
  ('canonical_portfolio_score', 'Calidad de cartera canónica', 'Promedio de los tres subscores canónicos de cartera.', 'score', 'average_of_individual_scores', null, null, true, 130, 'Promedio simple de cartera/meta, requerimientos y pricing.', 1, '{"components":["portfolio_stock_score","portfolio_requirements_score","portfolio_pricing_score"]}'::jsonb, '{"missingComponent":"not_evaluable"}'::jsonb),
  ('follow_up_classified_score', 'Leads clasificados', 'Porcentaje de leads activos clasificados.', 'score', 'average_of_individual_scores', 'classified_leads', 'active_leads', true, 200, 'clasificados/activos*100.', 1, '{"weight":0.3333333333}'::jsonb, '{"zeroDenominator":"not_evaluable"}'::jsonb),
  ('follow_up_managed90_score', 'Gestión dentro de 90 días', 'Complemento de leads activos sin gestión por más de 90 días.', 'score', 'average_of_individual_scores', 'stale_90_leads', 'active_leads', true, 210, '(1-leads_sin_gestion_90/activos)*100.', 1, '{"weight":0.3333333333}'::jsonb, '{"zeroDenominator":"not_evaluable"}'::jsonb),
  ('follow_up_managed15a_score', 'Gestión leads A dentro de 15 días', 'Complemento de leads A sin gestión reciente.', 'score', 'average_of_individual_scores', 'stale_15a_leads', 'active_a_leads', true, 220, '(1-leads_A_sin_gestion_15/total_A)*100.', 1, '{"weight":0.3333333333}'::jsonb, '{"zeroDenominator":"not_evaluable"}'::jsonb),
  ('canonical_follow_up_score', 'Calidad de seguimiento canónica', 'Promedio de los tres subscores canónicos de seguimiento.', 'score', 'average_of_individual_scores', null, null, true, 230, 'Promedio simple de clasificación, gestión 90 días y gestión A 15 días.', 1, '{"components":["follow_up_classified_score","follow_up_managed90_score","follow_up_managed15a_score"]}'::jsonb, '{"missingComponent":"not_evaluable"}'::jsonb),
  ('conversion_visits_target_score', 'Visitas frente a meta', 'Visitas realizadas contra meta aprobada, limitado a 100.', 'score', 'average_of_individual_scores', 'realized_visits', 'visits_target', true, 300, 'min(visitas_realizadas/meta_visitas,1)*100.', 1, '{"weight":0.3333333333}'::jsonb, '{"zeroTarget":"operational_zero_display_not_evaluable"}'::jsonb),
  ('conversion_visits_performed_score', 'Visitas realizadas / agendadas', 'Cumplimiento de visitas agendadas.', 'score', 'average_of_individual_scores', 'realized_visits', 'scheduled_visits', true, 310, 'visitas_realizadas/visitas_agendadas*100.', 1, '{"weight":0.3333333333}'::jsonb, '{"zeroDenominator":"not_evaluable"}'::jsonb),
  ('conversion_close_rate_score', 'Conversión seis meses', 'Subscore canónico de tasa de cierre sobre leads.', 'score', 'average_of_individual_scores', 'conversion_closings', 'conversion_lead_base', true, 320, 'min(TC_porcentaje,2.86)*35. El tope final en 100 permanece configurable hasta resolución oficial.', 1, '{"weight":0.3333333333,"conversionPercentCap":2.86,"multiplier":35}'::jsonb, '{"finalCap":"configurable_formula_or_100"}'::jsonb),
  ('canonical_conversion_score', 'Calidad de conversión canónica', 'Promedio de los tres subscores canónicos de conversión.', 'score', 'average_of_individual_scores', null, null, true, 330, 'Promedio simple de visitas/meta, realizadas/agendadas y tasa de cierre.', 1, '{"components":["conversion_visits_target_score","conversion_visits_performed_score","conversion_close_rate_score"]}'::jsonb, '{"missingComponent":"not_evaluable"}'::jsonb),
  ('canonical_management_score', 'Calidad de gestión canónica', 'Score compuesto canónico de gestión.', 'score', 'weighted_average', null, null, true, 400, '0.4*Cartera + 0.3*Seguimiento + 0.3*Conversión.', 1, '{"components":{"canonical_portfolio_score":0.4,"canonical_follow_up_score":0.3,"canonical_conversion_score":0.3}}'::jsonb, '{"missingComponent":"not_evaluable"}'::jsonb)
on conflict (code) do update set
  label = excluded.label,
  description = excluded.description,
  unit = excluded.unit,
  aggregation = excluded.aggregation,
  numerator_code = excluded.numerator_code,
  denominator_code = excluded.denominator_code,
  active = excluded.active,
  sort_order = excluded.sort_order,
  methodology = excluded.methodology,
  formula_version = excluded.formula_version,
  aggregation_config = excluded.aggregation_config,
  evaluation_policy = excluded.evaluation_policy;

create table if not exists public.management_metric_reconciliations (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.management_entities(id) on delete cascade,
  metric_code text not null references public.management_metric_definitions(code),
  period_start date not null,
  period_end date not null,
  published_value_id uuid references public.management_metric_values(id) on delete set null,
  calculated_value_id uuid references public.management_metric_values(id) on delete set null,
  published_value numeric,
  calculated_value numeric,
  absolute_delta numeric,
  relative_delta numeric,
  tolerance numeric not null default 0,
  reconciliation_status text not null default 'blocked'
    check (reconciliation_status in ('exact','within_tolerance','different','not_comparable','blocked')),
  publication_status text not null default 'blocked'
    check (publication_status in ('blocked','provisional','approved','rejected')),
  formula_version integer not null default 1,
  evidence jsonb not null default '{}'::jsonb,
  notes text,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_id, metric_code, period_start, period_end, formula_version)
);

create index if not exists management_metric_reconciliations_entity_period_idx
  on public.management_metric_reconciliations(entity_id, period_start, period_end);
create index if not exists management_metric_reconciliations_status_idx
  on public.management_metric_reconciliations(reconciliation_status, publication_status);
create index if not exists management_metric_reconciliations_published_value_idx
  on public.management_metric_reconciliations(published_value_id);
create index if not exists management_metric_reconciliations_calculated_value_idx
  on public.management_metric_reconciliations(calculated_value_id);

alter table public.management_metric_reconciliations enable row level security;

drop policy if exists "management reconciliations read scoped" on public.management_metric_reconciliations;
drop policy if exists "management leaders insert reconciliations" on public.management_metric_reconciliations;
drop policy if exists "management leaders update reconciliations" on public.management_metric_reconciliations;
drop policy if exists "management leaders delete reconciliations" on public.management_metric_reconciliations;

create policy "management reconciliations read scoped"
  on public.management_metric_reconciliations for select to authenticated
  using (public.can_access_management_entity(entity_id));

create policy "management leaders insert reconciliations"
  on public.management_metric_reconciliations for insert to authenticated
  with check (
    public.is_global_management_leader((select auth.uid()))
    or (lower(coalesce((select role from public.profiles where id=(select auth.uid())),'')) in ('director','subdirector')
        and public.can_access_management_entity(entity_id))
  );

create policy "management leaders update reconciliations"
  on public.management_metric_reconciliations for update to authenticated
  using (
    public.is_global_management_leader((select auth.uid()))
    or (lower(coalesce((select role from public.profiles where id=(select auth.uid())),'')) in ('director','subdirector')
        and public.can_access_management_entity(entity_id))
  )
  with check (
    public.is_global_management_leader((select auth.uid()))
    or (lower(coalesce((select role from public.profiles where id=(select auth.uid())),'')) in ('director','subdirector')
        and public.can_access_management_entity(entity_id))
  );

create policy "management leaders delete reconciliations"
  on public.management_metric_reconciliations for delete to authenticated
  using (public.is_global_management_leader((select auth.uid())));

create or replace view public.management_approved_metric_values
with (security_invoker = true) as
select
  r.entity_id,
  r.metric_code,
  r.period_start,
  r.period_end,
  r.calculated_value_id as metric_value_id,
  r.calculated_value as value,
  r.formula_version,
  r.reconciliation_status,
  r.publication_status,
  r.evidence,
  r.approved_by,
  r.approved_at
from public.management_metric_reconciliations r
where r.publication_status = 'approved'
  and r.reconciliation_status in ('exact','within_tolerance')
  and r.calculated_value is not null;

grant select on public.management_approved_metric_values to authenticated;

commit;
