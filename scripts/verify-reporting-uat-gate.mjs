import { spawnSync } from 'node:child_process'

const commands = [
  ['pnpm', ['management:scoring:verify']],
  ['pnpm', ['management:reports:verify']],
  ['pnpm', ['management:persisted:verify']],
  ['pnpm', ['management:reconciliation:verify']],
  ['pnpm', ['management:delivery:verify']],
  ['pnpm', ['access:verify']],
  ['node', ['--import', 'tsx', 'scripts/verify-june-management-report.ts']],
]

for (const [command, args] of commands) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
