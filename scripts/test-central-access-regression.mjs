import fs from 'node:fs'

const checks = [
  {
    file: 'app/dashboard/market/page.tsx',
    required: ["requireUserScope()", "hasCapability(scope.role, 'management.global.read')", "hasCapability(scope.role, 'management.office.read')"],
    forbidden: ["from('profiles').select('role')", "['admin', 'ceo', 'director', 'subdirector'].includes(role)"],
  },
  {
    file: 'app/api/market/comparables/route.ts',
    required: ['requireAnyCapability', 'assertProfileVisible'],
    forbidden: [],
  },
  {
    file: 'app/api/management/tasks/route.ts',
    required: ['requireAnyCapability', 'visibleProfileIds', 'assertProfileVisible'],
    forbidden: ["role === 'director'", "role === 'ceo'"],
  },
  {
    file: 'app/dashboard/valuations/[id]/report/page.tsx',
    required: ['requireAnyPageCapability'],
    forbidden: ['requirePageCapability(['],
  },
]

const failures = []
for (const check of checks) {
  const source = fs.readFileSync(check.file, 'utf8')
  for (const expected of check.required) {
    if (!source.includes(expected)) failures.push(`${check.file}: falta ${expected}`)
  }
  for (const forbidden of check.forbidden) {
    if (source.includes(forbidden)) failures.push(`${check.file}: conserva patrón local ${forbidden}`)
  }
}

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(`Central access regression: ${checks.length} surfaces verified`)
