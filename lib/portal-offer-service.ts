import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import { portalChileToday, uniqueFirstSeenToday } from '@/lib/portal-offer-day'

type Client = ReturnType<typeof createServiceClient>
export type OfferType = 'casas' | 'departamentos'
const TYPES: ReadonlyArray<{ type: OfferType; dataset: string; code: string; label: string }> = [
  { type: 'casas', label: 'Casas', dataset: 'portal_houses', code: 'portal-inmobiliario-vitacura-portal-houses' },
  { type: 'departamentos', label: 'Departamentos', dataset: 'portal_apartments', code: 'portal-inmobiliario-vitacura-portal-apartments' },
]
const DAILY_LIMIT = 250
const PAGE_SIZE = 25
const BATCH_SIZE = 40

export type OfferListing = {
  id: string
  title: string
  address: string | null
  priceUf: number | null
  url: string | null
  observedAt: string | null
  addedAt: string | null
  hasDetail: boolean
}
export type OfferGroup = {
  type: OfferType
  label: string
  inventoryRunId: string | null
  inventoryCount: number | null
  inventoryAt: string | null
  sourceId: string | null
  addedTodayCount: number | null
  addedToday: OfferListing[]
  additionsUnavailable: boolean
  inventoryUnavailable: boolean
}
export type OfferView = {
  date: string
  groups: OfferGroup[]
  selected: OfferType
  page: number
  pages: number
  inventory: OfferListing[]
  inventoryUnavailable: boolean
}
type ListingRow = {
  source_listing_id: string | null
  title: string | null
  raw_address: string | null
  price_uf: number | string | null
  url: string | null
  observed_at: string | null
  status: string | null
}

