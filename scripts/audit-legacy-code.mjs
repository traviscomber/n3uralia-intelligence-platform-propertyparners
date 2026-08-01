import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const strict = process.argv.includes('--strict')
const ignoredDirectories = new Set([
  '.git',
  '.next',
  '.turbo',
  'node_modules',
  'coverage',
  'dist',
  'build',
  'out',
])
const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']
const scannedExtensions = new Set([
  ...sourceExtensions,
  '.json',
  '.md',
  '.sql',
  '.css',
  '.scss',
  '.yml',
  '.yaml',
])

function toPosix(value) {
  return value.split(path.sep).join('/')
}

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      walk(absolutePath, files)
      continue
    }
    if (scannedExtensions.has(path.extname(entry.name))) files.push(absolutePath)
  }
  return files
}

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8')
  } catch {
    return ''
  }
}

function resolveLocalImport(importer, specifier, sourceFiles) {
  let basePath
  if (specifier.startsWith('@/')) {
    basePath = path.join(root, specifier.slice(2))
  } else if (specifier.startsWith('.')) {
    basePath = path.resolve(path.dirname(importer), specifier)
  } else {
    return null
  }

  const candidates = [basePath]
  for (const extension of sourceExtensions) candidates.push(`${basePath}${extension}`)
  for (const extension of sourceExtensions) candidates.push(path.join(basePath, `index${extension}`))

  for (const candidate of candidates) {
    const normalized = path.normalize(candidate)
    if (sourceFiles.has(normalized)) return normalized
  }
  return null
}

function extractSpecifiers(text) {
  const specifiers = new Set()
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(text))) specifiers.add(match[1])
  }
  return [...specifiers]
}

function isFrameworkEntrypoint(relativePath) {
  return (
    /^app\/.+\/(page|layout|route|loading|error|not-found|template|default)\.(ts|tsx|js|jsx)$/.test(relativePath) ||
    /^app\/(page|layout|route|loading|error|not-found|template|default)\.(ts|tsx|js|jsx)$/.test(relativePath) ||
    /^(middleware|instrumentation)\.(ts|js)$/.test(relativePath) ||
    /^(next|postcss|tailwind|eslint)\.config\.(ts|js|mjs|cjs)$/.test(relativePath)
  )
}

