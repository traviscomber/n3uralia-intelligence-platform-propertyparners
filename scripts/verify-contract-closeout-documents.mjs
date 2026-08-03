import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const registryPath = path.join(root, 'config/contract-closeout-documents.json')
const findings = []

if (!fs.existsSync(registryPath)) {
  console.error('Closeout document verification failed: registry is missing.')
  process.exit(1)
}

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'))
if (registry.schemaVersion !== 1) findings.push('schemaVersion must be 1')
if (registry.classification !== 'client-owned-canonical') {
  findings.push('classification must be client-owned-canonical')
}

const documents = registry.documents ?? []
if (!Array.isArray(documents) || documents.length === 0) findings.push('documents must not be empty')

const seen = new Set()
for (const documentPath of documents) {
  if (seen.has(documentPath)) findings.push(`${documentPath}: duplicate registry entry`)
  seen.add(documentPath)
  if (!documentPath.startsWith('docs/canonical/')) findings.push(`${documentPath}: must remain under docs/canonical`)
  if (!documentPath.endsWith('.md')) findings.push(`${documentPath}: must be Markdown`)
  if (!fs.existsSync(path.join(root, documentPath))) findings.push(`${documentPath}: file is missing`)
}

if (findings.length) {
  console.error('Closeout document verification failed:')
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

console.log(`Closeout document verification passed: documents=${documents.length}; classification=${registry.classification}`)
