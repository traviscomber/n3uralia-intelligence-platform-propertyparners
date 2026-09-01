import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const AUDIENCE = 'qalito-release-qa'
const DEFAULT_PROVISIONER_URL = 'https://orfncinmhymhhoxbxgjb.supabase.co/functions/v1/qalito-release-qa'
const action = process.argv[2] || 'provision'
const outputRoot = path.resolve(process.env.QA_OUTPUT_DIR || 'artifacts/release-qa')

const envMap = {
  ceo: ['QA_CEO_EMAIL', 'QA_CEO_PASSWORD'],
  director: ['QA_DIRECTOR_EMAIL', 'QA_DIRECTOR_PASSWORD'],
  subdirector: ['QA_SUBDIRECTOR_EMAIL', 'QA_SUBDIRECTOR_PASSWORD'],
  'lo-beltran': ['QA_LO_BELTRAN_EMAIL', 'QA_LO_BELTRAN_PASSWORD'],
  'nueva-costanera': ['QA_NUEVA_COSTANERA_EMAIL', 'QA_NUEVA_COSTANERA_PASSWORD'],
  'santa-maria': ['QA_SANTA_MARIA_EMAIL', 'QA_SANTA_MARIA_PASSWORD'],
}

async function writeEvidence(name, data) {
  await fs.mkdir(outputRoot, { recursive: true })
  await fs.writeFile(path.join(outputRoot, name), `${JSON.stringify(data, null, 2)}\n`)
}

async function getOidcToken() {
  const requestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL
  const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN
  if (!requestUrl || !requestToken) throw new Error('GitHub OIDC environment is unavailable. Ensure permissions.id-token=write.')

  const separator = requestUrl.includes('?') ? '&' : '?'
  const response = await fetch(`${requestUrl}${separator}audience=${encodeURIComponent(AUDIENCE)}`, {
    headers: { Authorization: `Bearer ${requestToken}` },
  })
  if (!response.ok) throw new Error(`GitHub OIDC token request failed with HTTP ${response.status}.`)
  const payload = await response.json()
  if (!payload?.value) throw new Error('GitHub OIDC token response did not contain a token.')
  return payload.value
}

async function callProvisioner(requestedAction) {
  const runId = process.env.GITHUB_RUN_ID
  const sha = process.env.GITHUB_SHA
  if (!runId || !sha) throw new Error('GITHUB_RUN_ID and GITHUB_SHA are required.')
  const oidcToken = await getOidcToken()
  const provisionerUrl = process.env.QA_PROVISIONER_URL || DEFAULT_PROVISIONER_URL
  const response = await fetch(provisionerUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${oidcToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: requestedAction, runId, sha }),
  })
  if (!response.ok) throw new Error(`QA provisioner returned HTTP ${response.status}.`)
  return response.json()
}

async function exportProvisionedEnvironment(payload) {
  if (!process.env.GITHUB_ENV) throw new Error('GITHUB_ENV is unavailable.')
  if (!payload?.supabaseUrl || !payload?.anonKey || !Array.isArray(payload?.profiles)) {
    throw new Error('QA provisioner returned an incomplete response.')
  }

  const byKey = new Map(payload.profiles.map((profile) => [profile.key, profile]))
  const lines = [
    `NEXT_PUBLIC_SUPABASE_URL=${payload.supabaseUrl}`,
    `SUPABASE_ANON_KEY=${payload.anonKey}`,
  ]

  for (const [key, [emailVar, passwordVar]] of Object.entries(envMap)) {
    const profile = byKey.get(key)
    if (!profile?.email || !profile?.password) throw new Error(`QA provisioner omitted profile ${key}.`)
    process.stdout.write(`::add-mask::${profile.email}\n`)
    process.stdout.write(`::add-mask::${profile.password}\n`)
    lines.push(`${emailVar}=${profile.email}`, `${passwordVar}=${profile.password}`)
  }

  await fs.appendFile(process.env.GITHUB_ENV, `${lines.join('\n')}\n`)
}

await fs.mkdir(outputRoot, { recursive: true })

try {
  if (!['provision', 'cleanup'].includes(action)) throw new Error(`Unsupported action: ${action}`)
  const payload = await callProvisioner(action)

  if (action === 'provision') {
    await exportProvisionedEnvironment(payload)
    await writeEvidence('provisioning.json', {
      generatedAt: new Date().toISOString(),
      commitSha: process.env.GITHUB_SHA,
      runId: process.env.GITHUB_RUN_ID,
      source: 'GitHub Actions OIDC -> Supabase Auth Admin',
      identities: Object.keys(envMap),
      persistentCredentials: false,
      status: 'provisioned',
    })
    console.log(`Provisioned ${payload.profiles.length} ephemeral QA identities for this workflow run.`)
  } else {
    await writeEvidence('cleanup.json', {
      generatedAt: new Date().toISOString(),
      commitSha: process.env.GITHUB_SHA,
      runId: process.env.GITHUB_RUN_ID,
      deletedUsers: payload.deletedUsers ?? null,
      status: 'cleaned',
    })
    console.log(`Ephemeral QA cleanup completed; deleted users: ${payload.deletedUsers ?? 'unknown'}.`)
  }
} catch (error) {
  await writeEvidence(`${action}-failure.json`, {
    generatedAt: new Date().toISOString(),
    commitSha: process.env.GITHUB_SHA || null,
    runId: process.env.GITHUB_RUN_ID || null,
    action,
    status: 'failed',
    error: error instanceof Error ? error.message : String(error),
  }).catch(() => null)
  throw error
}
