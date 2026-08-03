import fs from 'node:fs'

const data = JSON.parse(fs.readFileSync('config/production-readiness-status.json', 'utf8'))
const allowedStatus = new Set(['in-review', 'ready', 'blocked'])
const allowedCheck = new Set(['pending', 'passed', 'failed', 'not-applicable'])

if (data.schemaVersion !== 1) throw new Error('Unsupported production readiness schemaVersion')
if (!allowedStatus.has(data.status)) throw new Error('Invalid production readiness status')

for (const [name, value] of Object.entries(data.checks ?? {})) {
  if (!allowedCheck.has(value)) throw new Error(`Invalid readiness check ${name}: ${value}`)
}

if (data.status === 'ready') {
  if (!data.commit) throw new Error('Ready status requires commit')
  if (!/^https:\/\//.test(data.deployment ?? '')) throw new Error('Ready status requires HTTPS deployment')
  const incomplete = Object.entries(data.checks).filter(([, value]) => value !== 'passed' && value !== 'not-applicable')
  if (incomplete.length) throw new Error(`Ready status has incomplete checks: ${incomplete.map(([name]) => name).join(', ')}`)
  if ((data.criticalFindings ?? []).length || (data.highFindings ?? []).length) throw new Error('Ready status cannot contain critical or high findings')
  if (!Array.isArray(data.evidence) || data.evidence.length === 0) throw new Error('Ready status requires evidence')
}

console.log(`Production readiness status verified: ${data.status}`)
