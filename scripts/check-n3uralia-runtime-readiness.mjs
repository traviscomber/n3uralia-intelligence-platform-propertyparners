const mode = (process.env.N3URALIA_RUNTIME_MODE || 'local').trim()
const runtimeUrl = process.env.N3URALIA_RUNTIME_URL?.trim() || ''
const serviceToken = process.env.N3URALIA_RUNTIME_SERVICE_TOKEN?.trim() || ''
const allowedModes = new Set(['local', 'shadow', 'remote'])
const localHosts = new Set(['localhost', '127.0.0.1', '::1'])
const errors = []

if (!allowedModes.has(mode)) {
  errors.push(`N3URALIA_RUNTIME_MODE must be local, shadow or remote; received ${JSON.stringify(mode)}.`)
}

if (mode !== 'local') {
  if (!runtimeUrl) errors.push('N3URALIA_RUNTIME_URL is required in shadow and remote modes.')
  if (!serviceToken) errors.push('N3URALIA_RUNTIME_SERVICE_TOKEN is required in shadow and remote modes.')
  if (serviceToken && serviceToken.length < 32) {
    errors.push('N3URALIA_RUNTIME_SERVICE_TOKEN must contain at least 32 characters.')
  }

  if (runtimeUrl) {
    try {
      const parsed = new URL(runtimeUrl)
      const isLocal = localHosts.has(parsed.hostname)

      if (parsed.protocol !== 'https:' && !(isLocal && parsed.protocol === 'http:')) {
        errors.push('N3URALIA_RUNTIME_URL must use HTTPS outside local development.')
      }

      if (parsed.username || parsed.password || parsed.search || parsed.hash) {
        errors.push('N3URALIA_RUNTIME_URL must not include credentials, query parameters or fragments.')
      }
    } catch {
      errors.push('N3URALIA_RUNTIME_URL must be a valid absolute URL.')
    }
  }
}

if (mode === 'remote' && process.env.N3URALIA_RUNTIME_REMOTE_APPROVED !== 'true') {
  errors.push('Remote mode requires N3URALIA_RUNTIME_REMOTE_APPROVED=true after documented parity and rollback approval.')
}

if (errors.length) {
  console.error('N3uralia runtime readiness validation failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`N3uralia runtime readiness validated for mode: ${mode}.`)
