import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const manifestPath = path.join(root, 'config', 'n3uralia-runtime-cutover-evidence.json')
const mode = (process.env.N3URALIA_RUNTIME_MODE ?? 'local').trim()

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

if (manifest.schemaVersion !== 2) fail('Unsupported cutover evidence schemaVersion.')
if (manifest.tenantId !== 'property-partners') fail('Cutover evidence tenantId must be property-partners.')
if (manifest.targetMode !== 'local-server-only') {
  fail('Current approved targetMode must remain local-server-only.')
}
if (manifest.status !== 'active') fail('Local server-only protection manifest must remain active.')
if (manifest.remoteRuntime?.required !== false) {
  fail('Remote runtime must remain optional unless a future change is explicitly approved.')
}

const requiredProtections = [
  'serverOnlyProprietaryModules',
  'noClientImports',
  'noBrowserBundleExposure',
  'minimalApiResponses',
  'noPromptRuleOrTraceExposure',
  'propertyPartnersBusinessLogicRemainsLocal',
]

const disabledProtections = requiredProtections.filter(
  (key) => manifest.requiredProtections?.[key] !== true,
)
if (disabledProtections.length) {
  fail(`Required local protections disabled: ${disabledProtections.join(', ')}.`)
}

const futureEvidenceKeys = [
  'privateRuntimeDeployed',
  'protocolValidated',
  'tenantIsolationValidated',
  'shadowParityValidated',
  'rollbackValidated',
  'credentialRotationCompleted',
  'technicalApproval',
  'contractualApproval',
]

const missingFutureEvidence = futureEvidenceKeys.filter(
  (key) => !manifest.futureRemoteCutoverEvidence?.[key],
)
if (missingFutureEvidence.length) {
  fail(`Future remote evidence entries missing: ${missingFutureEvidence.join(', ')}.`)
}

const incompleteFutureEvidence = futureEvidenceKeys.filter((key) => {
  const item = manifest.futureRemoteCutoverEvidence[key]
  return item.complete !== true || typeof item.reference !== 'string' || item.reference.trim().length < 8
})

if (mode === 'remote') {
  if (manifest.remoteRuntime?.activationPolicy !== 'explicit-approved-change') {
    fail('Remote mode requires activationPolicy explicit-approved-change.')
  }
  if (incompleteFutureEvidence.length) {
    fail(`Remote mode blocked by incomplete evidence: ${incompleteFutureEvidence.join(', ')}.`)
  }
}

if (mode === 'shadow' && !process.env.N3URALIA_RUNTIME_URL) {
  fail('Shadow mode requires N3URALIA_RUNTIME_URL.')
}

console.log(
  `[runtime-cutover] mode=${mode}; target=${manifest.targetMode}; futureEvidenceIncomplete=${incompleteFutureEvidence.length}`,
)
