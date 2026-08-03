import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const closeoutPath = path.join(root, 'config/contract-closeout-status.json')
const evidencePath = path.join(root, 'config/contract-closeout-evidence.json')
const findings = []

for (const requiredPath of [closeoutPath, evidencePath]) {
  if (!fs.existsSync(requiredPath)) {
    findings.push(`${path.relative(root, requiredPath)}: required contract closeout file is missing`)
  }
}

if (findings.length) {
  console.error('Contract closeout evidence verification failed:')
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

const closeout = JSON.parse(fs.readFileSync(closeoutPath, 'utf8'))
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'))
const records = evidence.records ?? {}
const allowedEvidenceStatuses = new Set(['pending', 'complete', 'waived-by-client'])
const requiredRecordNames = ['uat', 'training', 'deliveryPackage', 'clientAcceptance']

if (evidence.schemaVersion !== 1) findings.push('evidence schemaVersion must be 1')
if (!/^\d{4}-\d{2}-\d{2}$/.test(evidence.asOf ?? '')) findings.push('evidence asOf must use YYYY-MM-DD')

for (const recordName of requiredRecordNames) {
  const record = records[recordName]
  if (!record || typeof record !== 'object') {
    findings.push(`${recordName}: required evidence record is missing`)
    continue
  }
  if (!allowedEvidenceStatuses.has(record.status)) {
    findings.push(`${recordName}: invalid evidence status ${record.status}`)
  }
}

const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0
const validSha = (value) => nonEmpty(value) && /^[a-f0-9]{40}$/i.test(value)
const validSha256 = (value) => nonEmpty(value) && /^[a-f0-9]{64}$/i.test(value)

const uat = records.uat ?? {}
if (uat.status === 'complete') {
  if (!uat.executedAt) findings.push('uat: executedAt is required when complete')
  if (!validSha(uat.validatedCommit)) findings.push('uat: validatedCommit must be a full Git commit SHA')
  if (!nonEmpty(uat.validatedDeployment)) findings.push('uat: validatedDeployment is required when complete')
  if (!nonEmpty(uat.caseRegister)) findings.push('uat: caseRegister is required when complete')
  if (!Number.isInteger(uat.criticalOpen) || uat.criticalOpen !== 0) findings.push('uat: criticalOpen must be 0')
  if (!Number.isInteger(uat.highOpen) || uat.highOpen !== 0) findings.push('uat: highOpen must be 0')
  if (!nonEmpty(uat.clientRepresentative)) findings.push('uat: clientRepresentative is required when complete')
}

const training = records.training ?? {}
if (training.status === 'complete') {
  for (const field of ['completedAt', 'sessionRegister', 'attendanceRecord', 'functionalAdministrator', 'technicalCounterpart']) {
    if (!nonEmpty(training[field])) findings.push(`training: ${field} is required when complete`)
  }
}

const delivery = records.deliveryPackage ?? {}
if (delivery.status === 'complete') {
  if (!delivery.generatedAt) findings.push('deliveryPackage: generatedAt is required when complete')
  if (!validSha(delivery.sourceCommit)) findings.push('deliveryPackage: sourceCommit must be a full Git commit SHA')
  if (!nonEmpty(delivery.artifactReference)) findings.push('deliveryPackage: artifactReference is required when complete')
  if (!validSha256(delivery.sha256)) findings.push('deliveryPackage: sha256 must contain 64 hexadecimal characters')
  if (!nonEmpty(delivery.cleanRebuildRecord)) findings.push('deliveryPackage: cleanRebuildRecord is required when complete')
}

const acceptance = records.clientAcceptance ?? {}
if (acceptance.status === 'complete') {
  for (const field of ['acceptedAt', 'acceptanceRecord', 'acceptedBy']) {
    if (!nonEmpty(acceptance[field])) findings.push(`clientAcceptance: ${field} is required when complete`)
  }
  if (!validSha(acceptance.acceptedCommit)) findings.push('clientAcceptance: acceptedCommit must be a full Git commit SHA')
}

const workstreamById = Object.fromEntries((closeout.workstreams ?? []).map((item) => [item.id, item]))
const evidenceRequirements = {
  'uat-and-acceptance': 'uat',
  'training-and-handover': 'training',
  'final-delivery-package': 'deliveryPackage',
}

for (const [workstreamId, recordName] of Object.entries(evidenceRequirements)) {
  if (workstreamById[workstreamId]?.status === 'accepted' && records[recordName]?.status !== 'complete' && records[recordName]?.status !== 'waived-by-client') {
    findings.push(`${workstreamId}: accepted status requires complete or client-waived ${recordName} evidence`)
  }
}

if (closeout.overallStatus === 'accepted') {
  for (const recordName of requiredRecordNames) {
    if (records[recordName]?.status !== 'complete' && records[recordName]?.status !== 'waived-by-client') {
      findings.push(`overall accepted status requires complete or client-waived ${recordName} evidence`)
    }
  }
}

if (findings.length) {
  console.error('Contract closeout evidence verification failed:')
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

console.log('Contract closeout evidence verification passed.')
for (const recordName of requiredRecordNames) {
  console.log(`- ${recordName}: ${records[recordName].status}`)
}
