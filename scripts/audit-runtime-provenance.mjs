import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'

const root = process.cwd()
const dashboardRoot = join(root, 'app/dashboard')
const operationalRoutes = new Set([
  'app/dashboard/knowledge/page.tsx',
  'app/dashboard/market/import/page.tsx',
  'app/dashboard/settings/page.tsx',
  'app/dashboard/sources/page.tsx',
])

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const auditedViews = walk(dashboardRoot)
  .filter((file) => file.endsWith('/page.tsx'))
  .map((file) => relative(root, file).replaceAll('\\', '/'))
  .filter((file) => !operationalRoutes.has(file))

const forbidden = [
  [/Math\.random\s*\(/, 'random values'],
  [/\bmock\b/i, 'mock data'],
  [/synthetic/i, 'synthetic data'],
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
  const failures = forbidden.filter(([pattern]) => pattern.test(source)).map(([, label]) => `${entry} -> ${relative(root, file)}: ${label}`)
  const imports = [...source.matchAll(/(?:from\s+|import\s*\()['"]([^'"]+)['"]/g)]
    .map((match) => match[1])
    .filter((specifier) => specifier.startsWith('@/') || specifier.startsWith('.'))
    .map((specifier) => resolveImport(file, specifier))
    .filter(Boolean)
  return failures.concat(imports.flatMap((dependency) => inspect(dependency, entry)))
}

const failures = auditedViews.flatMap((entry) => inspect(join(root, entry), entry))
if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL ${failure}`))
  process.exit(1)
}
console.log(`PASS ${auditedViews.length} audited routes and ${checked.size} local dependencies contain no mock, synthetic, random or unreconciled business sources.`)
