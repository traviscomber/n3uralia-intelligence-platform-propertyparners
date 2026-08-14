import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const manifestPath = path.join(root, 'config/contract-release-candidate.json')
const findings = []

if (!fs.existsSync(manifestPath)) {
  console.error('Release candidate verification failed: manifest is missing.')
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
if (manifest.schemaVersion !== 1) findings.push('schemaVersion must be 1')
if (!['not-ready', 'ready'].includes(manifest.status)) findings.push('status must be not-ready or ready')
if (!Number.isInteger(manifest.openCriticalFindings) || manifest.openCriticalFindings < 0) findings.push('openCriticalFindings must be a non-negative integer')
if (!Number.isInteger(manifest.openHighFindings) || manifest.openHighFindings < 0) findings.push('openHighFindings must be a non-negative integer')

if (manifest.status === 'ready') {
  if (!/^[0-9a-f]{40}$/.test(manifest.commit ?? '')) findings.push('ready release requires a full commit SHA')
  if (!/^https:\/\//.test(manifest.deploymentUrl ?? '')) findings.push('ready release requires an HTTPS deployment URL')
  if (!manifest.buildVerified) findings.push('ready release requires buildVerified=true')
  if (!manifest.uatAccepted) findings.push('ready release requires uatAccepted=true')
  if (!manifest.trainingCompleted) findings.push('ready release requires trainingCompleted=true')
  if (!/^[0-9a-f]{64}$/.test(manifest.deliveryChecksumSha256 ?? '')) findings.push('ready release requires a SHA-256 checksum')
  if (!manifest.clientAcceptanceRecorded) findings.push('ready release requires clientAcceptanceRecorded=true')
  if (manifest.openCriticalFindings !== 0) findings.push('ready release cannot have critical findings')
  if (manifest.openHighFindings !== 0) findings.push('ready release cannot have high findings')
}

if (findings.length) {
  console.error('Release candidate verification failed:')
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

console.log(`Release candidate verification passed: status=${manifest.status}; critical=${manifest.openCriticalFindings}; high=${manifest.openHighFindings}`)
