import fs from 'node:fs'
import path from 'node:path'

const migrationsDir = 'supabase/migrations'
const hardeningFile = '20260918143000_harden_security_definer_execute.sql'
const hardeningPath = path.join(migrationsDir, hardeningFile)
const hardening = fs.readFileSync(hardeningPath, 'utf8')

for (const pattern of [
  /where n\.nspname = 'public'/i,
  /p\.prosecdef/i,
  /revoke execute on function/i,
  /from public, anon/i,
  /alter default privileges for role postgres in schema public/i,
  /revoke execute on functions from public/i,
]) {
  if (!pattern.test(hardening)) throw new Error(`Missing SECURITY DEFINER hardening invariant: ${pattern}`)
}

const futureMigrations = fs.readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql') && name > hardeningFile)
  .sort()

const violations = []

for (const name of futureMigrations) {
  const source = fs.readFileSync(path.join(migrationsDir, name), 'utf8')

  if (/grant\s+execute\s+on\s+function[\s\S]*?\s+to\s+(?:public|anon)\b/i.test(source)) {
    violations.push(`${name}: grants function EXECUTE to PUBLIC/anon`)
  }

  if (/security\s+definer/i.test(source)) {
    const explicitlyClosed =
      /revoke\s+(?:all|execute)\s+on\s+function[\s\S]*?\s+from\s+public\s*,\s*anon\b/i.test(source) ||
      (/revoke\s+(?:all|execute)\s+on\s+function[\s\S]*?\s+from\s+public\b/i.test(source) &&
       /revoke\s+(?:all|execute)\s+on\s+function[\s\S]*?\s+from\s+anon\b/i.test(source))

    if (!explicitlyClosed) {
      violations.push(`${name}: defines SECURITY DEFINER without explicitly revoking PUBLIC/anon EXECUTE`)
    }
  }
}

if (violations.length) {
  throw new Error(`SECURITY DEFINER contract violations:\n- ${violations.join('\n- ')}`)
}

console.log(`SECURITY DEFINER contract verified: baseline hardening present and ${futureMigrations.length} later migrations scanned.`)
