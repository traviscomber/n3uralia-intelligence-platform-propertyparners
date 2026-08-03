import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const manifestPath = path.join(root, 'config/client-dependencies-status.json')
const findings = []

if (!fs.existsSync(manifestPath)) {
  console.error('Client dependency verification failed: manifest is missing.')
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const allowedStatuses = new Set(manifest.allowedStatuses ?? [])
const allowedOwners = new Set(['Client', 'Shared', 'N3uralia'])
const requiredIds = new Set([
  'market-cbr-sales',
  'market-kml',
  'kpi-dictionary',
  'users-and-roles',
  'reporting-approval',
  'uat-participants',
  'training-participants',
  'third-party-ownership',
])

if (manifest.schemaVersion !== 1) findings.push('schemaVersion must be 1')
if (!/^\d{4}-\d{2}-\d{2}$/.test(manifest.asOf ?? '')) findings.push('asOf must use YYYY-MM-DD')

const seen = new Set()
for (const dependency of manifest.dependencies ?? []) {
  if (!dependency.id || seen.has(dependency.id)) {
    findings.push(`duplicate or missing dependency id: ${dependency.id ?? '(missing)'}`)
    continue
  }
  seen.add(dependency.id)
  if (!allowedOwners.has(dependency.owner)) findings.push(`${dependency.id}: invalid owner`)
  if (!allowedStatuses.has(dependency.status)) findings.push(`${dependency.id}: invalid status`)
  if (!Array.isArray(dependency.requiredFor) || dependency.requiredFor.length === 0) {
    findings.push(`${dependency.id}: requiredFor must not be empty`)
  }
  if (!Array.isArray(dependency.evidence)) findings.push(`${dependency.id}: evidence must be an array`)
  if (['received', 'approved', 'waived'].includes(dependency.status) && dependency.evidence.length === 0) {
    findings.push(`${dependency.id}: ${dependency.status} requires evidence`)
  }
}

for (const id of requiredIds) if (!seen.has(id)) findings.push(`${id}: required dependency is missing`)

if (findings.length) {
  console.error('Client dependency verification failed:')
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

const pending = (manifest.dependencies ?? []).filter((item) => item.status === 'pending')
console.log(`Client dependency verification passed: total=${manifest.dependencies.length}; pending=${pending.length}`)
for (const item of pending) console.log(`- pending: ${item.id} (${item.owner})`)
