import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const manifestPath = path.join(root, 'config/training-session-status.json')
const findings = []

if (!fs.existsSync(manifestPath)) {
  console.error('Training verification failed: manifest is missing.')
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const allowed = new Set(manifest.allowedStatuses ?? [])
const required = new Set(['TRN-01','TRN-02','TRN-03','TRN-04','TRN-05'])
const seen = new Set()

if (manifest.schemaVersion !== 1) findings.push('schemaVersion must be 1')
for (const session of manifest.sessions ?? []) {
  if (!session.id || seen.has(session.id)) findings.push(`duplicate or missing session id: ${session.id ?? '(missing)'}`)
  seen.add(session.id)
  if (!allowed.has(session.status)) findings.push(`${session.id}: invalid status ${session.status}`)
  if (!Array.isArray(session.attendees) || !Array.isArray(session.evidence)) findings.push(`${session.id}: attendees and evidence must be arrays`)
  if (session.status === 'scheduled' && !/^\d{4}-\d{2}-\d{2}/.test(session.date ?? '')) findings.push(`${session.id}: scheduled session requires a date`)
  if (session.status === 'completed' && (session.attendees.length === 0 || session.evidence.length === 0)) findings.push(`${session.id}: completed session requires attendees and evidence`)
  if (session.status === 'waived-by-client' && session.evidence.length === 0) findings.push(`${session.id}: waiver requires client evidence`)
}
for (const id of required) if (!seen.has(id)) findings.push(`${id}: required session is missing`)

if (findings.length) {
  console.error('Training verification failed:')
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}
console.log(`Training verification passed: sessions=${manifest.sessions.length}`)
