import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const dashboardRoot = path.join(root, 'app', 'dashboard')
const requiredRoutes = [
  'app/dashboard/page.tsx',
  'app/dashboard/market/page.tsx',
  'app/dashboard/valuation/page.tsx',
  'app/dashboard/control/page.tsx',
]

const failures = []

for (const route of requiredRoutes) {
  if (!fs.existsSync(path.join(root, route))) {
    failures.push(`Missing required dashboard route: ${route}`)
  }
}

function walk(directory) {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return walk(fullPath)
    return /\.(tsx|ts|jsx|js)$/.test(entry.name) ? [fullPath] : []
  })
}

function lineNumber(source, index) {
  return source.slice(0, index).split('\n').length
}

function recordMatch(file, source, match, description) {
  failures.push(`${path.relative(root, file)}:${lineNumber(source, match.index)}: ${description}`)
}

const unsafePatterns = [
  {
    regex: /\{\s*(?:error|err|cause|failure|payload|response|operationalError|assignmentError|personalError)(?:\??\.[A-Za-z_$][\w$]*)*\.(?:error|message|detail|hint)\s*\}/gi,
    description: 'raw technical error source interpolated in dashboard UI',
  },
  {
    regex: /\{\s*(?:error|err|cause|failure)\.(?:message|detail|hint)\s*\}/gi,
    description: 'raw Error object field interpolated in dashboard UI',
  },
]

const dashboardFiles = walk(dashboardRoot)

for (const file of dashboardFiles) {
  const source = fs.readFileSync(file, 'utf8')
  for (const pattern of unsafePatterns) {
    for (const match of source.matchAll(pattern.regex)) {
      recordMatch(file, source, match, pattern.description)
    }
  }
}

if (failures.length > 0) {
  console.error('Dashboard trust-boundary audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Dashboard trust-boundary audit passed for ${dashboardFiles.length} source files.`)
