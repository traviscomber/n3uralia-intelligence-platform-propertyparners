import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import puppeteer from 'puppeteer'
import { requireExecutiveAccess } from '@/lib/api-access'

export const dynamic = 'force-dynamic'

const UF_VALUE = 37500
const SEARCH_URLS = [
  'https://www.portalinmobiliario.com/venta/departamento/vitacura-metropolitana',
  'https://www.portalinmobiliario.com/venta/casa/vitacura-metropolitana',
]

type PortalBenchmarkSnapshot = {
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

type PortalCard = {
  title: string
  price: string
  address: string
  attrs: string
  sourceUrl: string
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials')
  }

  return createSupabaseClient(supabaseUrl, supabaseKey)
}

function withTimeout<T>(promise: Promise<T>, ms = 15000) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Portal benchmark timeout')), ms)),
  ])
}

function parseUF(text: string) {
  const cleaned = text.replace(/\n/g, ' ').replace(/\./g, '').replace(/,/g, '.')
  const match = cleaned.match(/UF\s*(\d+(?:\.\d+)?)/i)
  if (!match) return null
  const value = Number.parseFloat(match[1])
  return Number.isFinite(value) && value > 0 ? value : null
}

function hashLike(input: string) {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash.toString(36)
}

async function fetchPortalCards() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--single-process'],
  })

  const cards: PortalCard[] = []

  try {
    for (const url of SEARCH_URLS) {
      const page = await browser.newPage()
      await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
      await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-CL,es;q=0.9' })
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 40000 })
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const pageCards = await page.evaluate(() => {
        const items = document.querySelectorAll('[class*="ui-search-result"]')
        return Array.from(items).map((card) => {
          const title = card.querySelector('[class*="title"]')?.textContent?.trim() ?? ''
          const price = card.querySelector('[class*="price"]')?.textContent?.trim() ?? ''
          const address = card.querySelector('[class*="location"]')?.textContent?.trim() ?? ''
          const attrs = Array.from(card.querySelectorAll('[class*="attribute"]'))
            .map((element) => element.textContent?.trim() ?? '')
            .join(' | ')
          return { title, price, address, attrs }
        })
      })

      for (const card of pageCards) {
        if (!card.price || !card.address) continue
        cards.push({ ...card, sourceUrl: url })
      }

      await page.close()
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  } finally {
    await browser.close().catch(() => {})
  }

  return cards
}

async function fetchPortalBenchmarkSnapshot(): Promise<PortalBenchmarkSnapshot> {
  const cards = await fetchPortalCards()
  const pricedCards = cards
    .map((card, index) => {
      const priceUf = parseUF(card.price)
      return priceUf
        ? {
            ...card,
            priceUf,
            externalId: hashLike(`${card.sourceUrl}|${card.title}|${card.address}|${index}`),
          }
        : null
    })
    .filter((value): value is NonNullable<typeof value> => value !== null)

  if (!pricedCards.length) {
    throw new Error('Portal Inmobiliario benchmark no tuvo resultados con precio UF válido')
  }

  const pricesClp = pricedCards.map((card) => Math.round(card.priceUf * UF_VALUE))
  const topCard = pricedCards
    .slice()
    .sort((a, b) => b.priceUf - a.priceUf)[0]

  return {
    source: 'portal_inmobiliario_benchmark',
    source_url: topCard.sourceUrl,
    neighborhood: 'Vitacura',
    listing_title: topCard.title || 'Portal Inmobiliario Vitacura search',
    offer_count: pricedCards.length,
    low_price_clp: Math.min(...pricesClp),
    high_price_clp: Math.max(...pricesClp),
    price_currency: 'CLP',
    recorded_at: new Date().toISOString(),
  }
}

async function getLatestBenchmark() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('external_market_benchmarks')
    .select('source,source_url,neighborhood,listing_title,offer_count,low_price_clp,high_price_clp,price_currency,recorded_at')
    .eq('source', 'portal_inmobiliario_benchmark')
    .order('recorded_at', { ascending: false })
    .limit(1)

  if (error) return null
  return (data?.[0] || null) as PortalBenchmarkSnapshot | null
}

export async function GET(request: Request) {
  const access = await requireExecutiveAccess()
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido a CEO y administradores.' }, { status: access.status })
  if (request.headers.get('x-live-source-confirmed') !== 'true') {
    return NextResponse.json({ error: 'Debes confirmar explícitamente la consulta de una fuente viva no conciliada.' }, { status: 428 })
  }
  try {
    const snapshot = await withTimeout(fetchPortalBenchmarkSnapshot())

    return NextResponse.json({
      benchmark: snapshot,
      source: 'portal_inmobiliario_benchmark',
      recordedAt: snapshot.recorded_at,
      provenance: 'live_unreconciled',
      eligibleForAuditedViews: false,
      persisted: false,
    })
  } catch (err) {
    const fallback = await getLatestBenchmark().catch(() => null)
    if (fallback) {
      return NextResponse.json({
        benchmark: fallback,
        source: 'portal_inmobiliario_benchmark',
        recordedAt: fallback.recorded_at,
        fallback: true,
        provenance: 'live_cached_unreconciled',
        eligibleForAuditedViews: false,
        warning: err instanceof Error ? err.message : 'Using cached Portal Inmobiliario benchmark',
      })
    }

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No pudimos actualizar el benchmark de Portal Inmobiliario.' },
      { status: 500 },
    )
  }
}
