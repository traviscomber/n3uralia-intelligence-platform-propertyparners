import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const manifestPath = path.join(root, 'config/github-delivery-classification.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const findings = []

const sourceRoots = ['app', 'components', 'lib']
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const prohibitedOwnedRoots = ['app/', 'components/', 'public/', 'data/', 'docs/canonical/']
const serverOnlyDirective = /^\s*import\s+['"]server-only['"];?/m

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git', 'dist', 'coverage'].includes(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(full))
    else files.push(full)
  }
  return files
}

const proprietaryEntries = (manifest.classifications ?? []).filter(
  (entry) => entry.class === 'n3uralia-proprietary',
)

if (!proprietaryEntries.length) {
  findings.push('No n3uralia-proprietary files are declared in the delivery manifest.')
}

for (const entry of proprietaryEntries) {
  if (entry.delivery !== 'exclude-before-transfer') {
    findings.push(`${entry.pattern}: proprietary source must be exclude-before-transfer`)
  }

  if (entry.pattern.includes('*')) continue

  const absolute = path.join(root, entry.pattern)
  if (!fs.existsSync(absolute)) {
    findings.push(`${entry.pattern}: classified proprietary file does not exist`)
    continue
  }

  if (prohibitedOwnedRoots.some((prefix) => entry.pattern.startsWith(prefix))) {
    findings.push(`${entry.pattern}: proprietary source cannot live inside a client-owned delivery root`)
  }

  if (sourceExtensions.has(path.extname(absolute))) {
    const text = fs.readFileSync(absolute, 'utf8')
    if (!serverOnlyDirective.test(text)) {
      findings.push(`${entry.pattern}: proprietary source must explicitly import server-only`)
    }
  }
}

const proprietaryModules = proprietaryEntries
  .filter((entry) => !entry.pattern.includes('*'))
  .map((entry) => ({
    path: entry.pattern,
    alias: `@/${entry.pattern.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/u, '')}`,
    relative: entry.pattern.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/u, ''),
  }))

const serverConsumers = []

for (const sourceRoot of sourceRoots) {
  for (const file of walk(path.join(root, sourceRoot))) {
    if (!sourceExtensions.has(path.extname(file))) continue

    const rel = path.relative(root, file).replaceAll('\\', '/')
    if (proprietaryModules.some((module) => module.path === rel)) continue

    const text = fs.readFileSync(file, 'utf8')
    const imported = proprietaryModules.filter(
      (module) => text.includes(module.alias) || text.includes(module.relative),
    )

    if (!imported.length) continue

    const isClient = /^\s*['"]use client['"];?/m.test(text)
    if (isClient) {
      findings.push(`${rel}: client module imports proprietary N3uralia source`)
      continue
    }

    serverConsumers.push({
      file: rel,
      imports: imported.map((module) => module.path),
    })
  }
}

if (findings.length) {
  console.error('[github-delivery-surface] audit failed:')
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

console.log(
  `[github-delivery-surface] passed; proprietary=${proprietaryEntries.length}; serverConsumers=${serverConsumers.length}`,
)
for (const consumer of serverConsumers) {
  console.log(`[github-delivery-surface] server consumer: ${consumer.file}`)
}
