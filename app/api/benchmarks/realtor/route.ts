import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { persistScrapeHealthSnapshot } from '@/lib/scrape-health'

export const dynamic = 'force-dynamic'

const REALTOR_URL = 'https://www.realtor.com/international/cl/vitacura-santiago/'

type RealtorSnapshot = {
  source: string
  source_url: string
  neighborhood: string
  listing_title: string | null
  offer_count: number
  low_price_clp: number | null
  high_price_clp: number | null
  price_currency: string | null
  recorded_at: string
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials')
  }

  return createSupabaseClient(supabaseUrl, supabaseKey)
}

function decodeJson(text: string) {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function parseNumber(value: unknown) {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/,/g, ''))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function withTimeout<T>(promise: Promise<T>, ms = 15000) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Realtor benchmark timeout')), ms)),
  ])
}

async function getLatestBenchmark() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('external_market_benchmarks')
    .select('source,source_url,neighborhood,listing_title,offer_count,low_price_clp,high_price_clp,price_currency,recorded_at')
    .eq('source', 'realtor_international')
    .order('recorded_at', { ascending: false })
    .limit(1)

  if (error) return null
  return (data?.[0] || null) as RealtorSnapshot | null
}

async function fetchRealtorSnapshot(): Promise<RealtorSnapshot> {
  const response = await fetch(REALTOR_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
  })

  if (!response.ok) {
    throw new Error(`Realtor request failed (${response.status})`)
  }

  const html = await response.text()
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
  if (!match) throw new Error('Realtor JSON-LD not found')

  const payload = JSON.parse(decodeJson(match[1])) as {
    name?: string
    mainEntity?: Array<{
      offers?: {
        lowPrice?: string | number
        highPrice?: string | number
        priceCurrency?: string
        offerCount?: string | number
      }
    }>
  }

  const offers = payload.mainEntity?.[0]?.offers
  if (!offers) throw new Error('Realtor aggregate offer not found')

  return {
    source: 'realtor_international',
    source_url: REALTOR_URL,
    neighborhood: 'Vitacura',
    listing_title: payload.name || 'Property for Sale in Vitacura, Santiago',
    offer_count: Math.max(0, Math.round(parseNumber(offers.offerCount) || 0)),
    low_price_clp: parseNumber(offers.lowPrice),
    high_price_clp: parseNumber(offers.highPrice),
    price_currency: offers.priceCurrency || 'CLP',
    recorded_at: new Date().toISOString(),
  }
}

async function persistBenchmark(snapshot: RealtorSnapshot) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('external_market_benchmarks').insert(snapshot)
  if (error) throw error

  await supabase.from('data_sources').upsert(
    [
      {
        name: 'Realtor International',
        source_type: 'external_api',
        status: 'active',
        records_count: snapshot.offer_count,
        last_sync: snapshot.recorded_at,
        error_message: null,
        pipeline_order: 5,
      },
    ],
    { onConflict: 'name' },
  )
}

export async function GET() {
  try {
    const snapshot = await withTimeout(fetchRealtorSnapshot())
    await persistBenchmark(snapshot)
    await persistScrapeHealthSnapshot()

    return NextResponse.json({
      benchmark: snapshot,
      source: 'realtor_international',
      recordedAt: snapshot.recorded_at,
    })
  } catch (err) {
    const fallback = await getLatestBenchmark().catch(() => null)
    if (fallback) {
      return NextResponse.json({
        benchmark: fallback,
        source: 'realtor_international',
        recordedAt: fallback.recorded_at,
        fallback: true,
        warning: err instanceof Error ? err.message : 'Using cached Realtor benchmark',
      })
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No pudimos actualizar el benchmark de Realtor.' },
      { status: 500 },
    )
  }
}
