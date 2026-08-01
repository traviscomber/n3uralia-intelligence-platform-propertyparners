import assert from 'node:assert/strict'
import { overlayApprovedManagementMetrics, type DashboardEntity } from '../lib/management-persisted-overlay'

const documentary: DashboardEntity[] = [{
  id: 'branch:nueva-costanera',
  name: 'Nueva Costanera',
  entityType: 'branch',
  parentId: null,
  metrics: [{
    code: 'sales',
    label: 'Cierres documentales',
    unit: 'count',
    value: 2,
    target: 4,
    compliance: 50,
    mom: null,
    qualityStatus: 'canonical_presentation',
  }],
  evolution: [],
}]

const result = overlayApprovedManagementMetrics({
  entities: documentary,
  persistedEntities: [
    { id: 'office-1', entity_type: 'office', name: 'Nueva Costanera', parent_id: null },
    { id: 'partner-1', entity_type: 'partner', name: 'Ejecutiva Persistida', parent_id: 'office-1' },
  ],
  definitions: [
    { code: 'sales', label: 'Ventas', unit: 'count', methodology: 'Cierres confirmados.', formula_version: 1 },
    { code: 'canonical_management_score', label: 'Gestión', unit: 'score', methodology: 'Score canónico.', formula_version: 2 },
  ],
  approvedValues: [
    { entity_id: 'office-1', metric_code: 'sales', period_start: '2025-02-01', period_end: '2025-02-28', metric_value_id: 'value-1', value: 3, formula_version: 1, reconciliation_status: 'exact', publication_status: 'approved', approved_at: '2025-03-05T10:00:00Z' },
    { entity_id: 'office-1', metric_code: 'sales', period_start: '2026-01-01', period_end: '2026-01-31', metric_value_id: 'value-2', value: 4, formula_version: 1, reconciliation_status: 'exact', publication_status: 'approved', approved_at: '2026-02-05T10:00:00Z' },
    { entity_id: 'office-1', metric_code: 'sales', period_start: '2026-02-01', period_end: '2026-02-28', metric_value_id: 'value-3', value: 6, formula_version: 1, reconciliation_status: 'within_tolerance', publication_status: 'approved', approved_at: '2026-03-05T10:00:00Z' },
    { entity_id: 'partner-1', metric_code: 'canonical_management_score', period_start: '2026-02-01', period_end: '2026-02-28', metric_value_id: 'value-4', value: 82.5, formula_version: 2, reconciliation_status: 'exact', publication_status: 'approved', approved_at: '2026-03-05T10:00:00Z' },
  ],
  sourceValues: [
    { id: 'value-1', source_name: 'CRM', source_reference: 'feb-2025.csv', source_cutoff_at: '2025-02-28T23:59:59Z', quality_status: 'verified', evaluation_status: 'evaluable' },
    { id: 'value-2', source_name: 'CRM', source_reference: 'ene-2026.csv', source_cutoff_at: '2026-01-31T23:59:59Z', quality_status: 'verified', evaluation_status: 'evaluable' },
    { id: 'value-3', source_name: 'CRM', source_reference: 'feb-2026.csv', source_cutoff_at: '2026-02-28T23:59:59Z', quality_status: 'verified', evaluation_status: 'evaluable' },
    { id: 'value-4', source_name: 'Motor canónico', source_reference: 'score-v2', source_cutoff_at: '2026-02-28T23:59:59Z', quality_status: 'verified', evaluation_status: 'evaluable' },
  ],
  goals: [{
    entity_id: 'office-1',
    metric_code: 'sales',
    period_start: '2026-02-01',
    period_end: '2026-02-28',
    target_value: 8,
    status: 'approved',
    approved_at: '2026-02-01T10:00:00Z',
    source_name: 'Plan comercial 2026',
  }],
})

assert.equal(result.stats.mode, 'hybrid')
assert.equal(result.stats.approvedMetricCount, 4)
assert.equal(result.stats.matchedEntities, 1)
assert.equal(result.stats.persistedOnlyEntities, 1)
assert.equal(result.stats.latestPeriodEnd, '2026-02-28')

const office = result.entities.find((entity) => entity.name === 'Nueva Costanera')
assert.ok(office)
const sales = office.metrics.find((metric) => metric.code === 'sales')
assert.ok(sales)
assert.equal(sales.value, 6)
assert.equal(sales.target, 8)
assert.equal(sales.compliance, 75)
assert.equal(sales.mom, 50)
assert.equal(sales.yoy, 100)
assert.equal(sales.previousYearValue, 3)
assert.equal(sales.sourceName, 'CRM')
assert.equal(sales.dataLayer, 'persisted_approved')

const partner = result.entities.find((entity) => entity.name === 'Ejecutiva Persistida')
assert.ok(partner)
assert.equal(partner.parentId, 'branch:nueva-costanera')
assert.equal(partner.metrics[0]?.code, 'management_score')
assert.equal(partner.metrics[0]?.value, 82.5)

const fallback = overlayApprovedManagementMetrics({
  entities: documentary,
  persistedEntities: [],
  definitions: [],
  approvedValues: [],
  sourceValues: [],
  goals: [],
})
assert.equal(fallback.stats.mode, 'documentary')
assert.equal(fallback.entities[0]?.metrics[0]?.value, 2)
assert.equal(fallback.entities[0]?.metrics[0]?.dataLayer, 'documentary')

console.log(JSON.stringify({
  status: 'ok',
  approvedMetricCount: result.stats.approvedMetricCount,
  persistedOnlyEntities: result.stats.persistedOnlyEntities,
}, null, 2))
