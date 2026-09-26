import fs from 'node:fs'
import crypto from 'node:crypto'
import path from 'node:path'

const configPath = 'config/supabase-recovery-contract.json'
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
const artifactMode = process.argv.includes('--artifact')

function fail(message) {
  console.error('RECOVERY_CONTRACT_FAIL:', message)
  process.exit(1)
}

if (config.schemaVersion !== 1) fail('Unexpected schemaVersion')
if (config.projectRef !== 'orfncinmhymhhoxbxgjb') fail('Unexpected Supabase project ref')
if (!/^\d{14}$/.test(config.repoBaselineLastMigration)) fail('Invalid repo baseline migration version')
if (!/^\d{14}$/.test(config.remoteLedgerLastMigration)) fail('Invalid remote ledger migration version')
if (!['repair-required', 'aligned'].includes(config.ledgerStatus)) fail('Unknown ledgerStatus')
if (!Array.isArray(config.mismatches)) fail('mismatches must be an array')

for (const item of config.mismatches) {
  if (!item.schemaVerified) fail(`Schema equivalence not verified for ${item.repoVersion}`)
  const file = path.join('supabase', 'migrations', `${item.repoVersion}_${item.repoName}.sql`)
  if (!fs.existsSync(file)) fail(`Missing repo migration ${file}`)
  if (!/^\d{14}$/.test(item.appliedVersion)) fail(`Invalid applied version for ${item.repoVersion}`)
}

function inspectBaseline(file, manifestFile) {
  if (!fs.existsSync(file)) fail(`Baseline artifact not found: ${file}`)
  const sql = fs.readFileSync(file, 'utf8')
  if (sql.length < 10000) fail('Baseline artifact is unexpectedly small')
  if (!/CREATE TABLE/i.test(sql)) fail('Baseline has no CREATE TABLE statements')
  if (!/CREATE (OR REPLACE )?FUNCTION/i.test(sql)) fail('Baseline has no functions')
  if (/COPY\s+[^;]+\s+FROM\s+stdin/i.test(sql)) fail('Baseline contains row COPY data')
  if (/ALTER\s+ROLE\s+[^;]+PASSWORD/i.test(sql)) fail('Baseline contains role password material')
  if (/service_role_key|supabase_service_role_key|eyJ[a-zA-Z0-9_-]{20,}\./i.test(sql)) fail('Baseline contains token-like secret material')

  const sha256 = crypto.createHash('sha256').update(sql).digest('hex')
  const manifest = {
    schemaVersion: 1,
    projectRef: config.projectRef,
    generatedAt: new Date().toISOString(),
    sourceSchemas: config.baseline.sourceSchemas,
    repoBaselineLastMigration: config.repoBaselineLastMigration,
    remoteLedgerLastMigration: config.remoteLedgerLastMigration,
    ledgerStatusAtCapture: config.ledgerStatus,
    bytes: Buffer.byteLength(sql),
    sha256,
    containsProductionRows: false
  }
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`Baseline artifact verified: ${manifest.bytes} bytes, sha256=${sha256}`)
  return sha256
}

if (artifactMode) {
  const file = process.env.BASELINE_FILE
  if (!file) fail('BASELINE_FILE is required in --artifact mode')
  const manifestFile = process.env.BASELINE_MANIFEST || path.join(path.dirname(file), 'manifest.json')
  inspectBaseline(file, manifestFile)
} else if (config.baseline.status === 'captured') {
  if (!config.baseline.sha256) fail('Captured baseline requires sha256')
  const actual = inspectBaseline(config.baseline.file, path.join(path.dirname(config.baseline.file), 'manifest.verify.json'))
  if (actual !== config.baseline.sha256) fail('Committed baseline sha256 does not match contract')
} else if (config.baseline.status !== 'pending-capture') {
  fail('Unknown baseline status')
}

console.log(`Supabase recovery contract verified: ledger=${config.ledgerStatus}, baseline=${config.baseline.status}`)
