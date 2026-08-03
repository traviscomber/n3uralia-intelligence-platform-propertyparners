#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const protectedModules = [
  'lib/n3uralia-intelligence-engine.ts',
  'lib/ai-runtime.ts',
  'lib/intelligence-orchestrator.ts',
  'lib/executive-reasoning.ts',
]
const allowedDirectImporters = new Set([
  'lib/n3uralia-runtime-adapter.ts',
])
const sourceRoots = ['app', 'components', 'lib']
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])

function walk(directory) {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git', 'public'].includes(entry.name)) return []
      return walk(full)
    }
    return extensions.has(path.extname(entry.name)) ? [full] : []
  })
}

const aliases = protectedModules.map((file) => `@/${file.replace(/\.ts$/, '')}`)
const failures = []

for (const file of sourceRoots.flatMap((directory) => walk(path.join(root, directory)))) {
  const relative = path.relative(root, file).replaceAll(path.sep, '/')
  const source = fs.readFileSync(file, 'utf8')

  if (allowedDirectImporters.has(relative)) continue

  for (const alias of aliases) {
    if (source.includes(alias)) {
      failures.push(`${relative}: direct import of proprietary module ${alias}`)
    }
  }
}

if (failures.length) {
  console.error('\nN3uralia runtime migration guard failed:\n')
  failures.forEach((failure) => console.error(`- ${failure}`))
  console.error('\nUse lib/n3uralia-runtime-client.ts and the shared runtime contract instead.\n')
  process.exit(1)
}

console.log('N3uralia runtime migration guard passed.')
