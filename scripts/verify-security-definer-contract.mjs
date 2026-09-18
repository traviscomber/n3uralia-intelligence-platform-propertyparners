import fs from 'node:fs'
import path from 'node:path'

const migrationsDir = 'supabase/migrations'
const hardeningFile = '20260918143000_harden_security_definer_execute.sql'
const hardeningPath = path.join(migrationsDir, hardeningFile)
const hardening = fs.readFileSync(hardeningPath, 'utf8')

const required = [
  /where n\.nspname = 'public'/i,
  /p\.prosecdef/i,
  /revoke execute on function/i,
  /from public, anon/i,
  /alter default privileges for role postgres in schema public/i,
  /revoke execute on functions from public/i,
]

for (const pattern of required) {
  if (!pattern.test(hardening)) {
    throw new Error(`Missing SECURITY DEFINER hardening invariant: ${pattern}`)
  }
}

const sqlFiles = fs.readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort()

const futureFiles = sqlFiles.filter((name) => name > hardeningFile)
const findings = []

for (const name of futureFiles) {
  const source = fs.readFileSync(path.join(migrationsDir, name), 'utf8')

  if (/grant\s+execute\s+on\s+function[\s\S]*?\s+to\s+(public|anon)\b/i.test(source)) {
    findings.push(`${name}: explicitly grants function execute to PUBLIC/anon`)
  }

  const introducesSecurityDefiner =
    /security\s+definer/i.test(source) ||
    /alter\s+function[\s\S]*?security\s+definer/i.test(source)

  if (!introducesSecurityDefiner) continue

  const closesPublic = /revoke\s+(all|execute)\s+on\s+function[\s\S]*?from\s+public\b/i.test(source)
  const closesAnon = /revoke\s+(all|execute)\s+on\s+function[\s\S]*?from[\s\S]*?\banon\b/i.test(source)

  if (!closesPublic || !closesAnon) {
    findings.push(`${name}: SECURITY DEFINER introduced without explicit PUBLIC + anon revoke in the same migration`)
  }
}

if (findings.length) {
  throw new Error(`SECURITY DEFINER contract violations:\n- ${findings.join('\n- ')}`)
}

console.log(`SECURITY DEFINER contract verified: baseline hardening present; ${futureFiles.length} later migration(s) scanned; no PUBLIC/anon execute regressions.`)
