import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { evaluatePortalSnapshotPolicy } from '@/lib/portal-snapshot-policy'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

type PortalGithubPayload = {
  observedAt?: string
  rows?: Array<Record<string, unknown>>
  discovery?: {
    pagesVisited?: number
    rawListingCandidates?: number
    duplicateListingCandidates?: number
    uniqueListings?: number
    reportedResultCount?: number | null
    exhausted?: boolean
    capped?: boolean
  }
  failedListingDetails?: number
}

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) throw new Error('MISSING_SUPABASE_CREDENTIALS')
  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  return Uint8Array.from(Buffer.from(padded, 'base64'))
}

function decodeJwtPart(value: string) {
  return JSON.parse(Buffer.from(base64UrlToBytes(value)).toString('utf8')) as Record<string, unknown>
}

async function verifyGithubOidc(token: string) {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('INVALID_GITHUB_OIDC')
  const header = decodeJwtPart(parts[0])
  const payload = decodeJwtPart(parts[1])
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new Error('INVALID_GITHUB_OIDC_HEADER')
  if (payload.iss !== 'https://token.actions.githubusercontent.com') throw new Error('INVALID_GITHUB_OIDC_ISSUER')
  if (payload.aud !== 'ppartnersgroup.app') throw new Error('INVALID_GITHUB_OIDC_AUDIENCE')
  if (payload.repository !== 'traviscomber/n3uralia-intelligence-platform-propertyparners') throw new Error('INVALID_GITHUB_OIDC_REPOSITORY')
  if (payload.ref !== 'refs/heads/main') throw new Error('INVALID_GITHUB_OIDC_REF')

  const now = Math.floor(Date.now() / 1000)
  const exp = Number(payload.exp ?? 0)
  const nbf = Number(payload.nbf ?? 0)
  if (!exp || exp < now - 30 || (nbf && nbf > now + 30)) throw new Error('INVALID_GITHUB_OIDC_TIME')

  const response = await fetch('https://token.actions.githubusercontent.com/.well-known/jwks', {
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('GITHUB_JWKS_UNAVAILABLE')
  const jwks = await response.json() as { keys?: Array<JsonWebKey & { kid?: string }> }
  const jwk = jwks.keys?.find((key) => key.kid === header.kid)
  if (!jwk) throw new Error('GITHUB_JWK_NOT_FOUND')

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  const verified = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    base64UrlToBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  )
  if (!verified) throw new Error('INVALID_GITHUB_OIDC_SIGNATURE')
  return payload
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') ?? ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    if (!token) return NextResponse.json({ error: 'Missing GitHub OIDC token.' }, { status: 401 })

    const claims = await verifyGithubOidc(token)
    const body = await req.json() as PortalGithubPayload
    const rows = Array.isArray(body.rows) ? body.rows : []
    const observedAt = typeof body.observedAt === 'string' ? body.observedAt : new Date().toISOString()
    const discovery = body.discovery ?? {}
    const failedListingDetails = Number(body.failedListingDetails ?? 0)

    const reported = Number(discovery.reportedResultCount ?? 0)
    const discovered = Number(discovery.uniqueListings ?? rows.length)
    const coverage = reported > 0 ? discovered / reported : null
    const policy = evaluatePortalSnapshotPolicy({
      requestedFullSnapshot: true,
      pagesVisited: Number(discovery.pagesVisited ?? 0),
      discoveredListingUrls: discovered,
      validListingRows: rows.length,
      failedListingDetails,
      discoveryExhausted: discovery.exhausted === true,
      discoveryCapped: discovery.capped === true,
    })

    if (rows.length < 1000 || discovered < 1000 || !policy.fullSnapshotEligible || (coverage != null && coverage < 0.9)) {
      return NextResponse.json({
        error: 'External Portal snapshot did not meet canonical coverage gates.',
        rows: rows.length,
        discovered,
        reported,
        coverage,
        policy,
      }, { status: 409 })
    }

    const supabase = getServiceClient()
    const { data: result, error } = await supabase.rpc('ingest_portal_listing_snapshot_v2', {
      p_source_label: 'portal_inmobiliario_vitacura',
      p_source_file: `portal-github-${observedAt}.json`,
      p_dataset_kind: 'portal_houses',
      p_observed_at: observedAt,
      p_rows: rows,
      p_full_snapshot: true,
    })
    if (error || result?.failed) {
      console.error('[portal-github-ingest] ingest failed', { code: error?.code ?? 'PIPELINE_FAILED' })
      return NextResponse.json({ error: 'Portal external snapshot could not be persisted.' }, { status: 500 })
    }
    if (result?.skipped) return NextResponse.json({ error: 'Another Portal ingestion is running.' }, { status: 409 })

    const runId = result?.run_id ?? null
    if (runId) {
      const { data: existing } = await supabase
        .from('market_ingestion_runs')
        .select('metadata')
        .eq('id', runId)
        .maybeSingle()

      const metadata = existing?.metadata && typeof existing.metadata === 'object' && !Array.isArray(existing.metadata)
        ? existing.metadata as Record<string, unknown>
        : {}

      await supabase
        .from('market_ingestion_runs')
        .update({
          metadata: {
            ...metadata,
            pipeline: 'portal_inventory_discovery_v1',
            acquisition_runtime: 'github_actions_chrome',
            github_run_id: claims.run_id ?? null,
            github_sha: claims.sha ?? null,
            observed_at: observedAt,
            full_snapshot: true,
            search_pages: Number(discovery.pagesVisited ?? 0),
            discovery_raw_candidates: Number(discovery.rawListingCandidates ?? 0),
            discovery_duplicate_candidates: Number(discovery.duplicateListingCandidates ?? 0),
            discovery_unique_listings: discovered,
            portal_reported_result_count: reported || null,
            inventory_coverage_ratio: coverage,
            discovery_exhausted: discovery.exhausted === true,
            discovery_capped: discovery.capped === true,
            failed_listing_details: failedListingDetails,
            new_listings: Number(result?.new ?? 0),
            updated_listings: Number(result?.updated ?? 0),
            unchanged_listings: Number(result?.unchanged ?? 0),
            removed_listings: Number(result?.removed ?? 0),
          },
        })
        .eq('id', runId)
    }

    return NextResponse.json({
      ok: true,
      runId,
      observedAt,
      received: Number(result?.received ?? rows.length),
      accepted: Number(result?.accepted ?? 0),
      linked: Number(result?.linked ?? 0),
      unlinked: Number(result?.unlinked ?? 0),
      new: Number(result?.new ?? 0),
      updated: Number(result?.updated ?? 0),
      unchanged: Number(result?.unchanged ?? 0),
      removed: Number(result?.removed ?? 0),
      coverage,
    })
  } catch (error) {
    console.error('[portal-github-ingest] rejected', {
      code: error instanceof Error ? error.message : 'UNKNOWN',
    })
    return NextResponse.json({ error: 'External Portal ingestion authorization failed.' }, { status: 401 })
  }
}
