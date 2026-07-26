import presentationData from '@/data/presentations-2026.json'
import {
  DocumentChunk,
  DocumentMetadata,
  DocumentEvidenceRecord,
  generateDocumentId,
  generateChunkId,
  contentHash,
  normalizeDocumentChunks,
  createDocumentMetadata,
  buildDocumentEvidenceRecord,
} from '@/lib/document-evidence'

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

/**
 * Normalize presentation documents into the shared Documents evidence contract.
 * Converts presentation entities (comparisons, management data) into document chunks
 * with stable IDs, content hashes, and citations.
 *
 * @returns array of document evidence records ready for the intelligence engine
 */
export function normalizePresentationDocuments(): DocumentEvidenceRecord[] {
  const evidence: DocumentEvidenceRecord[] = []

  // --- Reconciliation Comparisons as a Document ---
  const comparisons = getPresentationComparisons()
  if (comparisons.length > 0) {
    const documentId = generateDocumentId('presentation', 'Reconciliation Comparisons 2026')
    const metadata = createDocumentMetadata('presentation', 'Reconciliation Comparisons 2026', {
      sourceTitle: 'Management Presentation',
      period: '2026',
      extractionQuality: 'high',
    })

    // Create chunks: one per comparison record
    const chunks: DocumentChunk[] = comparisons.map((comp, index) => {
      const reference = `comparison_${comp.metric.replace(/\s+/g, '_')}_${index + 1}`
      const content = `${comp.metric} (${comp.period}): Presentation ${comp.presentation}, Comparison ${comp.comparison}, Delta ${comp.delta}, Status: ${comp.status}`

      return {
        chunkId: generateChunkId(documentId, reference),
        documentId,
        reference,
        title: `${comp.metric} Comparison`,
        content,
        contentHash: contentHash(content),
        sequenceOrder: index,
        extractedAt: new Date().toISOString(),
      }
    })

    // Normalize and create evidence record
    const normalized = normalizeDocumentChunks(documentId, chunks)
    if (normalized.length > 0) {
      const summary = `${comparisons.length} reconciliation comparisons across key business metrics for 2026.`
      evidence.push(buildDocumentEvidenceRecord(metadata, normalized, summary))
    }
  }

  // --- Management Entities as Documents ---
  const entities = getManagementEntities()

  // Company-level management document
  const companyDocId = generateDocumentId('presentation', 'Company Management Summary')
  const companyMeta = createDocumentMetadata('presentation', 'Company Management Summary', {
    sourceTitle: 'Management Presentation',
    period: '2026',
    extractionQuality: 'high',
  })
  const companyChunks: DocumentChunk[] = []
  let seqOrder = 0

  if (entities.company) {
    const comp = entities.company
    const contentLines = [
      `Entity: ${comp.name}`,
      `Current Sales: ${comp.salesSummary.currentSalesCount} units, ${comp.salesSummary.currentSalesUf} UF`,
      `Cumulative Sales: ${comp.salesSummary.cumulativeSalesCount} units, ${comp.salesSummary.cumulativeSalesUf} UF`,
      `Management Score: ${comp.scores.management ?? 'N/A'}`,
      `Portfolio Score: ${comp.scores.portfolio ?? 'N/A'}`,
      `Conversion: ${comp.scores.conversion ?? 'N/A'}%`,
    ]

    const chunkContent = contentLines.join(' | ')
    companyChunks.push({
      chunkId: generateChunkId(companyDocId, 'company_summary'),
      documentId: companyDocId,
      reference: 'company_summary',
      title: 'Company Management Summary',
      content: chunkContent,
      contentHash: contentHash(chunkContent),
      sequenceOrder: seqOrder++,
      extractedAt: new Date().toISOString(),
    })
  }

  const normalizedCompany = normalizeDocumentChunks(companyDocId, companyChunks)
  if (normalizedCompany.length > 0) {
    evidence.push(
      buildDocumentEvidenceRecord(
        companyMeta,
        normalizedCompany,
        `Company management summary including sales performance and operational scores for 2026.`,
      ),
    )
  }

  // Branch-level management documents
  if (entities.branches.length > 0) {
    const branchDocId = generateDocumentId('presentation', `Branch Management Summary 2026`)
    const branchMeta = createDocumentMetadata('presentation', `Branch Management Summary 2026`, {
      sourceTitle: 'Management Presentation',
      period: '2026',
      extractionQuality: 'high',
    })

    const branchChunks: DocumentChunk[] = entities.branches.map((branch, idx) => {
      const branchContent = [
        `Branch: ${branch.name}${branch.branch ? ` (${branch.branch})` : ''}`,
        `Sales: ${branch.salesSummary.currentSalesCount} current, ${branch.salesSummary.cumulativeSalesCount} cumulative`,
        `Stock: ${branch.indicators.stock ?? 'N/A'}, Requirements: ${branch.indicators.requirements ?? 'N/A'}`,
        `Management: ${branch.scores.management ?? 'N/A'}, Portfolio: ${branch.scores.portfolio ?? 'N/A'}`,
      ].join(' | ')

      return {
        chunkId: generateChunkId(branchDocId, `branch_${idx}`),
        documentId: branchDocId,
        reference: `branch_${branch.name.replace(/\s+/g, '_')}`,
        title: `${branch.name} Management`,
        content: branchContent,
        contentHash: contentHash(branchContent),
        sequenceOrder: idx,
        extractedAt: new Date().toISOString(),
      }
    })

    const normalizedBranches = normalizeDocumentChunks(branchDocId, branchChunks)
    if (normalizedBranches.length > 0) {
      evidence.push(
        buildDocumentEvidenceRecord(
          branchMeta,
          normalizedBranches,
          `Management summary for ${entities.branches.length} branches including sales, stock, and performance scores.`,
        ),
      )
    }
  }

  // Partner-level management documents
  if (entities.partners.length > 0) {
    const partnerDocId = generateDocumentId('presentation', 'Partner Management Summary 2026')
    const partnerMeta = createDocumentMetadata('presentation', 'Partner Management Summary 2026', {
      sourceTitle: 'Management Presentation',
      period: '2026',
      extractionQuality: 'medium',
    })

    const partnerChunks: DocumentChunk[] = entities.partners.map((partner, idx) => {
      const partnerContent = [
        `Partner: ${partner.name}`,
        `Sales: ${partner.salesSummary.currentSalesCount} current, ${partner.salesSummary.cumulativeSalesCount} cumulative`,
        `Active Leads: ${partner.indicators.activeLeads ?? 'N/A'}, Classified: ${partner.indicators.classifiedLeads ?? 'N/A'}`,
        `Management: ${partner.scores.management ?? 'N/A'}, Follow-up: ${partner.scores.followUp ?? 'N/A'}`,
      ].join(' | ')

      return {
        chunkId: generateChunkId(partnerDocId, `partner_${idx}`),
        documentId: partnerDocId,
        reference: `partner_${partner.name.replace(/\s+/g, '_')}`,
        title: `${partner.name} Management`,
        content: partnerContent,
        contentHash: contentHash(partnerContent),
        sequenceOrder: idx,
        extractedAt: new Date().toISOString(),
      }
    })

    const normalizedPartners = normalizeDocumentChunks(partnerDocId, partnerChunks)
    if (normalizedPartners.length > 0) {
      evidence.push(
        buildDocumentEvidenceRecord(
          partnerMeta,
          normalizedPartners,
          `Management summary for ${entities.partners.length} partners including sales and operational metrics.`,
        ),
      )
    }
  }

  return evidence
}
