import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  managementReportEntityScopes,
  metricsForManagementReportScope,
  managementReportTypeForEntity,
} from '../lib/management-report-scope'

test('global management leaders receive global plus entity report scopes', () => {
  assert.deepEqual(managementReportEntityScopes('admin', ['company', 'office', 'partner']), [null, 'company', 'office', 'partner'])
  assert.deepEqual(managementReportEntityScopes('CEO', ['office', 'partner', 'office']), [null, 'office', 'partner'])
})

test('director and subdirector reports remain entity scoped', () => {
  assert.deepEqual(managementReportEntityScopes('director', ['a', 'b', 'a']), ['a', 'b'])
  assert.deepEqual(managementReportEntityScopes('subdirector', ['x']), ['x'])
  assert.deepEqual(managementReportEntityScopes('seller', ['x']), [])
})

test('entity report snapshots include only metrics from that entity', () => {
  const metrics = [
    { id: '1', entity_id: 'a' },
    { id: '2', entity_id: 'b' },
    { id: '3', entity_id: 'a' },
  ]
  assert.deepEqual(metricsForManagementReportScope(metrics, 'a').map((row) => row.id), ['1', '3'])
  assert.deepEqual(metricsForManagementReportScope(metrics, null).map((row) => row.id), ['1', '2', '3'])
})


test('canonical uploads map report scope to persistent review report types', () => {
  assert.equal(managementReportTypeForEntity(null, true), 'monthly')
  assert.equal(managementReportTypeForEntity('office'), 'office')
  assert.equal(managementReportTypeForEntity('branch'), 'office')
  assert.equal(managementReportTypeForEntity('partner'), 'partner')
  assert.equal(managementReportTypeForEntity('seller'), 'partner')
  assert.equal(managementReportTypeForEntity('company'), 'executive')
})
