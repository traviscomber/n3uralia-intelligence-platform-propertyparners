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
const requiredSafetyFiles = [
  'components/feedback/public-error-notice.tsx',
  'components/ui/operational-state.tsx',
  'lib/public-error.ts',
]
const requiredDesignFiles = [
  'DESIGN.md',
  'docs/design/COMPONENTS.md',
  'docs/design/DATA-FORMATTING.md',
  'components/intelligence/design-system.tsx',
]

const failures = []

for (const route of [...requiredRoutes, ...requiredSafetyFiles, ...requiredDesignFiles]) {
  if (!fs.existsSync(path.join(root, route))) {
    failures.push(`Missing required dashboard governance file: ${route}`)
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
  {
    regex: /<OperationalState\b[^>]*\bdetail\s*=/gs,
    description: 'OperationalState detail prop is forbidden in dashboard UI',
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

const operationalStatePath = path.join(root, 'components/ui/operational-state.tsx')
if (fs.existsSync(operationalStatePath)) {
  const source = fs.readFileSync(operationalStatePath, 'utf8')
  const forbiddenComponentPatterns = [
    {
      regex: /\bdetail\??\s*:\s*string/gi,
      description: 'shared operational state reintroduces a technical detail prop',
    },
    {
      regex: /Detalle técnico:|Technical detail:/gi,
      description: 'shared operational state renders technical details',
    },
  ]

  for (const pattern of forbiddenComponentPatterns) {
    for (const match of source.matchAll(pattern.regex)) {
      recordMatch(operationalStatePath, source, match, pattern.description)
    }
  }
}

const layoutPath = path.join(root, 'app/layout.tsx')
if (fs.existsSync(layoutPath)) {
  const source = fs.readFileSync(layoutPath, 'utf8')
  if (!/weight:\s*\[[^\]]*['"]600['"][^\]]*\]/s.test(source)) {
    failures.push('app/layout.tsx: Montserrat 600 must be loaded because canonical components use font-semibold')
  }
}

const designSystemPath = path.join(root, 'components/intelligence/design-system.tsx')
if (fs.existsSync(designSystemPath)) {
  const source = fs.readFileSync(designSystemPath, 'utf8')
  const requiredExports = [
    'ActionLink',
    'ActionButton',
    'FormField',
    'StatusBadge',
    'FilterBar',
    'DataTable',
    'DataTableHead',
    'DataTableBody',
    'DataTableHeaderCell',
    'DataTableCell',
  ]

  for (const exportName of requiredExports) {
    if (!new RegExp(`export function ${exportName}\\b`).test(source)) {
      failures.push(`components/intelligence/design-system.tsx: missing canonical ${exportName} primitive`)
    }
  }

  const forbiddenDesignPatterns = [
    {
      regex: /\brounded(?:-[A-Za-z0-9\[\]-]+)?\b/g,
      description: 'canonical intelligence primitives must preserve square geometry',
    },
    {
      regex: /\bshadow(?:-[A-Za-z0-9\[\]-]+)?\b/g,
      description: 'canonical intelligence primitives must not use routine drop shadows',
    },
    {
      regex: /\bbg-white\b/g,
      description: 'canonical intelligence primitives must use semantic product surfaces',
    },
  ]

  for (const pattern of forbiddenDesignPatterns) {
    for (const match of source.matchAll(pattern.regex)) {
      recordMatch(designSystemPath, source, match, pattern.description)
    }
  }
}

if (failures.length > 0) {
  console.error('Dashboard trust-boundary and design-system audit failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Dashboard trust-boundary and design-system audit passed for ${dashboardFiles.length} source files.`)
