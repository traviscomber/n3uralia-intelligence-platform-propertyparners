#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const manifestPath = path.join(root, 'config/credential-rotation-manifest.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

const forbiddenPublicNames = manifest.credentials
  .filter((item) => item.storage.includes('server-side') || item.clientMayReadValue === false)
  .map((item) => `NEXT_PUBLIC_${item.name}`)

const roots = ['app', 'components', 'lib', 'scripts', 'config']
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'])
const failures = []

function walk(directory) {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git'].includes(entry.name)) return []
      return walk(full)
    }
    return extensions.has(path.extname(entry.name)) ? [full] : []
  })
}

for (const file of roots.flatMap((directory) => walk(path.join(root, directory)))) {
  const relative = path.relative(root, file).replaceAll(path.sep, '/')
  const source = fs.readFileSync(file, 'utf8')

  for (const name of forbiddenPublicNames) {
    if (source.includes(name)) failures.push(`${relative}: forbidden public credential name ${name}`)
  }

  if (/['\"]use client['\"]/m.test(source)) {
    for (const credential of manifest.credentials) {
      if (credential.storage.includes('server-side') && source.includes(credential.name)) {
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
