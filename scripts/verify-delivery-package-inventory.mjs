import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const manifestPath = path.join(root, 'config/delivery-package-inventory.json')
const findings = []

if (!fs.existsSync(manifestPath)) {
  console.error('Delivery package verification failed: manifest is missing.')
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const allowed = new Set(manifest.allowedStatuses ?? [])
if (manifest.schemaVersion !== 1) findings.push('schemaVersion must be 1')
if (!allowed.has(manifest.status)) findings.push(`invalid status ${manifest.status}`)
if (!Array.isArray(manifest.requiredSections) || manifest.requiredSections.length !== 5) findings.push('five required sections must be declared')
if (!Array.isArray(manifest.included)) findings.push('included must be an array')
if (!Array.isArray(manifest.excludedPatterns) || manifest.excludedPatterns.length === 0) findings.push('excludedPatterns must not be empty')

const completed = ['verified','delivered'].includes(manifest.status)
if (completed) {
  const sections = new Set((manifest.included ?? []).map((item) => item.section))
  for (const section of manifest.requiredSections) if (!sections.has(section)) findings.push(`${section}: no included artifact recorded`)
  if (!/^[a-f0-9]{64}$/i.test(manifest.checksumSha256 ?? '')) findings.push('verified package requires SHA-256 checksum')
  if (manifest.cleanReconstruction?.status !== 'passed' || !(manifest.cleanReconstruction?.evidence?.length > 0)) findings.push('verified package requires clean reconstruction evidence')
}
if (manifest.status === 'delivered' && (manifest.deliveryAuthorization?.status !== 'approved' || !(manifest.deliveryAuthorization?.evidence?.length > 0))) {
  findings.push('delivered package requires explicit authorization evidence')
}

const serialized = JSON.stringify(manifest)
for (const forbidden of ['service_role','PRIVATE KEY','BEGIN RSA','password=']) {
  if (serialized.includes(forbidden)) findings.push(`manifest contains forbidden sensitive marker: ${forbidden}`)
}

if (findings.length) {
  console.error('Delivery package verification failed:')
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}
console.log(`Delivery package verification passed: status=${manifest.status}; included=${manifest.included.length}`)
