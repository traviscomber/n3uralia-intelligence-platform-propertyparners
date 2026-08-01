-- Canonical management scoring v2.
-- Resolves the production cap at 100, separates non-evaluable zero denominators,
-- preserves exact internal precision and keeps v1 only as an explicit historical replay.

begin;

update public.management_metric_definitions
set
  formula_version = 2,
  methodology = 'min(stock/meta,1)*100. Meta cero o negativa no produce score; queda no evaluable o inconsistente.',
  evaluation_policy = coalesce(evaluation_policy, '{}'::jsonb) || '{"zeroTarget":"not_evaluable","negativeTarget":"inconsistent_source","scoreCap":100,"internalPrecision":"full","displayRoundingDecimals":1}'::jsonb
where code = 'portfolio_stock_score';

update public.management_metric_definitions
set
  formula_version = 2,
  methodology = 'min(requerimientos/referencia,1)*100. Referencia cero no es evaluable.',
  evaluation_policy = coalesce(evaluation_policy, '{}'::jsonb) || '{"zeroDenominator":"not_evaluable","negativeValues":"inconsistent_source","scoreCap":100,"internalPrecision":"full","displayRoundingDecimals":1}'::jsonb
where code = 'portfolio_requirements_score';

update public.management_metric_definitions
set
  formula_version = 2,
  methodology = '(n<=1.05*100 + n<=1.10*50 + n>1.10*0) / propiedades elegibles. Sin elegibles queda no evaluable.',
  evaluation_policy = coalesce(evaluation_policy, '{}'::jsonb) || '{"zeroEligible":"not_evaluable","negativeBandCount":"inconsistent_source","scoreCap":100,"internalPrecision":"full","displayRoundingDecimals":1}'::jsonb
where code = 'portfolio_pricing_score';

update public.management_metric_definitions
set
  formula_version = 2,
  methodology = 'Promedio simple de cartera/meta, requerimientos y pricing, usando precisión completa. Si falta un componente, la dimensión no es evaluable.',
  evaluation_policy = coalesce(evaluation_policy, '{}'::jsonb) || '{"missingComponent":"not_evaluable","internalPrecision":"full","displayRoundingDecimals":1,"thresholdPrecision":"exact"}'::jsonb
where code = 'canonical_portfolio_score';

update public.management_metric_definitions
set
  formula_version = 2,
  methodology = 'min(clasificados/activos*100,100). Activos cero no es evaluable.',
  evaluation_policy = coalesce(evaluation_policy, '{}'::jsonb) || '{"zeroDenominator":"not_evaluable","negativeValues":"inconsistent_source","scoreCap":100,"internalPrecision":"full","displayRoundingDecimals":1}'::jsonb
where code = 'follow_up_classified_score';

update public.management_metric_definitions
set
  formula_version = 2,
  methodology = '(1-leads_sin_gestion_90/activos)*100, limitado a 0-100. Un numerador mayor al universo es inconsistente.',
  evaluation_policy = coalesce(evaluation_policy, '{}'::jsonb) || '{"zeroDenominator":"not_evaluable","numeratorExceedsDenominator":"inconsistent_source","scoreCap":100,"internalPrecision":"full","displayRoundingDecimals":1}'::jsonb
where code = 'follow_up_managed90_score';

update public.management_metric_definitions
set
  formula_version = 2,
  methodology = '(1-leads_A_sin_gestion_15/total_A)*100, limitado a 0-100. Un numerador mayor al universo es inconsistente.',
  evaluation_policy = coalesce(evaluation_policy, '{}'::jsonb) || '{"zeroDenominator":"not_evaluable","numeratorExceedsDenominator":"inconsistent_source","scoreCap":100,"internalPrecision":"full","displayRoundingDecimals":1}'::jsonb
where code = 'follow_up_managed15a_score';

update public.management_metric_definitions
set
  formula_version = 2,
  methodology = 'Promedio simple de clasificación, gestión 90 días y gestión A 15 días, usando precisión completa. Si falta un componente, la dimensión no es evaluable.',
  evaluation_policy = coalesce(evaluation_policy, '{}'::jsonb) || '{"missingComponent":"not_evaluable","internalPrecision":"full","displayRoundingDecimals":1,"thresholdPrecision":"exact"}'::jsonb
where code = 'canonical_follow_up_score';

update public.management_metric_definitions
set
  formula_version = 2,
  methodology = 'min(visitas_realizadas/meta_visitas,1)*100. Meta cero no produce score y queda no evaluable.',
  evaluation_policy = coalesce(evaluation_policy, '{}'::jsonb) || '{"zeroTarget":"not_evaluable","negativeTarget":"inconsistent_source","scoreCap":100,"internalPrecision":"full","displayRoundingDecimals":1}'::jsonb
where code = 'conversion_visits_target_score';

update public.management_metric_definitions
set
  formula_version = 2,
  methodology = 'min(visitas_realizadas/visitas_agendadas*100,100). Agendadas cero no es evaluable.',
  evaluation_policy = coalesce(evaluation_policy, '{}'::jsonb) || '{"zeroDenominator":"not_evaluable","negativeValues":"inconsistent_source","scoreCap":100,"internalPrecision":"full","displayRoundingDecimals":1}'::jsonb
where code = 'conversion_visits_performed_score';

update public.management_metric_definitions
set
  formula_version = 2,
  methodology = 'min((TC_porcentaje/2.86)*100,100). La fórmula literal v1 min(TC_porcentaje,2.86)*35 se conserva sólo para reproducción histórica y puede mostrar 100.1.',
  aggregation_config = '{"weight":0.3333333333,"conversionPercentBenchmark":2.86,"scoreCap":100,"historicalReplay":{"formulaVersion":1,"formula":"min(TC_porcentaje,2.86)*35"}}'::jsonb,
  evaluation_policy = '{"zeroDenominator":"not_evaluable","negativeValues":"inconsistent_source","finalCap":100,"status":"resolved","internalPrecision":"full","displayRoundingDecimals":1,"historicalReplayMode":"historical_v1"}'::jsonb
where code = 'conversion_close_rate_score';

update public.management_metric_definitions
set
  formula_version = 2,
  methodology = 'Promedio simple de visitas/meta, realizadas/agendadas y tasa de cierre, usando precisión completa. Si falta un componente, la dimensión no es evaluable.',
  evaluation_policy = coalesce(evaluation_policy, '{}'::jsonb) || '{"missingComponent":"not_evaluable","internalPrecision":"full","displayRoundingDecimals":1,"thresholdPrecision":"exact"}'::jsonb
where code = 'canonical_conversion_score';

update public.management_metric_definitions
set
  formula_version = 2,
  methodology = '0.4*Cartera + 0.3*Seguimiento + 0.3*Conversión con precisión completa; el redondeo se aplica sólo al presentar.',
  evaluation_policy = coalesce(evaluation_policy, '{}'::jsonb) || '{"missingComponent":"not_evaluable","internalPrecision":"full","displayRoundingDecimals":1,"thresholdPrecision":"exact","scoreCap":100}'::jsonb
where code = 'canonical_management_score';

alter table public.management_metric_reconciliations
  alter column formula_version set default 2;

commit;
