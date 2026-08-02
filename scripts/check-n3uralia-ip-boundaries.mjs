#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const sourceRoots = ['app', 'components', 'lib']
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])

const protectedImportPatterns = [
  '@/lib/n3uralia-intelligence-engine',
  '@/lib/agents/',
  '@/lib/ai-',
  '@/lib/intelligence-',
  '@/lib/executive-reasoning',
  '@/lib/intelligence-orchestrator',
  '@/lib/ai-runtime',
]

const forbiddenPublicEnvNames = [
  'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_RESEND_API_KEY',
  'NEXT_PUBLIC_CRON_SECRET',
  'NEXT_PUBLIC_OPENAI_API_KEY',
  'NEXT_PUBLIC_ANTHROPIC_API_KEY',
  'NEXT_PUBLIC_PRIVATE_KEY',
  'NEXT_PUBLIC_SECRET',
  'NEXT_PUBLIC_ACCESS_TOKEN',
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

function isClientModule(source) {
  return /^\s*['\"]use client['\"];?/m.test(source)
}

function importsProtectedModule(source) {
  return protectedImportPatterns.filter((pattern) => source.includes(pattern))
}

const files = sourceRoots.flatMap((directory) => walk(path.join(root, directory)))
const failures = []

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  const relative = path.relative(root, file).replaceAll(path.sep, '/')

  if (isClientModule(source)) {
    const matches = importsProtectedModule(source)
    if (matches.length) {
      failures.push(`${relative}: client module imports protected server intelligence: ${matches.join(', ')}`)
    }
  }

  for (const envName of forbiddenPublicEnvNames) {
    if (source.includes(envName)) {
      failures.push(`${relative}: contains forbidden public privileged variable ${envName}`)
    }
  }

  if (relative.startsWith('app/api/') && /\b(systemPrompt|chainOfThought|reasoningTrace|internalRules)\b/.test(source)) {
    failures.push(`${relative}: API route may expose prompts, reasoning traces or internal rules; review and return only a minimal DTO`)
  }
}

if (failures.length) {
  console.error('\nN3uralia IP boundary check failed:\n')
  for (const failure of failures) console.error(`- ${failure}`)
  console.error('\nProtected intelligence must remain server-side and APIs must expose only approved outputs.\n')
  process.exit(1)
}

console.log(`N3uralia IP boundary check passed (${files.length} source files inspected).`)
