import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const manifest = JSON.parse(
  await readFile(resolve(process.cwd(), 'config/github-delivery-classification.json'), 'utf8'),
)

const classifications = manifest.classifications ?? []
const counts = Object.fromEntries(
  manifest.ownershipClasses.map((ownershipClass) => [
    ownershipClass,
    classifications.filter((entry) => entry.class === ownershipClass).length,
  ]),
)

const unresolved = classifications.filter(
  (entry) => entry.class === 'requires-review' || entry.delivery === 'review-before-transfer',
)
const excluded = classifications.filter(
  (entry) => entry.delivery === 'exclude' || entry.delivery === 'exclude-before-transfer',
)
const conditional = classifications.filter((entry) => entry.delivery.startsWith('include-after-'))

console.log('GitHub delivery readiness')
console.log(`Target: ${manifest.targetDelivery}`)
console.log(`Status: ${manifest.status}`)
console.log(`Classified patterns: ${classifications.length}`)
for (const [ownershipClass, count] of Object.entries(counts)) {
  console.log(`- ${ownershipClass}: ${count}`)
}
console.log(`Excluded patterns: ${excluded.length}`)
console.log(`Conditional inclusion patterns: ${conditional.length}`)
console.log(`Unresolved ownership patterns: ${unresolved.length}`)

for (const entry of unresolved) {
  console.log(`- unresolved: ${entry.pattern} (${entry.delivery})`)
}

if (manifest.status === 'ready' && unresolved.length) {
  console.error('Delivery cannot be ready while unresolved ownership patterns remain.')
  process.exit(1)
}
