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

const directUnsafePatterns = [
  {
    regex: /\{\s*[A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)*\.(?:error|message|detail|hint)\s*\}/g,
    description: 'raw technical field interpolated in dashboard UI',
  },
  {
    regex: /\{\s*[A-Za-z_$][\w$]*(?:Error|Failure)\.(?:message|detail|hint)\s*\}/g,
    description: 'raw Error object field interpolated in dashboard UI',
  },
  {
    regex: /(?:message|detail|hint)\s*:\s*[A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)*\.(?:error|message|detail|hint)/g,
    description: 'raw technical field assigned to a visible message',
  },
]

const rawAssignmentPattern = /(?:const|let|var)\s+([A-Za-z_$][\w$]*(?:Error|Failure))\s*=\s*[^;\n]*(?:\.error|\.message|\.detail|\.hint)[^;\n]*/g

for (const file of walk(dashboardRoot)) {
  const source = fs.readFileSync(file, 'utf8')

  for (const pattern of directUnsafePatterns) {
    for (const match of source.matchAll(pattern.regex)) {
      recordMatch(file, source, match, pattern.description)
    }
  }

  for (const assignment of source.matchAll(rawAssignmentPattern)) {
    const variable = assignment[1]
    const visibleInterpolation = new RegExp(`\\{\\s*${variable}\\s*\\}`, 'g')
    for (const interpolation of source.matchAll(visibleInterpolation)) {
      recordMatch(file, source, interpolation, `raw technical assignment ${variable} interpolated in dashboard UI`)
    }
  }
}

if (failures.length > 0) {
  console.error('Dashboard trust-boundary audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Dashboard trust-boundary audit passed for ${walk(dashboardRoot).length} source files.`)
