import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const migration = readFileSync('supabase/migrations/20260903_create_current_user_visible_sellers.sql', 'utf8')
const page = readFileSync('app/dashboard/properties/admin/page.tsx', 'utf8')

assert.match(migration, /create or replace function public\.current_user_visible_sellers\(\)/i)
assert.match(migration, /security definer/i)
assert.match(migration, /auth\.uid\(\) is not null/i)
assert.match(migration, /private\.has_management_profile_scope\(p\.id, auth\.uid\(\)\)/i)
assert.match(migration, /lower\(coalesce\(p\.role, ''\)\) = 'seller'/i)
assert.match(migration, /revoke all on function public\.current_user_visible_sellers\(\) from public/i)
assert.match(migration, /revoke all on function public\.current_user_visible_sellers\(\) from anon/i)
assert.match(migration, /grant execute on function public\.current_user_visible_sellers\(\) to authenticated/i)
assert.doesNotMatch(migration, /create policy|alter policy|drop policy/i, 'The fix must not broaden profiles RLS.')

assert.match(page, /supabase\.rpc\('current_user_visible_sellers'\)/)
assert.doesNotMatch(page, /from\('profiles'\).*eq\('role', 'seller'\)/s, 'Assignable sellers must not depend on the self-only profiles SELECT policy.')
assert.match(page, /assertProfileVisible\(scope, assignedTo\)/, 'Writes must retain server-side scope validation.')

console.log('Management visible-sellers RPC verification passed.')
