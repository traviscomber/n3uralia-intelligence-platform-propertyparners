import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

test('visual QA waits for hydrated login and preserves diagnostic screenshots', () => {
 const code=readFileSync('scripts/run-authenticated-visual-qa.mjs','utf8')
 assert.match(code,/waitForSelector\(selector, \{ visible: true/)
 assert.match(code,/login-diagnostics\.json/)
 assert.match(code,/login-failure\.png/)
 assert.match(code,/await login\(page, profile\.email, profile\.password, contextDir\)/)
 assert.doesNotMatch(code,/page\.screenshot\(\{[^}]*password/)
})