function inBatches<T>(arr: readonly T[]): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += BATCH_SIZE) result.push(arr.slice(i, i + BATCH_SIZE))
  return result
}
function safeUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && ['www.portalinmobiliario.com', 'portalinmobiliario.com'].includes(url.hostname.toLowerCase())
      ? url.toString() : null
  } catch {
    return null
  }
}
function record(row: ListingRow, addedAt: string | null = null): OfferListing {
  const id = String(row.source_listing_id ?? '')
  const price = row.price_uf == null ? NaN : Number(row.price_uf)
  return {
    id, title: row.title?.trim() || 'Publicación Portal ' + id,
    address: row.raw_address?.trim() || null,
    priceUf: Number.isFinite(price) && price > 0 ? price : null,
    url: safeUrl(row.url), observedAt: row.observed_at, addedAt, hasDetail: true,
  }
}
async function todaysFirstSeen(client: Client, sourceId: string, start: string, end: string) {
  // The latest observation may be today even if the publication is old.
  const today = await client.from('market_listings').select('source_listing_id,created_at')
    .eq('source_id', sourceId).gte('created_at', start).lt('created_at', end)
    .order('created_at', { ascending: false }).limit(DAILY_LIMIT + 1)
  if (today.error) throw today.error
  if ((today.data ?? []).length > DAILY_LIMIT) throw new Error('DAILY_RECONCILIATION_LIMIT')
  const rows = today.data ?? []
  const ids = [...new Set(rows.map((item) => item.source_listing_id).filter((id): id is string => Boolean(id)))]
  if (!ids.length) return { count: 0, rows: [] as OfferListing[] }
  const historical = new Set<string>()
  for (const batch of inBatches(ids)) {
    const older = await client.from('market_listings').select('source_listing_id')
      .eq('source_id', sourceId).lt('created_at', start).in('source_listing_id', batch).limit(1001)
    if (older.error) throw older.error
    if ((older.data ?? []).length >= 1001) throw new Error('HISTORY_RECONCILIATION_LIMIT')
    for (const row of older.data ?? []) if (row.source_listing_id) historical.add(row.source_listing_id)
  }
  const firstSeen = uniqueFirstSeenToday(rows, historical)
  if (!firstSeen.size) return { count: 0, rows: [] as OfferListing[] }
  const details: ListingRow[] = []
  for (const batch of inBatches([...firstSeen.keys()])) {
    const response = await client.from('market_current_listings')
      .select('source_listing_id,title,raw_address,price_uf,observed_at,url,status')
      .eq('source_id', sourceId).eq('status', 'active').is('removed_at', null)
      .in('source_listing_id', batch).limit(BATCH_SIZE)
    if (response.error) throw response.error
    details.push(...(response.data ?? []))
  }
  const newRows = details.filter((row) => row.source_listing_id && firstSeen.has(row.source_listing_id))
    .map((row) => record(row, firstSeen.get(String(row.source_listing_id)) ?? null))
    .sort((a, b) => String(b.addedAt).localeCompare(String(a.addedAt)))
  return { count: newRows.length, rows: newRows.slice(0, 12) }
}
async function group(client: Client, spec: (typeof TYPES)[number], sourceId: string | null, start: string, end: string): Promise<OfferGroup> {
  const value: OfferGroup = {
    type: spec.type, label: spec.label, sourceId,
    inventoryRunId: null, inventoryCount: null, inventoryAt: null, addedTodayCount: null,
    addedToday: [], additionsUnavailable: false, inventoryUnavailable: false,
  }
  if (!sourceId) {
    value.additionsUnavailable = true
    value.inventoryUnavailable = true
    return value
  }
  const [inventory, additions] = await Promise.allSettled([
    client.from('market_ingestion_runs').select('id,accepted_rows,started_at,completed_at')
      .eq('source_system','portal_inmobiliario').eq('dataset_kind',spec.dataset).eq('status','completed')
      .contains('metadata',{pipeline:'portal_inventory_discovery_v1',full_snapshot:true})
      .order('started_at',{ascending:false}).limit(1).maybeSingle(),
    todaysFirstSeen(client, sourceId, start, end),
  ])
  if (inventory.status === 'fulfilled' && !inventory.value.error) {
    value.inventoryRunId = inventory.value.data?.id ?? null
    value.inventoryCount = inventory.value.data?.accepted_rows ?? null
    value.inventoryAt = inventory.value.data?.completed_at ?? inventory.value.data?.started_at ?? null
  } else value.inventoryUnavailable = true
  if (additions.status === 'fulfilled') {
    value.addedTodayCount = additions.value.count
    value.addedToday = additions.value.rows
  } else value.additionsUnavailable = true
  return value
}
async function inventoryPage(client: Client, selected: OfferGroup, requestPage: number) {
  const pages = Math.max(1, Math.ceil((selected.inventoryCount ?? 0) / PAGE_SIZE))
  const page = Math.min(Math.max(1, requestPage), pages)
  if (!selected.inventoryRunId || !selected.sourceId) {
    return {page, pages, inventory: [] as OfferListing[], inventoryUnavailable: false}
  }
  try {
    const result = await client.from('market_raw_records')
      .select('source_record_id,payload,observed_at')
      .eq('ingestion_run_id',selected.inventoryRunId)
      .order('source_row_number',{ascending:true})
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
    if (result.error) throw result.error
    const raw = result.data ?? []
    const ids = [...new Set(raw.map((row) => row.source_record_id).filter((id): id is string => Boolean(id)))]
    let details: ListingRow[] = []
    if (ids.length) {
      const response = await client.from('market_current_listings')
        .select('source_listing_id,title,raw_address,price_uf,observed_at,url,status')
        .eq('source_id',selected.sourceId).in('source_listing_id',ids).limit(PAGE_SIZE)
      if (response.error) throw response.error
      details = response.data ?? []
    }
    const byId = new Map(details.map((row) => [row.source_listing_id,row]))
    const inventory: OfferListing[] = raw.filter((row) => Boolean(row.source_record_id)).map((row) => {
      const id = String(row.source_record_id)
      const detail = byId.get(id)
      if (detail) return record(detail)
      const payload = row.payload as Record<string, unknown> | null
      return {
        id, title: 'Publicación Portal ' + id,
        address: null, priceUf: null,
        url: safeUrl(payload?.url), observedAt: row.observed_at,
        addedAt: null, hasDetail: false,
      }
    })
    return {page,pages,inventory,inventoryUnavailable:false}
  } catch {
    return {page,pages,inventory:[] as OfferListing[],inventoryUnavailable:true}
  }
}

export async function loadPortalOffer(args: { selected: OfferType; page: number; now?: Date }): Promise<OfferView> {
  const client = createServiceClient()
  const today = portalChileToday(args.now)
  const sources = await client.from('market_sources').select('id,code').in('code',TYPES.map((type) => type.code)).limit(TYPES.length)
  const ids = new Map((sources.data ?? []).map((item) => [item.code, String(item.id)]))
  const groups = await Promise.all(TYPES.map((type) => group(
    client,type,sources.error ? null : ids.get(type.code) ?? null,today.start,today.end,
  )))
  const selected = groups.find((item) => item.type === args.selected) ?? groups[0]
  const page = await inventoryPage(client,selected,args.page)
  return {date:today.day,groups,selected:selected.type,...page}
}
