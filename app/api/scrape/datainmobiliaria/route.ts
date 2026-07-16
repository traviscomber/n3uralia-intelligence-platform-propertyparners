import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import puppeteer from 'puppeteer'
import { persistScrapeHealthSnapshot } from '@/lib/scrape-health'
import { buildPropertyDedupSignature, findBestDuplicateMatch, mergePropertyRecord, type PropertyLike } from '@/lib/property-dedupe'

type ScrapedProperty = {
  address: string
  price_uf: number
  area_m2: number
  bedrooms: number
  bathrooms: number
  neighborhood: string
  lat: number
  lng: number
  days_on_market: number
  source: string
  external_id: string
  property_type: 'casa' | 'departamento'
  source_url: string | null
  image_url: string | null
  listing_number: string | null
  tags: string[]
  source_listing_id: string | null
}

type SourceRun = {
  source: string
  scraped: number
  inserted: number
  skipped: number
  errors: string[]
}

type ScrapeRunPayload = {
  source: string
  status: 'success' | 'partial' | 'error'
  scraped_count: number
  inserted_count: number
  skipped_count: number
  error_count: number
  source_breakdown: Record<string, unknown>
  started_at: string
  finished_at: string
}

type MapRecord = {
  lat?: string | number
  lng?: string | number
  latitud?: string | number
  longitud?: string | number
  direccion_sii?: string
  comuna?: string
  cod_com?: string | number
  cod_mz?: string | number
  cod_pr?: string | number
  cod_destino?: string
  destino?: string
  price?: string | number
  superficie_construccion?: string | number
  superficie_total_terreno?: string | number
  uf_m2?: string | number
  ano_construccion?: string | number
  dormitorios?: string | number
  banos?: string | number
  bathrooms?: string | number
  date_inscripcion?: string
  rol?: string
}

type MapResponse = {
  resultados?: MapRecord[]
  has_more?: boolean
  error?: string
}

const MAPA_URL = 'https://datainmobiliaria.cl/reports/mapa'
const VITACURA_POLYGON = [
  { lat: -33.3605, lng: -70.6370 },
  { lat: -33.3605, lng: -70.5675 },
  { lat: -33.4225, lng: -70.5675 },
  { lat: -33.4225, lng: -70.6370 },
]

const SECTORS = [
  { keys: ['lo castillo'], lat: -33.3790, lng: -70.5930, name: 'Lo Castillo' },
  { keys: ['villa el dorado'], lat: -33.3765, lng: -70.5945, name: 'Villa El Dorado' },
  { keys: ['nueva costanera', 'costanera norte'], lat: -33.3885, lng: -70.5820, name: 'Nueva Costanera' },
  { keys: ['lo curro'], lat: -33.3780, lng: -70.5890, name: 'Lo Curro' },
  { keys: ['santa maria de manquehue'], lat: -33.3750, lng: -70.5950, name: 'Santa Maria de Manquehue' },
  { keys: ['jardin del este', 'candelaria', 'bicentenario'], lat: -33.3810, lng: -70.6000, name: 'Jardin del Este' },
  { keys: ['luis pasteur'], lat: -33.3890, lng: -70.5890, name: 'Luis Pasteur' },
  { keys: ['juan xxiii'], lat: -33.3880, lng: -70.5970, name: 'Juan XXIII' },
  { keys: ['las hualtatas'], lat: -33.3910, lng: -70.5880, name: 'Las Hualtatas' },
  { keys: ['las tranqueras'], lat: -33.3930, lng: -70.5990, name: 'Las Tranqueras' },
  { keys: ['estadio manquehue'], lat: -33.3940, lng: -70.5940, name: 'Estadio Manquehue' },
  { keys: ['vitacura', 'av vitacura', 'americo vespucio'], lat: -33.3900, lng: -70.5980, name: 'Vitacura Centro' },
]

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials')
  }

  return createSupabaseClient(supabaseUrl, supabaseKey)
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function hashLike(input: string) {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash.toString(36)
}

