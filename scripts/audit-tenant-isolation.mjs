import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const findings = []
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.sql'])
const scanRoots = ['app', 'components', 'lib', 'supabase']

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
    const hasAuthSignal = /(getUser|getSession|requireAuth|requireCapability|requireAnyCapability|authorize|accessErrorResponse|tenantId|tenant_id|organizationId|organization_id|officeId|office_id|companyId|company_id)/i.test(text)
    if (!hasAuthSignal) {
      findings.push(`${rel}: database API route has no visible authentication, authorization or tenant-scope signal`)
    }
  }

  if (/(globalDataset|sharedTraining|trainingCorpus|benchmarkDataset|crossTenant|allTenants)/i.test(text)
      && /(canonical|property partners|client_evidence|crm|report)/i.test(text)) {
    findings.push(`${rel}: possible cross-tenant or training reuse of client evidence`)
  }

  if (/create policy/i.test(text)
      && !/(auth\.uid\(\)|tenant_id|organization_id|office_id|company_id|service_role)/i.test(text)) {
    findings.push(`${rel}: RLS policy lacks a visible user, tenant or explicitly privileged service predicate`)
  }
}

if (findings.length) {
  console.error('Tenant isolation audit failed:')
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

console.log('Tenant isolation and client-data reuse audit passed.')
