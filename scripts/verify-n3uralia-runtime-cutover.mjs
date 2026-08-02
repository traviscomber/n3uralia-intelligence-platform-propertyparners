import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const manifestPath = path.join(root, 'config', 'n3uralia-runtime-cutover-evidence.json')
const mode = process.env.N3URALIA_RUNTIME_MODE ?? 'local'

function fail(message) {
  console.error(`[runtime-cutover] ${message}`)
  process.exit(1)
}

if (!fs.existsSync(manifestPath)) {
  fail('Missing config/n3uralia-runtime-cutover-evidence.json.')
}

let manifest
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
} catch {
  fail('Cutover evidence manifest is not valid JSON.')
}

if (manifest.schemaVersion !== 1) fail('Unsupported cutover evidence schemaVersion.')
if (manifest.tenantId !== 'property-partners') fail('Cutover evidence tenantId must be property-partners.')
if (manifest.targetMode !== 'remote') fail('Cutover evidence targetMode must be remote.')

const requiredEvidence = [
  'privateRuntimeDeployed',
  'protocolValidated',
  'tenantIsolationValidated',
  'shadowParityValidated',
  'rollbackValidated',
  'credentialRotationCompleted',
  'exposureAuditPassed',
  'historyCleanupReviewed',
  'technicalApproval',
  'contractualApproval',
]

const missingEntries = requiredEvidence.filter((key) => !manifest.evidence?.[key])
if (missingEntries.length) {
  fail(`Missing evidence entries: ${missingEntries.join(', ')}.`)
}

const incomplete = requiredEvidence.filter((key) => {
  const item = manifest.evidence[key]
  return item.complete !== true || typeof item.reference !== 'string' || item.reference.trim().length < 8
})

const cutoverMetadataReady =
  typeof manifest.cutover?.approvedBy === 'string'
  && manifest.cutover.approvedBy.trim().length >= 3
  && typeof manifest.cutover?.approvedAt === 'string'
  && !Number.isNaN(Date.parse(manifest.cutover.approvedAt))
  && typeof manifest.cutover?.rollbackOwner === 'string'
  && manifest.cutover.rollbackOwner.trim().length >= 3
  && Number.isInteger(manifest.cutover?.rollbackDeadlineMinutes)
  && manifest.cutover.rollbackDeadlineMinutes > 0

if (mode === 'remote') {
  if (manifest.status !== 'ready') fail('Remote mode requires cutover manifest status ready.')
  if (incomplete.length) fail(`Remote mode blocked by incomplete evidence: ${incomplete.join(', ')}.`)
  if (!cutoverMetadataReady) fail('Remote mode requires complete approval and rollback metadata.')
}

if (manifest.status === 'ready' && (incomplete.length || !cutoverMetadataReady)) {
  fail('Manifest status cannot be ready while evidence or cutover metadata is incomplete.')
}

console.log(`[runtime-cutover] mode=${mode}; status=${manifest.status}; incomplete=${incomplete.length}`)
