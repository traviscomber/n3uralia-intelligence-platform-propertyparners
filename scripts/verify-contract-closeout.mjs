import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const statusPath = path.join(root, 'config/contract-closeout-status.json')
const findings = []

if (!fs.existsSync(statusPath)) {
  console.error('Contract closeout verification failed: status manifest is missing.')
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(statusPath, 'utf8'))
const allowedStatuses = new Set(manifest.allowedStatuses ?? [])
const workstreams = manifest.workstreams ?? []
const requiredIds = new Set([
  'platform-core',
  'valuation',
  'management-intelligence',
  'market-intelligence',
  'automation-and-reporting',
  'uat-and-acceptance',
  'training-and-handover',
  'final-delivery-package',
])

if (manifest.schemaVersion !== 1) findings.push('schemaVersion must be 1')
if (!/^\d{4}-\d{2}-\d{2}$/.test(manifest.asOf ?? '')) findings.push('asOf must use YYYY-MM-DD')
if (!allowedStatuses.has(manifest.overallStatus)) findings.push('overallStatus is not allowed')

for (const documentPath of manifest.documents ?? []) {
  if (!fs.existsSync(path.join(root, documentPath))) {
    findings.push(`${documentPath}: required closeout document is missing`)
  }
}

const seenIds = new Set()
for (const workstream of workstreams) {
  if (!workstream.id || seenIds.has(workstream.id)) {
    findings.push(`duplicate or missing workstream id: ${workstream.id ?? '(missing)'}`)
    continue
  }
  seenIds.add(workstream.id)

  if (!allowedStatuses.has(workstream.status)) {
    findings.push(`${workstream.id}: invalid status ${workstream.status}`)
  }
  if (!['N3uralia', 'Client', 'Shared'].includes(workstream.owner)) {
    findings.push(`${workstream.id}: invalid owner ${workstream.owner}`)
  }
  if (!Array.isArray(workstream.evidence) || workstream.evidence.length === 0) {
    findings.push(`${workstream.id}: at least one evidence item is required`)
  }
  if (!Array.isArray(workstream.blockers)) {
    findings.push(`${workstream.id}: blockers must be an array`)
  }
  if (workstream.status === 'accepted' && workstream.blockers.length > 0) {
    findings.push(`${workstream.id}: accepted workstream cannot retain blockers`)
  }
  if (workstream.status === 'blocked-client-input' && workstream.blockers.length === 0) {
    findings.push(`${workstream.id}: blocked-client-input requires an explicit blocker`)
  }
}

for (const requiredId of requiredIds) {
  if (!seenIds.has(requiredId)) findings.push(`${requiredId}: required workstream is missing`)
}

const openBlockers = workstreams.flatMap((workstream) =>
  (workstream.blockers ?? []).map((blocker) => ({ workstream: workstream.id, blocker })),
)
const allAccepted = workstreams.length > 0 && workstreams.every((workstream) => workstream.status === 'accepted')

if (manifest.overallStatus === 'accepted' && (!allAccepted || openBlockers.length > 0)) {
  findings.push('overallStatus cannot be accepted until every workstream is accepted and blockers are empty')
}

if (findings.length) {
  console.error('Contract closeout verification failed:')
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

console.log(`Contract closeout verification passed: workstreams=${workstreams.length}; blockers=${openBlockers.length}`)
for (const workstream of workstreams) {
  console.log(`- ${workstream.id}: ${workstream.status}; blockers=${workstream.blockers.length}`)
}
