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

test('production QA uses direct Vercel alias without weakening Cloudflare', () => {
 const workflow=readFileSync('.github/workflows/authenticated-visual-qa.yml','utf8')
 const script=readFileSync('scripts/run-authenticated-visual-qa.mjs','utf8')
 assert.match(workflow,/QA_BASE_URL:.*n3uralia-intelligence-platform\.vercel\.app/)
 assert.match(workflow,/QA_RELEASE_BASE_URL: https:\/\/n3uralia-intelligence-platform\.vercel\.app/)
 assert.match(script,/Cloudflare bot challenge/)
 assert.match(script,/auditPrimaryNavigation/)
 assert.doesNotMatch(workflow,/disable.*[Cc]loudflare/)
})
test('authenticated QA checks three actual role-specific primary navigation links', () => {
 const code=readFileSync('scripts/run-authenticated-visual-qa.mjs','utf8')
 assert.match(code,/const expectedPrimaryLabels = \['Mercado', 'Valorizador', 'Reportes'\]/)
 assert.match(code,/director: '\/dashboard\/director\/reporte'/)
 assert.match(code,/ceo: '\/dashboard\/reportes\/canonicos'/)
 assert.match(code,/querySelector\(':scope > div ul'\)/)
 assert.match(code,/secondaryClosed/)
 assert.match(code,/three-pillar-navigation/)
 assert.match(code,/if \(navigationAudit\.status === 'failed'\) throw/)
})

test('visual QA waits for real login completion instead of unrelated global alerts', () => {
 const code=readFileSync('scripts/run-authenticated-visual-qa.mjs','utf8')
 assert.match(code,/main section \[role="alert"\]/)
 assert.doesNotMatch(code,/Promise\.race\(\[\s*page\.waitForFunction/)
 assert.match(code,/timeout: 45000/)
 assert.match(code,/sign-in-diagnostics\.json/)
 assert.match(code,/authResponses/)
})
test('visual QA synchronizes React-controlled inputs before login submit', () => {
 const code=readFileSync('scripts/run-authenticated-visual-qa.mjs','utf8')
 assert.match(code,/page\.type\(selector, email, \{ delay: 20 \}\)/)
 assert.match(code,/password, \{ delay: 20 \}\)/)
 assert.match(code,/emailField\?\.value === expectedEmail/)
 assert.match(code,/await waitForAuthenticatedState\(page, contextDir, authResponses\)/)
 assert.doesNotMatch(code,/passwordField\?\.value === password/)
})
