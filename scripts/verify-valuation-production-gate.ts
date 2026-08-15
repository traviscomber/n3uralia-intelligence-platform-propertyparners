import { spawnSync } from 'node:child_process'

const checks = [
  ['full valuation regression suite', ['run', 'test:valuation']],
  ['production closeout guardrails', ['exec', 'tsx', 'scripts/verify-valuation-production-closeout.ts']],
  ['deterministic model', ['run', 'valuation:model:verify']],
  ['valuation intelligence', ['run', 'valuation:verify']],
  ['valuation workflow', ['run', 'valuation:workflow:verify']],
  ['valuation condition', ['run', 'valuation:condition:verify']],
] as const

let failed = false
for (const [name, args] of checks) {
  console.log(`\n[valuation-gate] ${name}`)
  const result = spawnSync('pnpm', args, { stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.status !== 0) {
    failed = true
    console.error(`[valuation-gate] FAILED: ${name}`)
  } else {
    console.log(`[valuation-gate] PASS: ${name}`)
  }
}

if (failed) {
  console.error('\n[valuation-gate] BLOCKED: valuation production gate failed')
  process.exit(1)
}

console.log('\n[valuation-gate] PASS: all valuation checks passed')
