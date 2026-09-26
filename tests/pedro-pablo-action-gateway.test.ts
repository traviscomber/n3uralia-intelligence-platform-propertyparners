import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  buildPedroPabloTaskDraft,
  taskPriority,
  taskSeverity,
  type PedroPabloActionProposal,
  type PedroPabloDecisionSupportResponse,
} from '../lib/pedro-pablo-action-gateway-contract'

const proposal: PedroPabloActionProposal = {
  id: 'proposal-123',
  kind: 'follow_up',
  domain: 'reports',
  action: 'Revisar reporte fallido',
  objectLabel: 'Reporte mensual',
  reason: 'Existe una entrega fallida visible.',
  priority: 'high',
  href: '/dashboard/reportes/operacion',
  requiresConfirmation: true,
  executionStatus: 'proposed',
  evidence: [{
    label: 'Entrega fallida',
    source: 'canonical-report-delivery',
    reference: 'delivery-1',
    cutoff: '2026-09-25T12:00:00Z',
    domain: 'reports',
  }],
}

const context: PedroPabloDecisionSupportResponse = {
  proposals: [proposal],
  generatedAt: '2026-09-25T12:00:00Z',
  periodLabel: 'septiembre 2026',
  scopeLabel: 'Property Partners',
}

test('priority and severity mappings remain bounded', () => {
  assert.equal(taskPriority('critical'), 'urgent')
  assert.equal(taskPriority('high'), 'high')
  assert.equal(taskPriority('medium'), 'medium')
  assert.equal(taskPriority('low'), 'low')
  assert.equal(taskSeverity('critical'), 'critical')
  assert.equal(taskSeverity('high'), 'warning')
  assert.equal(taskSeverity('medium'), 'info')
  assert.equal(taskSeverity('low'), 'info')
})

test('task draft is derived from regenerated proposal evidence only', () => {
  const draft = buildPedroPabloTaskDraft(proposal, context)
  assert.equal(draft.sourceKey, 'pedro-pablo:proposal-123')
  assert.equal(draft.title, proposal.action)
  assert.equal(draft.priority, 'high')
  assert.equal(draft.severity, 'warning')
  assert.equal(draft.assignedTo, null)
  assert.equal(draft.subjectProfileId, null)
  assert.match(draft.detail, /Existe una entrega fallida visible/)
  assert.match(draft.detail, /delivery-1/)
  assert.match(draft.detail, /confirmación humana/)
})

test('route and workspace preserve preview then explicit confirmation', () => {
  const route = readFileSync('app/api/pedro-pablo/action-gateway/route.ts', 'utf8')
  const workspace = readFileSync('components/intelligence/pedro-pablo-workspace-v2.tsx', 'utf8')

  assert.match(route, /regenerateProposal/)
  assert.match(route, /mode === 'preview'/)
  assert.match(route, /if \(!confirm\)/)
  assert.match(route, /buildPedroPabloTaskDraft\(proposal, context\)/)
  assert.match(workspace, /Preparar tarea/)
  assert.match(workspace, /Confirmar y crear tarea/)
  assert.match(workspace, /confirm: true/)
})
