import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const findings = []
const reviewItems = []
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.sql'])
const scanRoots = ['app', 'components', 'lib', 'supabase']
const reviewManifestPath = path.join(root, 'config', 'tenant-isolation-review.json')
const reviewManifest = JSON.parse(fs.readFileSync(reviewManifestPath, 'utf8'))
const reviewedApiRoutes = new Set(reviewManifest.apiRoutes ?? [])
const reviewedMigrations = new Set(reviewManifest.historicalMigrations ?? [])
const verifiedHistoricalMigrations = new Set(reviewManifest.verifiedHistoricalMigrations ?? [])

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git', 'dist', 'coverage'].includes(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (extensions.has(path.extname(entry.name))) out.push(full)
  }
  return out
}

for (const file of scanRoots.flatMap((directory) => walk(path.join(root, directory)))) {
  const rel = path.relative(root, file).replaceAll('\\', '/')
  const text = fs.readFileSync(file, 'utf8')
  const isClient = /^\s*['\"]use client['\"];?/m.test(text)

  if (isClient && /(SUPABASE_SERVICE_ROLE_KEY|service_role|createAdminClient|postgres\()/i.test(text)) {
    findings.push(`${rel}: privileged database access referenced from client code`)
  }

  if (/^app\/api\//.test(rel) && /(\.from\(|\.rpc\()/i.test(text)) {
    const hasAuthSignal = /(getUser|getSession|requireAuth|requireRoleAccess|requireExecutiveAccess|requireCapability|requireAnyCapability|authorize|accessErrorResponse|tenantId|tenant_id|organizationId|organization_id|officeId|office_id|companyId|company_id|CRON_SECRET|authorization)/i.test(text)
    if (!hasAuthSignal) {
      if (reviewedApiRoutes.has(rel)) reviewItems.push(`${rel}: route authorization requires manual verification`)
      else findings.push(`${rel}: untracked database API route lacks a visible authorization or tenant-scope signal`)
    }
  }

  if (/(globalDataset|sharedTraining|trainingCorpus|benchmarkDataset|crossTenant|allTenants)/i.test(text)
      && /(canonical|property partners|client_evidence|crm|report)/i.test(text)) {
    findings.push(`${rel}: possible cross-tenant or training reuse of client evidence`)
  }

  if (/^supabase\/migrations\//.test(rel)
      && /create policy/i.test(text)
      && !/(auth\.uid\(\)|tenant_id|organization_id|office_id|company_id|service_role)/i.test(text)) {
    if (verifiedHistoricalMigrations.has(rel)) continue
    if (reviewedMigrations.has(rel)) reviewItems.push(`${rel}: historical policy requires live Supabase verification`)
    else findings.push(`${rel}: untracked RLS policy lacks a visible user, tenant or service predicate`)
  }
}

if (findings.length) {
  console.error('Tenant isolation audit failed:')
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

console.log(`Tenant isolation audit passed; manualReview=${reviewItems.length}; verifiedHistorical=${verifiedHistoricalMigrations.size}`)
for (const item of reviewItems) console.warn(`[tenant-isolation-review] ${item}`)
