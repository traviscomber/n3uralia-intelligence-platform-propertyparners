import { readFileSync } from 'node:fs'

const auditedViews = [
  'app/dashboard/page.tsx',
  'app/dashboard/ceo/page.tsx',
  'app/dashboard/director/page.tsx',
  'app/dashboard/control/page.tsx',
  'app/dashboard/datos-crm/page.tsx',
  'app/dashboard/inteligencia/page.tsx',
  'app/dashboard/market/page.tsx',
  'app/dashboard/market/fuentes/page.tsx',
  'app/dashboard/metas/page.tsx',
  'app/dashboard/ml-lab/page.tsx',
  'app/dashboard/presentaciones/page.tsx',
  'app/dashboard/properties/page.tsx',
  'app/dashboard/reportes/directorio/page.tsx',
  'app/dashboard/valorizador/page.tsx',
]

const forbidden = [
  [/Math\.random\s*\(/, 'random values'],
  [/\bmock\b/i, 'mock data'],
  [/synthetic/i, 'synthetic data'],
  [/\.from\(['"](?:properties|market_data|ai_reports|recommendations|external_market_benchmarks)['"]\)/, 'unreconciled Supabase business data'],
  [/@\/lib\/vitacura/, 'hardcoded neighborhood intelligence'],
]

let failed = false
for (const file of auditedViews) {
  const source = readFileSync(file, 'utf8')
  for (const [pattern, label] of forbidden) {
    if (pattern.test(source)) {
      console.error(`FAIL ${file}: ${label}`)
      failed = true
    }
  }
}

if (failed) process.exit(1)
console.log(`PASS ${auditedViews.length} audited views contain no mock, synthetic, random or unreconciled business sources.`)
