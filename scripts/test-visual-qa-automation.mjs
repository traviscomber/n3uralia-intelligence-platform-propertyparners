import fs from 'node:fs/promises'

const runner = await fs.readFile('scripts/run-authenticated-visual-qa.mjs', 'utf8')
const workflow = await fs.readFile('.github/workflows/authenticated-visual-qa.yml', 'utf8')
const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'))

const checks = [
  ['runner supports per-profile passwords', runner.includes('QA_CEO_PASSWORD') && runner.includes('QA_DIRECTOR_PASSWORD')],
  ['runner never serializes passwords', !runner.includes('password: profile.password') && !runner.includes('sharedPassword,')],
  ['runner captures three viewports', runner.includes("key: 'desktop'") && runner.includes("key: 'tablet'") && runner.includes("key: 'mobile'")],
  ['runner records accessibility signals', runner.includes('unnamedFocusableCount') && runner.includes('horizontalOverflow')],
  ['runner records browser errors', runner.includes("check: 'browser-errors'")],
  ['runner validates generated PDF size', runner.includes('stat.size > 1000')],
  ['package exposes qa:visual command', packageJson.scripts?.['qa:visual'] === 'node scripts/run-authenticated-visual-qa.mjs'],
  ['workflow is manual only', workflow.includes('workflow_dispatch:') && !workflow.includes('pull_request:') && !workflow.includes('push:')],
  ['workflow uses repository secrets', workflow.includes('secrets.QA_CEO_EMAIL') && workflow.includes('secrets.QA_SANTA_MARIA_PASSWORD')],
  ['workflow uploads evidence even on failure', workflow.includes('if: always()') && workflow.includes('actions/upload-artifact@v4')],
  ['workflow uses frozen lockfile', workflow.includes('pnpm install --frozen-lockfile')],
]

const failed = checks.filter(([, passed]) => !passed)
for (const [label, passed] of checks) console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`)
if (failed.length) {
  console.error(`Visual QA automation regression failed: ${failed.length} check(s).`)
  process.exit(1)
}
console.log(`Visual QA automation regression passed: ${checks.length} checks.`)
