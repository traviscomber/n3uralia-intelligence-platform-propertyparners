import fs from 'node:fs'

const migrationPath = 'supabase/migrations/20260918143000_harden_security_definer_execute.sql'
const source = fs.readFileSync(migrationPath, 'utf8')

const required = [
  /where n\.nspname = 'public'/i,
  /p\.prosecdef/i,
  /revoke execute on function/i,
  /from public, anon/i,
  /alter default privileges for role postgres in schema public/i,
  /revoke execute on functions from public/i,
]

for (const pattern of required) {
  if (!pattern.test(source)) {
    throw new Error(`Missing SECURITY DEFINER hardening invariant: ${pattern}`)
  }
}

if (/grant execute on function[\s\S]+to anon/i.test(source)) {
  throw new Error('SECURITY DEFINER hardening migration must not grant execute to anon.')
}

console.log('SECURITY DEFINER execute contract verified: current and future PUBLIC/anon execution is closed.')
