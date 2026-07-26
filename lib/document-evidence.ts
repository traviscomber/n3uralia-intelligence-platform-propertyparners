/**
 * Shared Documents Evidence Domain Contract
 *
 * Reusable types and extraction logic for document evidence across the intelligence engine.
 * Documents (presentations, reports, policy documents, etc.) are normalized into a stable
 * structure with deterministic IDs, content hashes, and chunk deduplica.
 *
 * This contract is used by:
 * - lib/presentations-2026.ts (presentation normalization)
 * - lib/n3uralia-intelligence-engine.ts (buildClientEvidence integration)
 * - Future RAG / document retrieval pipelines
 */

import crypto from 'node:crypto'

/**
 * Source type of a document.
 */
export type DocumentSourceType = 'presentation' | 'report' | 'policy' | 'internal_memo'

/**
 * Quality assessment of extracted document content.
 */
export type ExtractionQuality = 'high' | 'medium' | 'low'

/**
 * Document metadata: title, source, date, extraction info.
 */
export interface DocumentMetadata {
  documentId: string
  sourceType: DocumentSourceType
  title: string
  sourceTitle?: string
  period?: string | null
  extractedAt?: string | null
  extractionQuality: ExtractionQuality
  contentHash: string
  byteSize?: number
}

/**
 * A chunk: a logical unit within a document (e.g., slide, section, page).
 */
export interface DocumentChunk {
  chunkId: string
  documentId: string
  reference: string // e.g., "slide 5" or "page 3"
  title?: string
  content: string
  contentHash: string
  sequenceOrder: number
  extractedAt?: string | null
}

/**
 * Citation: a reference back to the source document and specific chunk.
 */
export interface DocumentCitation {
  documentId: string
  chunkId: string
  reference: string // human-readable: "Slide 5: Quarterly Results"
  title?: string
}

/**
 * Aggregated document evidence record for the intelligence engine.
 */
export interface DocumentEvidenceRecord {
  id: string // stable identifier for the evidence item
  documentId: string
  title: string
  summary: string // brief summary of key content
  sourceType: DocumentSourceType
  citation: DocumentCitation
  extractionQuality: ExtractionQuality
  extractedAt?: string | null
}

/**
 * Generate a stable document ID from source type and title.
 * Uses deterministic hashing so the same source always produces the same ID.
 *
 * @param sourceType - type of document
 * @param title - document title
 * @returns stable document ID
 */
export function generateDocumentId(sourceType: DocumentSourceType, title: string): string {
  const normalized = `${sourceType}:${title}`.toLowerCase().replace(/\s+/g, '_')
  const hash = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 12)
  return `doc_${sourceType}_${hash}`
}

/**
 * Generate a stable chunk ID from document ID and reference.
 *
 * @param documentId - parent document ID
 * @param reference - human-readable reference (e.g., "slide 5")
 * @returns stable chunk ID
 */
export function generateChunkId(documentId: string, reference: string): string {
  const normalized = `${documentId}:${reference}`.toLowerCase().replace(/\s+/g, '_')
  const hash = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 12)
  return `chunk_${hash}`
}

/**
 * Compute SHA-256 hash of content.
 * Used to detect duplicate chunks and validate content integrity.
 *
 * @param content - text content
 * @returns hex-encoded SHA-256 hash
 */
export function contentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}

/**
 * Validate a document chunk: ensure content is non-empty and well-formed.
 *
 * @param chunk - chunk to validate
 * @returns true if chunk is valid
 */
export function isValidChunk(chunk: Partial<DocumentChunk>): boolean {
  if (!chunk.content || typeof chunk.content !== 'string') return false
  if (chunk.content.trim().length === 0) return false
  if (!chunk.documentId || !chunk.chunkId || !chunk.reference) return false
  return true
}

/**
 * Remove duplicate chunks from an array based on content hash.
 * Keeps the first occurrence of each unique content.
 * Maintains deterministic ordering.
 *
 * @param chunks - array of chunks to deduplicate
 * @returns deduplicated array, same order
 */
export function deduplicateChunks(chunks: DocumentChunk[]): DocumentChunk[] {
  const seen = new Set<string>()
  return chunks.filter((chunk) => {
    if (seen.has(chunk.contentHash)) {
      return false
    }
    seen.add(chunk.contentHash)
    return true
  })
}

/**
 * Normalize chunks for a document: validate, deduplicate, and sort deterministically.
 *
 * @param documentId - parent document ID
 * @param chunks - raw chunks to normalize
 * @returns normalized, deduplicated, and sorted chunks
 */
export function normalizeDocumentChunks(documentId: string, chunks: DocumentChunk[]): DocumentChunk[] {
  // Validate all chunks
  const valid = chunks.filter(isValidChunk)

  // Deduplicate by content hash
  const deduplicated = deduplicateChunks(valid)

  // Sort deterministically by sequence order, then by chunk ID for stability
  const sorted = deduplicated.sort((a, b) => {
    if (a.sequenceOrder !== b.sequenceOrder) {
      return a.sequenceOrder - b.sequenceOrder
    }
    return a.chunkId.localeCompare(b.chunkId)
  })

  // Ensure all chunks belong to the declared document
  return sorted.map((chunk) => ({
    ...chunk,
    documentId,
  }))
}

/**
 * Create a document metadata record with validation.
 *
 * @param sourceType - type of document
 * @param title - document title
 * @param options - additional metadata
 * @returns validated metadata record
 */
export function createDocumentMetadata(
  sourceType: DocumentSourceType,
  title: string,
  options?: {
    sourceTitle?: string
    period?: string | null
    extractedAt?: string | null
    extractionQuality?: ExtractionQuality
    byteSize?: number
  },
): DocumentMetadata {
  const documentId = generateDocumentId(sourceType, title)
  const now = new Date().toISOString()

  return {
    documentId,
    sourceType,
    title,
    sourceTitle: options?.sourceTitle,
    period: options?.period ?? null,
    extractedAt: options?.extractedAt ?? now,
    extractionQuality: options?.extractionQuality ?? 'medium',
    contentHash: contentHash(title), // hash of title as placeholder; use full content hash if available
    byteSize: options?.byteSize,
  }
}

/**
 * Build a document evidence record for the intelligence engine.
 * This is the final, aggregated form used in buildClientEvidence().
 *
 * @param metadata - document metadata
 * @param chunks - document chunks
 * @param summary - optional summary; if not provided, uses first chunk content
 * @returns evidence record ready for the intelligence engine
 */
export function buildDocumentEvidenceRecord(
  metadata: DocumentMetadata,
  chunks: DocumentChunk[],
  summary?: string,
): DocumentEvidenceRecord {
  const firstChunk = chunks[0]
  const resolvedSummary = summary || (firstChunk ? firstChunk.content.slice(0, 200) : '')

  return {
    id: `doc.evidence.${metadata.documentId}`,
    documentId: metadata.documentId,
    title: metadata.title,
    summary: resolvedSummary,
    sourceType: metadata.sourceType,
    citation: {
      documentId: metadata.documentId,
      chunkId: firstChunk?.chunkId ?? 'N/A',
      reference: firstChunk?.reference ?? 'N/A',
      title: firstChunk?.title ?? metadata.title,
    },
    extractionQuality: metadata.extractionQuality,
    extractedAt: metadata.extractedAt,
  }
}
