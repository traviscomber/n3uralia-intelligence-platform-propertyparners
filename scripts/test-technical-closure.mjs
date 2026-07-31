import fs from 'node:fs'

const requiredFiles = [
  'docs/TECHNICAL_CLOSURE_RECORD.md',
  'docs/CONTRACTUAL_DELIVERY_PACKAGE.md',
  'docs/FINAL_ACCEPTANCE_CHECKLIST.md',
  'docs/QA_ACCEPTANCE_MATRIX.md',
  'docs/VISUAL_QA_EXECUTION_LOG.md',
  'scripts/test-central-access-regression.mjs',
  'scripts/test-administrative-access-regression.mjs',
  'scripts/test-settings-access-regression.mjs',
  'scripts/test-profile-scope-regression.mjs',
  'scripts/test-valuation-report-access.mjs',
]

const missing = requiredFiles.filter((file) => !fs.existsSync(file))
if (missing.length) {
  console.error(`Missing closure evidence: ${missing.join(', ')}`)
  process.exit(1)
}

const closure = fs.readFileSync('docs/TECHNICAL_CLOSURE_RECORD.md', 'utf8')
const requiredStatements = [
  'QA visual autenticado queda diferido',
  'Regla oficial de ranking',
  'Fuente separada para captaciones brutas',
  'no declara',
  'Reapertura',
]

const absentStatements = requiredStatements.filter((statement) => !closure.includes(statement))
if (absentStatements.length) {
  console.error(`Closure record is incomplete: ${absentStatements.join(', ')}`)
  process.exit(1)
}

console.log(JSON.stringify({ status: 'ok', evidenceFiles: requiredFiles.length }, null, 2))
