import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const statusPath = path.join(root, 'config/client-dependencies-status.json')
const requestPath = path.join(root, 'config/client-dependency-requests.json')
const findings = []

for (const file of [statusPath, requestPath]) {
  if (!fs.existsSync(file)) findings.push(`missing file: ${path.relative(root, file)}`)
}

if (findings.length) {
  console.error('Client dependency request verification failed:')
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

const statusManifest = JSON.parse(fs.readFileSync(statusPath, 'utf8'))
const requestManifest = JSON.parse(fs.readFileSync(requestPath, 'utf8'))

if (requestManifest.schemaVersion !== 1) findings.push('request manifest schemaVersion must be 1')
if (!/^\d{4}-\d{2}-\d{2}$/.test(requestManifest.asOf ?? '')) findings.push('request manifest asOf must use YYYY-MM-DD')
if (requestManifest.policy?.repositoryStoresPayloads !== false) findings.push('policy.repositoryStoresPayloads must be false')

const forbiddenKeys = new Set(['data', 'payload', 'content', 'records', 'rows', 'values', 'credentials', 'tokens', 'passwords', 'secrets'])
function inspect(value, location = 'root') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspect(item, `${location}[${index}]`))
    return
  }
  if (!value || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKeys.has(key.toLowerCase())) findings.push(`${location}.${key}: payload-like key is prohibited in request metadata`)
    inspect(child, `${location}.${key}`)
  }
}
inspect(requestManifest)

const requests = new Map()
for (const request of requestManifest.requests ?? []) {
  if (!request.id || requests.has(request.id)) {
    findings.push(`duplicate or missing request id: ${request.id ?? '(missing)'}`)
    continue
  }
  requests.set(request.id, request)
  if (!request.request) findings.push(`${request.id}: request text is required`)
  if (!Array.isArray(request.acceptedFormats) || request.acceptedFormats.length === 0) findings.push(`${request.id}: acceptedFormats must not be empty`)
  if (!Array.isArray(request.minimumFields) || request.minimumFields.length === 0) findings.push(`${request.id}: minimumFields must not be empty`)
  if (!Array.isArray(request.validation) || request.validation.length === 0) findings.push(`${request.id}: validation must not be empty`)
  if (!request.deliveryHandling) findings.push(`${request.id}: deliveryHandling is required`)
}

for (const dependency of statusManifest.dependencies ?? []) {
  if (dependency.status === 'pending' && !requests.has(dependency.id)) {
    findings.push(`${dependency.id}: pending dependency has no client request specification`)
  }
}

for (const id of requests.keys()) {
  if (!(statusManifest.dependencies ?? []).some((dependency) => dependency.id === id)) {
    findings.push(`${id}: request has no matching dependency status entry`)
  }
}

if (findings.length) {
  console.error('Client dependency request verification failed:')
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

console.log(`Client dependency request verification passed: requests=${requests.size}; repositoryStoresPayloads=false`)
