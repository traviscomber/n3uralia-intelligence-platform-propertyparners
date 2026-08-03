import fs from 'node:fs'

const file = 'config/client-acceptance-status.json'
const data = JSON.parse(fs.readFileSync(file, 'utf8'))
const allowed = new Set(['pending', 'accepted', 'accepted-with-observations', 'rejected'])

if (data.schemaVersion !== 1) throw new Error('Unsupported client acceptance schemaVersion')
if (!allowed.has(data.overallStatus)) throw new Error('Invalid client acceptance overallStatus')

const requiresEvidence = data.overallStatus !== 'pending'
if (requiresEvidence) {
  for (const field of ['acceptedCommit', 'acceptedDeployment', 'acceptedAt', 'clientRepresentative', 'n3uraliaRepresentative']) {
    if (!data[field]) throw new Error(`Missing ${field} for ${data.overallStatus}`)
  }
  if (!/^https:\/\//.test(data.acceptedDeployment)) throw new Error('acceptedDeployment must be HTTPS')
  if (!Array.isArray(data.evidence) || data.evidence.length === 0) throw new Error('Acceptance requires evidence')
}

if (data.overallStatus === 'accepted' && Array.isArray(data.openObservations) && data.openObservations.length > 0) {
  throw new Error('Accepted status cannot contain open observations')
}

console.log(`Client acceptance status verified: ${data.overallStatus}`)
