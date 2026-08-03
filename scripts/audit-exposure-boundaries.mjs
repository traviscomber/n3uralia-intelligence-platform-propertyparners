import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const roots = ['app', 'components', 'lib']
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const findings = []

const protectedModules = [
  '@/lib/n3uralia-intelligence-engine',
  '@/lib/n3uralia-intelligence-gateway',
  'lib/n3uralia-intelligence-engine',
  'lib/n3uralia-intelligence-gateway',
]
const protectedFiles = [
  'lib/n3uralia-intelligence-engine.ts',
  'lib/n3uralia-intelligence-gateway.ts',
]
const serverOnlyDirective = /^\s*import\s+['"]server-only['"];?/m

const forbiddenResponseTerms = [
  /systemPrompt/i,
  /chainOfThought/i,
  /reasoningTrace/i,
  /internalRules/i,
  /scoringRules/i,
  /promptVersion/i,
]

const internalRuntimeResponseFields = /\b(mode|provenance|remoteError|modelVersion|parity)\s*:/
const protectedApiDatabaseError = /NextResponse\.json\s*\(\s*\{[\s\S]{0,300}?error\s*:\s*[A-Za-z0-9_.]+\.error\.message/
const rawApiExceptionMessage = /NextResponse\.json\s*\(\s*\{[\s\S]{0,400}?error\s*:\s*(?:(?:error|err|cause)\s+instanceof\s+Error\s*\?\s*(?:error|err|cause)\.message|(?:error|err|cause)\.message)/i
const sensitiveConsoleLog = /console\.(log|info|debug)\s*\([\s\S]{0,500}?(token|secret|password|cookie|authorization|prompt|payload|document|canonical)/i
const serializedSensitiveConsoleLog = /console\.(log|info|debug)\s*\([\s\S]{0,500}?JSON\.stringify\s*\([\s\S]{0,300}?(request|body|payload|document|canonical)/i
const dangerousPublicEnv = /NEXT_PUBLIC_[A-Z0-9_]*(SECRET|TOKEN|PASSWORD|PRIVATE|SERVICE_ROLE|PROMPT|SCORING|HEURISTIC)/

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git', 'dist', 'coverage'].includes(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (extensions.has(path.extname(entry.name))) out.push(full)
  }
  return out
}

function importsProtectedModule(text) {
  return protectedModules.some((moduleName) => text.includes(moduleName))
}

const nextConfigPath = ['next.config.mjs', 'next.config.js', 'next.config.ts']
  .map((name) => path.join(root, name))
  .find((candidate) => fs.existsSync(candidate))

if (!nextConfigPath) {
  findings.push('Next.js configuration missing: browser source-map policy cannot be verified')
} else {
  const nextConfig = fs.readFileSync(nextConfigPath, 'utf8')
  if (!/productionBrowserSourceMaps\s*:\s*false/.test(nextConfig)) {
    findings.push(`${path.basename(nextConfigPath)}: productionBrowserSourceMaps must be explicitly false`)
  }
  if (!/poweredByHeader\s*:\s*false/.test(nextConfig)) {
    findings.push(`${path.basename(nextConfigPath)}: poweredByHeader must be explicitly false`)
  }
}

for (const protectedFile of protectedFiles) {
  const absolute = path.join(root, protectedFile)
  if (!fs.existsSync(absolute)) {
    findings.push(`${protectedFile}: protected server module is missing`)
    continue
  }

  const source = fs.readFileSync(absolute, 'utf8')
  if (!serverOnlyDirective.test(source)) {
    findings.push(`${protectedFile}: protected server module must explicitly import server-only`)
  }
}

for (const relRoot of roots) {
  for (const file of walk(path.join(root, relRoot))) {
    const rel = path.relative(root, file).replaceAll('\\', '/')
    const text = fs.readFileSync(file, 'utf8')
    const isClient = /^\s*['"]use client['"];?/m.test(text)
    const isApi = /^app\/api\//.test(rel) && /route\.(ts|js)$/.test(rel)
    const protectedImport = importsProtectedModule(text)

    if (isClient && protectedImport) {
      findings.push(`${rel}: client module imports a protected N3uralia server module`)
    }

    if (isClient && /server-only/.test(text)) {
      findings.push(`${rel}: client module references server-only material`)
    }

    if (dangerousPublicEnv.test(text)) {
      findings.push(`${rel}: potentially privileged material uses a NEXT_PUBLIC_ environment variable`)
    }

    if (isApi) {
      for (const pattern of forbiddenResponseTerms) {
        if (pattern.test(text) && /(NextResponse\.json|Response\(|JSON\.stringify)/.test(text)) {
          findings.push(`${rel}: API may expose internal implementation term ${pattern}`)
        }
      }

      if (protectedImport && internalRuntimeResponseFields.test(text)) {
        findings.push(`${rel}: API may expose internal runtime metadata instead of a minimal DTO`)
      }

      if (protectedImport && protectedApiDatabaseError.test(text)) {
        findings.push(`${rel}: protected API returns a raw database error message`)
      }

      if (rawApiExceptionMessage.test(text)) {
        findings.push(`${rel}: API returns a raw exception message`)
      }
    }

    if (sensitiveConsoleLog.test(text) || serializedSensitiveConsoleLog.test(text)) {
      findings.push(`${rel}: potentially sensitive console logging`)
    }
  }
}

if (findings.length) {
  console.error('N3uralia exposure boundary audit failed:')
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

console.log('N3uralia exposure boundary audit passed.')
