import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'

const root = process.cwd()
const appRoot = join(root, 'app')

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const auditedViews = walk(appRoot)
  .filter((file) => file.endsWith('/page.tsx') || file.endsWith('/route.ts'))
  .map((file) => relative(root, file).replaceAll('\\', '/'))

const forbidden = [
  [/Math\.random\s*\(/, 'random values'],
  [/\bmock\b/i, 'mock data'],
  [/synthetic/i, 'synthetic data'],
  [/https?:\/\/example\.com(?:\/|\b)/i, 'example.com placeholder source'],
  [/opportunity_score/i, 'unverified opportunity score'],
  [/\.from\(['"](?:properties|market_data|ai_reports|recommendations|external_market_benchmarks)['"]\)/, 'unreconciled Supabase business data'],
  [/@\/lib\/vitacura/, 'hardcoded neighborhood intelligence'],
]

function resolveImport(fromFile, specifier) {
  const base = specifier.startsWith('@/') ? join(root, specifier.slice(2)) : resolve(dirname(fromFile), specifier)
  const candidates = extname(base) ? [base] : [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')]
  return candidates.find((candidate) => existsSync(candidate))
}

const checked = new Set()
function inspect(file, entry) {
  if (checked.has(file)) return []
  checked.add(file)
  const source = readFileSync(file, 'utf8')
  const failures = forbidden
    .filter(([pattern, label]) => {
      if (entry.endsWith('/route.ts') && label === 'unreconciled Supabase business data') return false
      return pattern.test(source)
    })
    .map(([, label]) => `${entry} -> ${relative(root, file)}: ${label}`)
  const imports = [...source.matchAll(/(?:from\s+|import\s*\()['"]([^'"]+)['"]/g)]
    .map((match) => match[1])
    .filter((specifier) => specifier.startsWith('@/') || specifier.startsWith('.'))
    .map((specifier) => resolveImport(file, specifier))
    .filter(Boolean)
  return failures.concat(imports.flatMap((dependency) => inspect(dependency, entry)))
}

const failures = auditedViews.flatMap((entry) => inspect(join(root, entry), entry))

const protectedFiles = [
  'supabase/migrations/20260710_create_neighborhoods.sql',
  'supabase/migrations/20260712_production_database_init.sql',
  'supabase/migrations/20260712_roles_expansion.sql',
  'lib/market-import.ts',
  'lib/market-history.ts',
]
const protectedPatterns = [
  [/https?:\/\/example\.com(?:\/|\b)/i, 'example.com placeholder source'],
  [/[ad]0000000-0000-0000-0000-00000000000[1-9]/i, 'deterministic seed identity'],
  [/opportunity_score/i, 'unverified opportunity score'],
  [/INSERT\s+INTO\s+(?:public\.)?(?:neighborhoods|kpi_snapshots)\b/i, 'unverified business seed data'],
]

for (const protectedFile of protectedFiles) {
  const source = readFileSync(join(root, protectedFile), 'utf8')
  for (const [pattern, label] of protectedPatterns) {
    if (pattern.test(source)) failures.push(`${protectedFile}: ${label}`)
  }
}

const sourceRiskPatterns = [
  [/https?:\/\/example\.com(?:\/|\b)/i, 'example.com placeholder source'],
  [/opportunity_score/i, 'unverified opportunity score'],
  [/\bbuildSensitivity\b|\bconfidenceFactor\b|\bfloorImpact\b|\bconditionImpact\b/, 'unauthorized valuation adjustment rule'],
]
const sourceRiskFiles = [join(root, 'app'), join(root, 'lib')]
  .flatMap((directory) => walk(directory))
  .filter((file) => /\.(?:ts|tsx|js|mjs)$/.test(file))

for (const file of sourceRiskFiles) {
  const source = readFileSync(file, 'utf8')
  for (const [pattern, label] of sourceRiskPatterns) {
    if (pattern.test(source)) failures.push(`${relative(root, file)}: ${label}`)
  }
}
if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL ${failure}`))
  process.exit(1)
}
console.log(`PASS ${auditedViews.length} audited routes and ${checked.size} local dependencies contain no mock, synthetic, random or unreconciled business sources.`)