function isOrphanCandidate(relativePath) {
  if (!/^(components|lib|hooks|utils|services|modules)\//.test(relativePath)) return false
  if (/\.(test|spec|stories)\.(ts|tsx|js|jsx)$/.test(relativePath)) return false
  if (/\/index\.(ts|tsx|js|jsx)$/.test(relativePath)) return false
  if (relativePath.endsWith('.d.ts')) return false
  return true
}

function packageRoot(specifier) {
  if (specifier.startsWith('@')) return specifier.split('/').slice(0, 2).join('/')
  return specifier.split('/')[0]
}

const allFiles = walk(root)
const sourceFiles = new Set(allFiles.filter((file) => sourceExtensions.includes(path.extname(file))))
const relativeFiles = allFiles.map((file) => toPosix(path.relative(root, file)))

const suspiciousNamePattern = /(^|[\/_.-])(legacy|deprecated|obsolete|backup|bak|old|copy|temp|tmp|draft|unused|sample|demo|mock|placeholder)([\/_.-]|$)/i
const highConfidenceArtifactPattern = /(^|\/)(?:[^/]+\.)?(bak|old|orig|rej)$|(^|\/)(backup|obsolete)([\/_.-]|$)/i
const contentSignals = [
  { label: 'deprecated', pattern: /\bdeprecated\b/i },
  { label: 'legacy', pattern: /\blegacy\b/i },
  { label: 'temporary', pattern: /\btemporary\b|\btemp(?:orary)? solution\b/i },
  { label: 'mock-data', pattern: /\bmock data\b|\bfake data\b|\bsample data\b/i },
  { label: 'placeholder', pattern: /\bplaceholder\b/i },
  { label: 'remove-marker', pattern: /TODO\s*:?\s*remove|FIXME\s*:?\s*remove/i },
]

const suspiciousNames = relativeFiles.filter((file) => suspiciousNamePattern.test(file))
const highConfidenceArtifacts = relativeFiles.filter((file) => highConfidenceArtifactPattern.test(file))
const contentFindings = []

for (const file of allFiles) {
  const relativePath = toPosix(path.relative(root, file))
  const text = readText(file)
  const lines = text.split(/\r?\n/)
  for (let index = 0; index < lines.length; index += 1) {
    for (const signal of contentSignals) {
      if (!signal.pattern.test(lines[index])) continue
      contentFindings.push({
        file: relativePath,
        line: index + 1,
        signal: signal.label,
        excerpt: lines[index].trim().slice(0, 180),
      })
    }
  }
}

const inboundReferences = new Map([...sourceFiles].map((file) => [file, 0]))
const externalImports = new Set()
for (const file of sourceFiles) {
  const specifiers = extractSpecifiers(readText(file))
  for (const specifier of specifiers) {
    const localTarget = resolveLocalImport(file, specifier, sourceFiles)
    if (localTarget) {
      inboundReferences.set(localTarget, (inboundReferences.get(localTarget) ?? 0) + 1)
    } else if (!specifier.startsWith('.') && !specifier.startsWith('@/')) {
      externalImports.add(packageRoot(specifier))
    }
  }
}

const orphanCandidates = [...sourceFiles]
  .map((file) => ({
    file,
    relativePath: toPosix(path.relative(root, file)),
    inbound: inboundReferences.get(file) ?? 0,
  }))
  .filter(({ relativePath, inbound }) => inbound === 0 && isOrphanCandidate(relativePath) && !isFrameworkEntrypoint(relativePath))
  .map(({ relativePath }) => relativePath)
  .sort()

const packageJson = JSON.parse(readText(path.join(root, 'package.json')))
const dependencies = Object.keys(packageJson.dependencies ?? {})
const devDependencies = Object.keys(packageJson.devDependencies ?? {})
const implicitTooling = new Set([
  '@eslint/eslintrc',
  '@tailwindcss/postcss',
  '@types/node',
  '@types/react',
  '@types/react-dom',
  '@typescript-eslint/eslint-plugin',
  '@typescript-eslint/parser',
  'eslint',
  'eslint-config-next',
  'eslint-plugin-react',
  'eslint-plugin-react-hooks',
  'postcss',
  'tailwindcss',
  'tsx',
  'typescript',
])
const unusedDependencyCandidates = [...dependencies, ...devDependencies]
  .filter((dependency) => !externalImports.has(dependency) && !implicitTooling.has(dependency))
  .sort()

const report = {
  generatedAt: new Date().toISOString(),
  scannedFiles: allFiles.length,
  sourceFiles: sourceFiles.size,
  highConfidenceArtifacts,
  suspiciousNames,
  orphanCandidates,
  unusedDependencyCandidates,
  contentFindings: contentFindings.slice(0, 500),
  contentFindingsTruncated: contentFindings.length > 500,
}

fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true })
fs.writeFileSync(path.join(root, 'artifacts', 'legacy-code-audit.json'), `${JSON.stringify(report, null, 2)}\n`)

console.log(`Legacy audit scanned ${report.scannedFiles} files (${report.sourceFiles} source files).`)
console.log(`High-confidence obsolete artifacts: ${highConfidenceArtifacts.length}`)
console.log(`Suspicious filenames: ${suspiciousNames.length}`)
console.log(`Potential orphan source files: ${orphanCandidates.length}`)
console.log(`Potential unused dependencies: ${unusedDependencyCandidates.length}`)
console.log(`Content signals: ${contentFindings.length}`)

if (highConfidenceArtifacts.length) {
  console.log('\nHigh-confidence obsolete artifacts:')
  for (const file of highConfidenceArtifacts) console.log(`- ${file}`)
}
if (suspiciousNames.length) {
  console.log('\nSuspicious filenames:')
  for (const file of suspiciousNames.slice(0, 100)) console.log(`- ${file}`)
}
if (orphanCandidates.length) {
  console.log('\nPotential orphan source files (manual confirmation required):')
  for (const file of orphanCandidates.slice(0, 150)) console.log(`- ${file}`)
}
if (unusedDependencyCandidates.length) {
  console.log('\nPotential unused dependencies (manual confirmation required):')
  for (const dependency of unusedDependencyCandidates) console.log(`- ${dependency}`)
}
if (contentFindings.length) {
  console.log('\nContent signals (first 100):')
  for (const finding of contentFindings.slice(0, 100)) {
    console.log(`- ${finding.file}:${finding.line} [${finding.signal}] ${finding.excerpt}`)
  }
}

if (strict && highConfidenceArtifacts.length) {
  console.error('\nStrict legacy audit failed because obsolete artifact files were found.')
  process.exitCode = 1
}
