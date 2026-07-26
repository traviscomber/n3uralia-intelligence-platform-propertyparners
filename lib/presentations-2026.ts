import presentationData from '@/data/presentations-2026.json'

export type PresentationComparisonStatus = 'exact' | 'different' | 'not_comparable'

export type PresentationComparison = {
  scope: string
  metric: string
  period: string
  presentation: number
  comparison: number | null
  delta: number | null
  status: PresentationComparisonStatus
  presentationSource: { deck: string; slide: number; title: string }
  comparisonSource: string
}

export type ManagementEntity = {
  name: string
  branch: string | null
  slideRange: number[]
  salesSummary: {
    source: { deck: string; slide: number; title: string }
    currentSalesCount: number
    currentSalesUf: number
    cumulativeSalesCount: number
    cumulativeSalesUf: number
  }
  scores: {
    management: number | null
    portfolio: number | null
    followUp: number | null
    conversion: number | null
    classification: string | null
  }
  indicators: {
    stock: number | null
    requirements: number | null
    activeLeads: number | null
    classifiedLeads: number | null
    stale90Leads: number | null
    realizedVisits: number | null
    scheduledVisits: number | null
  }
}

export type DocumentExtractionQuality = 'high' | 'medium' | 'low'

export type PresentationDocumentChunk = {
  id: string
  documentId: string
  title: string
  content: string
  slide: number
  period: string | null
  extractedAt: string
  contentHash: string
  extractionQuality: DocumentExtractionQuality
}

export type PresentationDocument = {
  id: string
  title: string
  sourceType: 'presentation'
  documentDate: string | null
  extractedAt: string
  contentHash: string
  extractionQuality: DocumentExtractionQuality
  chunks: PresentationDocumentChunk[]
}

function stableHash(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

function compactContent(parts: Array<string | number | null | undefined>) {
  return parts
    .filter((part) => part !== null && part !== undefined && String(part).trim().length > 0)
    .map((part) => String(part).trim())
    .join(' · ')
}

function entityToChunk(entity: ManagementEntity, index: number): PresentationDocumentChunk | null {
  const source = entity.salesSummary.source
  const content = compactContent([
    entity.name,
    entity.branch,
    `Ventas actuales: ${entity.salesSummary.currentSalesCount}`,
    `UF actuales: ${entity.salesSummary.currentSalesUf}`,
    `Ventas acumuladas: ${entity.salesSummary.cumulativeSalesCount}`,
    `UF acumuladas: ${entity.salesSummary.cumulativeSalesUf}`,
    entity.scores.management === null ? null : `Score gestión: ${entity.scores.management}`,
    entity.scores.portfolio === null ? null : `Score cartera: ${entity.scores.portfolio}`,
    entity.indicators.activeLeads === null ? null : `Leads activos: ${entity.indicators.activeLeads}`,
    entity.indicators.stock === null ? null : `Stock: ${entity.indicators.stock}`,
  ])

  if (!content) return null

  const documentId = `presentation:${source.deck.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  const id = `${documentId}:slide-${source.slide}:entity-${index + 1}`

  return {
    id,
    documentId,
    title: source.title || entity.name,
    content,
    slide: source.slide,
    period: '2026',
    extractedAt: '2026-07-26T00:00:00.000Z',
    contentHash: stableHash(`${id}|${content}`),
    extractionQuality: 'high',
  }
}

export function normalizePresentationDocuments(entities: ManagementEntity[]): PresentationDocument[] {
  const chunks = entities
    .map(entityToChunk)
    .filter((chunk): chunk is PresentationDocumentChunk => chunk !== null)

  const uniqueChunks = Array.from(
    new Map(chunks.map((chunk) => [`${chunk.documentId}:${chunk.contentHash}`, chunk])).values(),
  )

  const grouped = new Map<string, PresentationDocumentChunk[]>()
  for (const chunk of uniqueChunks) {
    grouped.set(chunk.documentId, [...(grouped.get(chunk.documentId) ?? []), chunk])
  }

  return Array.from(grouped.entries())
    .map(([id, documentChunks]): PresentationDocument => {
      const orderedChunks = [...documentChunks].sort((left, right) => left.slide - right.slide || left.id.localeCompare(right.id))
      const title = orderedChunks[0]?.title ?? id
      return {
        id,
        title,
        sourceType: 'presentation',
        documentDate: '2026',
        extractedAt: orderedChunks[0]?.extractedAt ?? '2026-07-26T00:00:00.000Z',
        contentHash: stableHash(orderedChunks.map((chunk) => chunk.contentHash).join('|')),
        extractionQuality: orderedChunks.every((chunk) => chunk.extractionQuality === 'high') ? 'high' : 'medium',
        chunks: orderedChunks,
      }
    })
    .filter((document) => document.chunks.length > 0)
    .sort((left, right) => left.id.localeCompare(right.id))
}

export function getPresentations2026() {
  return presentationData
}

export function getPresentationComparisons(status?: PresentationComparisonStatus) {
  const comparisons = presentationData.reconciliation.comparisons as PresentationComparison[]
  return status ? comparisons.filter((item) => item.status === status) : comparisons
}

export function getManagementEntities() {
  return {
    company: presentationData.management.company as ManagementEntity,
    branches: presentationData.management.branches as ManagementEntity[],
    partners: presentationData.management.partners as ManagementEntity[],
  }
}

export function getPresentationDocuments2026() {
  const management = getManagementEntities()
  return normalizePresentationDocuments([
    management.company,
    ...management.branches,
    ...management.partners,
  ])
}