function normalizeSourceToken(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function makeListingNumber(source: string, propertyType: 'casa' | 'departamento', index: number) {
  return `${source}-${propertyType}-${String(index + 1).padStart(4, '0')}`
}

function makeTags(params: {
  propertyType: 'casa' | 'departamento'
  neighborhood: string
  source: string
  bedrooms: number
  bathrooms: number
}) {
  const tags = [
    params.propertyType,
    params.neighborhood,
    params.source,
    `${params.bedrooms}d`,
    `${params.bathrooms}b`,
  ]

  return Array.from(new Set(tags.map((tag) => normalizeSourceToken(tag)).filter(Boolean)))
}

function parseNumber(value: unknown) {
  if (value == null || value === '') return null
  const parsed = Number.parseFloat(String(value).replace(/\./g, '').replace(/,/g, '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function parseInteger(value: unknown) {
  const parsed = parseNumber(value)
  return parsed == null ? null : Math.round(parsed)
}

function parseUF(value: unknown) {
  const parsed = parseNumber(value)
  return parsed != null && parsed > 0 ? parsed : null
}

function sectorFromText(text: string, idx: number) {
  const lower = normalizeText(text)
  for (const sector of SECTORS) {
    if (sector.keys.some((key) => lower.includes(key))) return sector
  }
  return SECTORS[idx % SECTORS.length]
}

function sectorFromCoords(lat: number, lng: number, fallbackText: string, idx: number) {
  let best = SECTORS[idx % SECTORS.length]
  let bestDistance = Number.POSITIVE_INFINITY

  for (const sector of SECTORS) {
    const distance = Math.hypot(lat - sector.lat, lng - sector.lng)
    if (distance < bestDistance) {
      bestDistance = distance
      best = sector
    }
  }

  if (bestDistance <= 0.02) return best
  return sectorFromText(fallbackText, idx)
}

async function syncSourceStats(source: string, pipelineOrder: number, status: 'active' | 'error', recordsCount: number, errorMessage: string | null) {
  try {
    const supabase = getSupabaseClient()
    await supabase.from('data_sources').upsert(
      [
        {
          name: source,
          source_type: 'scraper',
          status,
          records_count: recordsCount,
          last_sync: new Date().toISOString(),
          error_message: errorMessage,
          pipeline_order: pipelineOrder,
        },
      ],
      { onConflict: 'name' },
    )
  } catch {
    // Best effort only.
  }
}

async function logScrapeRun(payload: ScrapeRunPayload) {
  try {
    const supabase = getSupabaseClient()
    await supabase.from('scrape_runs').insert(payload)
  } catch {
    // Best effort only.
  }
}

async function insertProperties(rows: ScrapedProperty[]) {
  const supabase = getSupabaseClient()
  const { data: existingRows } = await supabase
    .from('properties')
    .select('id,address,neighborhood,property_type,price_uf,area_m2,bedrooms,bathrooms,lat,lng,source,source_url,image_url,listing_number,tags,source_listing_id,external_id')

  const inventory = ((existingRows || []) as Array<PropertyLike & { id: string }>)
  let inserted = 0
  let updated = 0
  const errors: string[] = []

  for (const row of rows) {
    const match = findBestDuplicateMatch(inventory, row)
    if (match?.row?.id && match.score >= 90) {
      const merged = mergePropertyRecord(match.row, row)
      const { error } = await supabase.from('properties').update({
        address: merged.address,
        neighborhood: merged.neighborhood,
        property_type: merged.property_type,
        price_uf: merged.price_uf,
        area_m2: merged.area_m2,
        bedrooms: merged.bedrooms,
        bathrooms: merged.bathrooms,
        lat: merged.lat,
        lng: merged.lng,
        source: merged.source,
        external_id: merged.external_id,
        source_url: merged.source_url,
        image_url: merged.image_url,
        listing_number: merged.listing_number,
        tags: merged.tags,
        source_listing_id: merged.source_listing_id,
      }).eq('id', match.row.id)

      if (error) {
        errors.push(`${row.external_id}: ${error.message}`)
        continue
      }

      updated += 1
      const index = inventory.findIndex((candidate) => candidate.id === match.row.id)
      if (index >= 0) inventory[index] = { ...match.row, ...merged }
      continue
    }

    const { error } = await supabase.from('properties').insert({
      address: row.address,
      neighborhood: row.neighborhood,
      price_uf: row.price_uf,
      area_m2: row.area_m2,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      lat: row.lat,
      lng: row.lng,
      status: 'available',
      days_on_market: row.days_on_market,
      source: row.source,
      external_id: row.external_id,
      property_type: row.property_type,
      source_url: row.source_url,
      image_url: row.image_url,
      listing_number: row.listing_number,
      tags: row.tags,
      source_listing_id: row.source_listing_id,
    })

    if (error) {
      errors.push(`${row.external_id}: ${error.message}`)
    } else {
      inserted += 1
      inventory.push({
        ...row,
        id: row.external_id,
      })
    }
  }

  return { inserted: inserted + updated, errors }
}

function dedupeProperties(rows: ScrapedProperty[]) {
  const bestByKey = new Map<string, ScrapedProperty>()

  for (const row of rows) {
    const key = buildPropertyDedupSignature(row)
    const current = bestByKey.get(key)
    if (!current) {
      bestByKey.set(key, {
        ...row,
        external_id: row.external_id || hashLike(key),
      })
      continue
    }

    const score = [
      row.source_url,
      row.image_url,
      row.listing_number,
      row.source_listing_id,
      row.tags?.length,
      row.property_type,
      row.lat != null && row.lng != null,
    ].filter(Boolean).length

    const currentScore = [
      current.source_url,
      current.image_url,
      current.listing_number,
      current.source_listing_id,
      current.tags?.length,
      current.property_type,
      current.lat != null && current.lng != null,
    ].filter(Boolean).length

    if (score > currentScore) {
      bestByKey.set(key, {
        ...row,
        external_id: row.external_id || hashLike(key),
      })
    }
  }

  return Array.from(bestByKey.values())
}

async function launchBrowser() {
  return puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--single-process'],
  })
}

async function loadDetailPayload(page: any, codCom: string, codMz: string, codPr: string) {
  return page.evaluate(async ({ codCom, codMz, codPr }: { codCom: string; codMz: string; codPr: string }) => {
    const params = new URLSearchParams({ cod_com: codCom, cod_mz: codMz, cod_pr: codPr })
    const response = await fetch(`/reports/detalle_propiedad_data_mongo?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    })

    const text = await response.text()
    return { status: response.status, text }
  }, { codCom, codMz, codPr })
}

async function scrapeDatainmobiliariaVitacura(limit = 60, kind: 'houses' | 'departments' | 'all' = 'all') {
  const browser = await launchBrowser()
  const results: ScrapedProperty[] = []

  try {
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-CL,es;q=0.9' })
    await page.goto(MAPA_URL, { waitUntil: 'networkidle2', timeout: 45000 })

    const endpoint = await page.$eval('[data-mapa-endpoint-value]', (el) => el.getAttribute('data-mapa-endpoint-value') || '')
    const csrf = await page.$eval('[data-mapa-csrf-value]', (el) => el.getAttribute('data-mapa-csrf-value') || '')

    if (!endpoint || !csrf) {
      throw new Error('Data Inmobiliaria map tokens missing')
    }

    const requestBase = {
      fuente: 'ventas',
      polygon: VITACURA_POLYGON,
      is_viewport: true,
      destino: kind === 'houses' ? ['H'] : kind === 'departments' ? ['D'] : ['H', 'D'],
    }

    let pageIndex = 1
    while (pageIndex <= 5 && results.length < limit) {
      const requestBody = { ...requestBase, page: pageIndex }
      const raw = await page.evaluate(async ({ endpoint, csrf, requestBody }: { endpoint: string; csrf: string; requestBody: Record<string, unknown> }) => {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-Token': csrf,
          },
          body: JSON.stringify(requestBody),
          credentials: 'same-origin',
        })

        return { status: response.status, text: await response.text() }
      }, { endpoint, csrf, requestBody })

      if (raw.status === 402) {
        throw new Error('Data Inmobiliaria reached guest quota')
      }
      if (raw.status === 404) break
      if (raw.status < 200 || raw.status >= 300) {
        throw new Error(`Data Inmobiliaria search failed (${raw.status})`)
      }

      const payload = JSON.parse(raw.text) as MapResponse
      const rows = payload.resultados || []
      if (!rows.length) break

      for (let i = 0; i < rows.length && results.length < limit; i += 1) {
        const row = rows[i]
        const lat = parseNumber(row.lat ?? row.latitud)
        const lng = parseNumber(row.lng ?? row.longitud)
        if (lat == null || lng == null) continue

        const codCom = String(row.cod_com ?? '')
        const codMz = String(row.cod_mz ?? '')
        const codPr = String(row.cod_pr ?? '')
        const detailKey = codCom && codMz && codPr ? `${codCom}-${codMz}-${codPr}` : ''
        const baseText = `${row.direccion_sii || ''} ${row.comuna || ''} ${row.rol || ''} ${row.destino || ''}`
        const sector = sectorFromCoords(lat, lng, baseText, results.length)

        let detailData: Record<string, unknown> | null = null
        if (codCom && codMz && codPr) {
          const detail = await loadDetailPayload(page, codCom, codMz, codPr)
          if (detail.status === 200) {
            const parsed = JSON.parse(detail.text) as { success?: boolean; data?: Record<string, unknown> }
            if (parsed?.data && typeof parsed.data === 'object') {
              detailData = parsed.data
            }
          }
        }

        const priceUf = parseUF(row.price) ?? 0
        const areaM2 = parseInteger(row.superficie_construccion) ?? 0
        const bedrooms = Math.max(1, Math.min(parseInteger(row.dormitorios ?? 0) || 2, 8))
        const bathrooms = Math.max(1, Math.min(parseInteger(row.banos ?? row.bathrooms ?? 0) || 2, 8))
        const rawDate = String(row.date_inscripcion || detailData?.fecha_inscripcion || '')
        const daysOnMarket = rawDate
          ? Math.max(1, Math.round((Date.now() - new Date(rawDate).getTime()) / (1000 * 60 * 60 * 24)))
          : 30

        const address = String(detailData?.direccion_sii || row.direccion_sii || row.rol || detailKey || 'Vitacura').slice(0, 200)
        const neighborhood = sector.name || String(row.comuna || 'Vitacura')
        const propertyType: 'casa' | 'departamento' = String(detailData?.destino || row.destino || row.cod_destino || requestBase.destino[0] || 'H').toUpperCase() === 'D'
          ? 'departamento'
          : 'casa'
        const imageUrl =
          String(detailData?.image_url || detailData?.foto || detailData?.url_foto || detailData?.imagen || '')
            .trim() || null
        const sourceUrl = `${MAPA_URL}?cod_com=${codCom}&cod_mz=${codMz}&cod_pr=${codPr}`
        const listingNumber = makeListingNumber('datainmobiliaria_vitacura', propertyType, results.length)

        const normalized: ScrapedProperty = {
          address,
          price_uf: Math.max(0, Math.round(priceUf)),
          area_m2: Math.max(0, areaM2),
          bedrooms,
          bathrooms,
          neighborhood,
          lat,
          lng,
          days_on_market: daysOnMarket,
          source: 'datainmobiliaria_vitacura',
          external_id: `datainmobiliaria_vitacura|${detailKey || row.rol || hashLike(`${address}|${lat}|${lng}`)}`,
          property_type: propertyType,
          source_url: sourceUrl,
          image_url: imageUrl,
          listing_number: listingNumber,
          tags: makeTags({
            propertyType,
            neighborhood,
            source: 'datainmobiliaria_vitacura',
            bedrooms,
            bathrooms,
          }),
          source_listing_id: detailKey || row.rol || null,
        }
        results.push(normalized)
      }

      if (!payload.has_more) break
      pageIndex += 1
    }
  } finally {
    await browser.close().catch(() => {})
  }

  return results
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { source?: string; limit?: number; kind?: 'houses' | 'departments' | 'all' }
  const source = body.source || new URL(request.url).searchParams.get('source') || 'vitacura'
  const limit = Math.max(1, Math.min(Number(body.limit || new URL(request.url).searchParams.get('limit') || 60) || 60, 120))
  const kind = body.kind || (new URL(request.url).searchParams.get('kind') as 'houses' | 'departments' | 'all' | null) || 'all'
  const startedAt = new Date().toISOString()

  try {
    const rows = await scrapeDatainmobiliariaVitacura(limit, kind)
    const { inserted, errors } = await insertProperties(rows)
    const runSource = 'datainmobiliaria_vitacura'
    const runs: SourceRun[] = [{
      source: runSource,
      scraped: rows.length,
      inserted,
      skipped: rows.length - inserted,
      errors,
    }]

    await syncSourceStats('Data Inmobiliaria Vitacura', 10, errors.length ? 'error' : 'active', rows.length, errors[0] || null)

    const status: ScrapeRunPayload['status'] =
      errors.length > 0 ? (inserted > 0 ? 'partial' : 'error') : 'success'

    await logScrapeRun({
      source,
      status,
      scraped_count: rows.length,
      inserted_count: inserted,
      skipped_count: rows.length - inserted,
      error_count: errors.length,
      source_breakdown: { runs, errors: errors.slice(0, 10) },
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    })

    await persistScrapeHealthSnapshot()

    return NextResponse.json({
      success: true,
      source,
      scraped: rows.length,
      inserted,
      skipped: rows.length - inserted,
      runs,
      errors: errors.slice(0, 10),
      message: `Importadas ${inserted} propiedades desde Data Inmobiliaria en Vitacura`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Data Inmobiliaria scrape failed'

    await syncSourceStats('Data Inmobiliaria Vitacura', 10, 'error', 0, message)
    await logScrapeRun({
      source,
      status: 'error',
      scraped_count: 0,
      inserted_count: 0,
      skipped_count: 0,
      error_count: 1,
      source_breakdown: { runs: [], error: message },
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    })
    await persistScrapeHealthSnapshot()

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
