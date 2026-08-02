import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const manifestPath = resolve(process.cwd(), 'config/github-delivery-classification.json')

function fail(message) {
  console.error(`[github-delivery] ${message}`)
  process.exit(1)
}

let manifest
try {
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
} catch {
  fail('Classification manifest is missing or invalid JSON.')
}

if (manifest.schemaVersion !== 1) fail('Unsupported schemaVersion.')
if (manifest.targetDelivery !== '2026-09-30') fail('Target delivery date must remain 2026-09-30.')
if (manifest.rules?.clientMaterialRemainsClientOwned !== true) {
  fail('Client canonical ownership protection must remain enabled.')
}
if (manifest.rules?.deliverableMustExcludeSecrets !== true) {
  fail('Secret exclusion rule must remain enabled.')
}
if (manifest.rules?.deliverableMustExcludeConfirmedN3uraliaProprietarySource !== true) {
  fail('N3uralia proprietary source exclusion rule must remain enabled.')
}

const allowedClasses = new Set([
  'client-owned-canonical',
  'client-core',
  'shared-contract',
  'n3uralia-proprietary',
  'secret-or-credential',
  'requires-review',
])

for (const entry of manifest.classifications ?? []) {
  if (!entry.pattern || !allowedClasses.has(entry.class) || !entry.delivery) {
    fail('Every classification requires pattern, valid class and delivery decision.')
  }
}

const engine = manifest.classifications.find(
  (entry) => entry.pattern === 'lib/n3uralia-intelligence-engine.ts',
)
if (
  engine?.class !== 'n3uralia-proprietary' ||
  engine?.delivery !== 'exclude-before-transfer'
) {
  fail('The N3uralia intelligence engine must remain excluded before transfer.')
}

const canonical = manifest.classifications.find(
  (entry) => entry.pattern === 'docs/canonical/**',
)
if (
  canonical?.class !== 'client-owned-canonical' ||
  canonical?.delivery !== 'include'
) {
  fail('Canonical client material must remain classified as client-owned and included.')
}

const secretEntries = (manifest.classifications ?? []).filter(
  (entry) => entry.class === 'secret-or-credential',
)
if (!secretEntries.length || secretEntries.some((entry) => entry.delivery !== 'exclude')) {
  fail('Secret and credential patterns must be excluded from delivery.')
}

if (manifest.status === 'ready') {
  for (const key of ['technical', 'security', 'contractual', 'approvedCommit', 'approvedAt']) {
    if (typeof manifest.approval?.[key] !== 'string' || manifest.approval[key].trim().length < 8) {
      fail(`Ready status requires approval.${key}.`)
    }
  }
}

console.log(
  `[github-delivery] classification manifest valid; status=${manifest.status}; target=${manifest.targetDelivery}`,
)
