export type DocumentInsight = {
  documentId: string
  extractedFacts: string[]
  evidencePoints: string[]
  confidence: number
  requiresValidation: boolean
}

export function analyzeDocument(input: {
  documentId: string
  text: string
  confidence: number
}): DocumentInsight {
  return {
    documentId: input.documentId,
    extractedFacts: [input.text],
    evidencePoints: [
      'Document content extracted for intelligence processing.',
    ],
    confidence: input.confidence,
    requiresValidation: input.confidence < 80,
  }
}

export function prepareDocumentForKnowledge(input: DocumentInsight) {
  return {
    ...input,
    knowledgeReady: !input.requiresValidation,
    instruction:
      'Validated document intelligence can feed evidence, memory and reasoning layers.',
  }
}
