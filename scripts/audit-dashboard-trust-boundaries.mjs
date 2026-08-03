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

const unsafePatterns = [
  {
    regex: /\{\s*[A-Za-z0-9_.]*(?:error|Error)\s*\}/g,
    description: 'raw error interpolation in dashboard UI',
  },
  {
    regex: /(?:message|detail|hint)\s*:\s*[A-Za-z0-9_.]*(?:error|Error)/g,
    description: 'raw technical error assigned to a visible message',
  },
]

for (const file of walk(dashboardRoot)) {
  const source = fs.readFileSync(file, 'utf8')
  for (const pattern of unsafePatterns) {
    if (pattern.regex.test(source)) {
      failures.push(`${path.relative(root, file)}: ${pattern.description}`)
    }
    pattern.regex.lastIndex = 0
  }
}

if (failures.length > 0) {
  console.error('Dashboard trust-boundary audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Dashboard trust-boundary audit passed for ${walk(dashboardRoot).length} source files.`)
