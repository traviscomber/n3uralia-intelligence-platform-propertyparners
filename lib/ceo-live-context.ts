export async function buildCEOLiveContext() {
  return {
    sources: [
      'crm',
      'targets',
      'market',
      'valuation',
      'documents',
      'memory',
    ],
    instruction:
      'Responder usando evidencia empresarial disponible y separar hechos de recomendaciones.',
    timestamp: new Date().toISOString(),
  }
}
