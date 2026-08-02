#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const sourceRoots = ['app', 'components', 'lib']
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const enginePath = 'lib/n3uralia-intelligence-engine.ts'
const engineImportPatterns = [
  '@/lib/n3uralia-intelligence-engine',
  './n3uralia-intelligence-engine',
  '../lib/n3uralia-intelligence-engine',
]
const exportedSymbols = [
  'buildN3uraliaIntelligenceContext',
  'getN3uraliaDomainContext',
  'buildExecutiveDecisionFeed',
]

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

const consumers = []
for (const file of sourceRoots.flatMap((directory) => walk(path.join(root, directory)))) {
  const relative = path.relative(root, file).replaceAll(path.sep, '/')
  if (relative === enginePath) continue

  const source = fs.readFileSync(file, 'utf8')
  const matchedImports = engineImportPatterns.filter((pattern) => source.includes(pattern))
  const matchedSymbols = exportedSymbols.filter((symbol) => new RegExp(`\\b${symbol}\\b`).test(source))
  if (!matchedImports.length && !matchedSymbols.length) continue

  consumers.push({
    path: relative,
    clientModule: /^\s*['\"]use client['\"];?/m.test(source),
    apiRoute: relative.startsWith('app/api/'),
    imports: matchedImports,
    symbols: matchedSymbols,
    migrationTarget: relative.startsWith('app/api/')
      ? 'replace-local-engine-call-with-server-runtime-client'
      : 'introduce-server-adapter-or-route-before-removing-local-engine',
  })
}

const result = {
  generatedAt: new Date().toISOString(),
  proprietaryModule: enginePath,
  consumerCount: consumers.length,
  clientConsumerCount: consumers.filter((item) => item.clientModule).length,
  apiConsumerCount: consumers.filter((item) => item.apiRoute).length,
  consumers,
}

console.log(JSON.stringify(result, null, 2))

if (result.clientConsumerCount > 0) {
  console.error('\nDirect client consumption of the proprietary engine is forbidden.\n')
  process.exitCode = 1
}
