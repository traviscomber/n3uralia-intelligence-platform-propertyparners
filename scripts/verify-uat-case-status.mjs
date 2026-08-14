import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const manifestPath = path.join(root, 'config/uat-case-status.json')
const findings = []

if (!fs.existsSync(manifestPath)) {
  console.error('UAT case verification failed: manifest is missing.')
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const allowed = new Set(manifest.allowedStatuses ?? [])
const required = new Set(['UAT-01','UAT-02','UAT-03','UAT-04','UAT-05','UAT-06','UAT-07','UAT-08'])
const seen = new Set()

if (manifest.schemaVersion !== 1) findings.push('schemaVersion must be 1')
if (!/^\d{4}-\d{2}-\d{2}$/.test(manifest.asOf ?? '')) findings.push('asOf must use YYYY-MM-DD')

for (const item of manifest.cases ?? []) {
  if (!item.id || seen.has(item.id)) findings.push(`duplicate or missing case id: ${item.id ?? '(missing)'}`)
  seen.add(item.id)
  if (!allowed.has(item.status)) findings.push(`${item.id}: invalid status ${item.status}`)
  if (!['N3uralia','Client','Shared'].includes(item.owner)) findings.push(`${item.id}: invalid owner ${item.owner}`)
  if (!Array.isArray(item.evidence)) findings.push(`${item.id}: evidence must be an array`)
  if (['passed','accepted-with-observation'].includes(item.status) && item.evidence.length === 0) {
    findings.push(`${item.id}: completed status requires evidence`)
  }
  if (item.status === 'failed' && item.blocking !== true) findings.push(`${item.id}: failed case must be blocking`)
}

for (const id of required) if (!seen.has(id)) findings.push(`${id}: required case is missing`)

if (findings.length) {
  console.error('UAT case verification failed:')
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

const counts = Object.groupBy(manifest.cases, (item) => item.status)
console.log(`UAT case verification passed: total=${manifest.cases.length}; pending=${counts.pending?.length ?? 0}; passed=${counts.passed?.length ?? 0}; blocked=${counts['blocked-client-input']?.length ?? 0}`)
