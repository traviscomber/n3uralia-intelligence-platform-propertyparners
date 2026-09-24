import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  managementReportEntityScopes,
  metricsForManagementReportScope,
} from '../lib/management-report-scope'

test('global management leaders receive one global report scope', () => {
  assert.deepEqual(managementReportEntityScopes('admin', ['a', 'b']), [null])
  assert.deepEqual(managementReportEntityScopes('CEO', ['a', 'b']), [null])
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
