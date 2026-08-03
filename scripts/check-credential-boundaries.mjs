#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const manifestPath = path.join(root, 'config/credential-rotation-manifest.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

const forbiddenPublicNames = manifest.credentials
  .filter((item) => item.storage.includes('server-side') || item.clientMayReadValue === false)
  .map((item) => `NEXT_PUBLIC_${item.name}`)

// Scan executable application source only. Audit rules and manifests intentionally
// contain credential names and must not be treated as runtime exposure.
const roots = ['app', 'components', 'lib']
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const failures = []

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

function referencesEnvName(source, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:process\\.env\\.|process\\.env\\[['\"]|import\\.meta\\.env\\.)${escaped}(?:['\"]\\])?\\b`).test(source)
}

for (const file of roots.flatMap((directory) => walk(path.join(root, directory)))) {
  const relative = path.relative(root, file).replaceAll(path.sep, '/')
  const source = fs.readFileSync(file, 'utf8')

  for (const name of forbiddenPublicNames) {
    if (referencesEnvName(source, name)) {
      failures.push(`${relative}: references forbidden public credential ${name}`)
    }
  }

  if (/^\s*['\"]use client['\"];?/m.test(source)) {
    for (const credential of manifest.credentials) {
      if (credential.storage.includes('server-side') && referencesEnvName(source, credential.name)) {
        failures.push(`${relative}: client module references server-only credential ${credential.name}`)
      }
    }
  }
}

if (failures.length) {
  console.error('\nCredential boundary validation failed:\n')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Credential boundary validation passed (${manifest.credentials.length} credentials classified).`)
