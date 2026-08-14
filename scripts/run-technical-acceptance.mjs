import { spawnSync } from 'node:child_process'

const groups = [
  {
    name: 'Acceso y contrato',
    commands: [
      ['pnpm', ['access:verify']],
      ['pnpm', ['contract:closeout:verify']],
      ['pnpm', ['contract:closeout:evidence:verify']],
      ['pnpm', ['contract:dependencies:verify']],
      ['pnpm', ['contract:documents:verify']],
    ],
  },
  {
    name: 'Pilar I · Inteligencia de Mercado',
    commands: [
      ['pnpm', ['market:identity:verify']],
      ['pnpm', ['market:ingestion:verify']],
      ['pnpm', ['market:contract:verify']],
    ],
  },
  {
    name: 'Pilar II · Valorización',
    commands: [
      ['pnpm', ['valuation:model:verify']],
      ['pnpm', ['valuation:workflow:verify']],
      ['pnpm', ['valuation:condition:verify']],
    ],
  },
  {
    name: 'Pilar III · Control de Gestión',
    commands: [
      ['pnpm', ['management:scoring:verify']],
      ['pnpm', ['management:persisted:verify']],
      ['pnpm', ['management:reconciliation:verify']],
      ['pnpm', ['management:reports:verify']],
      ['pnpm', ['management:delivery:verify']],
    ],
  },
  {
    name: 'Trazabilidad y artefactos',
    commands: [
      ['pnpm', ['test:documents']],
      ['pnpm', ['test:traceability']],
      ['pnpm', ['reportin:verify']],
    ],
  },
  {
    name: 'Build de producción',
    commands: [
      ['pnpm', ['build']],
    ],
  },
]

const results = []

for (const group of groups) {
  console.log(`\n=== ${group.name} ===`)
  for (const [command, args] of group.commands) {
    const label = `${command} ${args.join(' ')}`
    console.log(`\n> ${label}`)
    const result = spawnSync(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })

    if (result.error) {
      console.error(`ERROR: no fue posible ejecutar ${label}: ${result.error.message}`)
      process.exit(1)
    }

    const ok = result.status === 0
    results.push({ group: group.name, command: label, ok })
    if (!ok) {
      console.error(`\nQA técnico detenido: ${label} terminó con código ${result.status ?? 'desconocido'}.`)
      process.exit(result.status ?? 1)
    }
  }
}

console.log('\n=== Resumen de aceptación técnica ===')
for (const result of results) {
  console.log(`OK  ${result.group} · ${result.command}`)
}
console.log(`\n${results.length} verificaciones completadas sin errores.`)
console.log('Nota: este comando no sustituye UAT visual autenticado ni definiciones pendientes del cliente.')
