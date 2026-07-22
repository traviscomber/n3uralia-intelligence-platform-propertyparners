import assert from 'node:assert/strict'
import fs from 'node:fs'
import presentations from '../data/presentations-2026.json'

const migration = fs.readFileSync('supabase/migrations/20260722_create_report_directory.sql', 'utf8')
const requiredTables = ['report_people', 'report_branch_assignments', 'report_subscriptions', 'report_directory_audit_log']

for (const table of requiredTables) assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`))
assert.equal(/INSERT\s+INTO\s+(?:report_people|report_branch_assignments|report_subscriptions)/i.test(migration), false, 'The migration must not seed people or relationships automatically.')
assert.equal(presentations.management.branches.length, 3)
assert.equal(presentations.management.partners.length, 24)
assert.equal(new Set(presentations.management.partners.map((item) => `${item.branch}:${item.name}`)).size, 24)

console.log('Report directory verified: 4 isolated tables, 3 source branches, 24 unique partner candidates and no automatic seed writes.')
