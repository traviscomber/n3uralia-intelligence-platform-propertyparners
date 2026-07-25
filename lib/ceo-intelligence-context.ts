import {
  buildN3uraliaIntelligenceContext,
  type IntelligenceEvidence,
  type IntelligenceSignal,
  type N3uraliaIntelligenceContext,
} from '@/lib/n3uralia-intelligence-engine'
import {
  getManagementEntities,
  getPresentationComparisons,
} from '@/lib/presentations-2026'

function buildPresentationEvidence(): IntelligenceEvidence[] {
  const management = getManagementEntities()
  const comparisons = getPresentationComparisons()
  const company = management.company
  const comparable = comparisons.filter((item) => item.status !== 'not_comparable')
  const differences = comparable.filter((item) => item.status === 'different')

  const evidence: IntelligenceEvidence[] = [
    {
      id: 'client.reports.company-management-score',
      domain: 'reports',
      sourceClass: 'client_evidence',
      label: 'Score de gestión compañía',
      value: company.scores.management,
      period: '2026',
      source: `${company.salesSummary.source.deck} · diapositiva ${company.salesSummary.source.slide}`,
      methodology: 'Indicador extraído de la presentación ejecutiva 2026; se conserva como evidencia reportada y no como medición independiente.',
    },
    {
      id: 'client.reports.company-portfolio-score',
      domain: 'reports',
      sourceClass: 'client_evidence',
      label: 'Score de cartera compañía',
      value: company.scores.portfolio,
      period: '2026',
      source: `${company.salesSummary.source.deck} · diapositiva ${company.salesSummary.source.slide}`,
      methodology: 'Indicador de cartera reportado en presentación ejecutiva 2026.',
    },
    {
      id: 'client.reports.active-leads',
      domain: 'reports',
      sourceClass: 'client_evidence',
      label: 'Leads activos reportados',
      value: company.indicators.activeLeads,
      period: '2026',
      source: `${company.salesSummary.source.deck} · diapositiva ${company.salesSummary.source.slide}`,
      methodology: 'Conteo reportado en la presentación de gestión; debe contrastarse con CRM antes de usarlo como cifra autoritativa.',
    },
    {
      id: 'client.reports.stock',
      domain: 'reports',
      sourceClass: 'client_evidence',
      label: 'Stock reportado',
      value: company.indicators.stock,
      period: '2026',
      source: `${company.salesSummary.source.deck} · diapositiva ${company.salesSummary.source.slide}`,
      methodology: 'Stock informado en presentación de gestión; se mantiene separado del universo CRM.',
    },
    {
      id: 'client.reports.reconciliation-status',
      domain: 'reports',
      sourceClass: 'client_evidence',
      label: 'Reconciliación presentación versus fuentes operativas',
      value: `${differences.length} diferencias en ${comparable.length} métricas comparables`,
      period: '2026',
      source: 'presentations-2026.json#reconciliation',
      methodology: 'Comparación determinística entre métricas de presentaciones y fuentes operativas compatibles; los universos no comparables se excluyen.',
    },
    {
      id: 'client.reports.branch-coverage',
      domain: 'reports',
      sourceClass: 'client_evidence',
      label: 'Cobertura de sucursales en presentaciones',
      value: management.branches.length,
      period: '2026',
      source: 'presentations-2026.json#management.branches',
      methodology: 'Número de entidades de sucursal con ficha de gestión disponible.',
    },
  ]

  return evidence.filter((item) => item.value !== null && item.value !== undefined)
}

function buildPresentationSignals(evidence: IntelligenceEvidence[]): IntelligenceSignal[] {
  const reconciliation = evidence.find((item) => item.id === 'client.reports.reconciliation-status')
  if (!reconciliation) return []

  const hasDifferences = !String(reconciliation.value).startsWith('0 diferencias')

  return [
    {
      id: 'n3uralia.signal.presentation-reconciliation',
      domain: 'reports',
      sourceClass: 'n3uralia_inference',
      title: hasDifferences
        ? 'Diferencias entre reporting ejecutivo y fuentes operativas'
        : 'Reporting ejecutivo reconciliado con fuentes operativas',
      interpretation: hasDifferences
        ? 'Existen métricas de presentación que no coinciden con las fuentes operativas comparables. Las decisiones deben usar la fuente autoritativa definida para cada KPI.'
        : 'Las métricas comparables revisadas no presentan diferencias registradas.',
      evidenceIds: [reconciliation.id],
      confidence: 'high',
    },
  ]
}

export function buildCEOIntelligenceContext(): N3uraliaIntelligenceContext {
  const base = buildN3uraliaIntelligenceContext('ceo')
  const presentationEvidence = buildPresentationEvidence()
  const evidence = [...base.evidence, ...presentationEvidence]
  const presentationSignals = buildPresentationSignals(presentationEvidence)

  return {
    ...base,
    evidence,
    signals: [...base.signals, ...presentationSignals],
    governance: {
      ...base.governance,
      operatingPrinciple: `${base.governance.operatingPrinciple} Presentation metrics are supporting evidence and must remain separate from authoritative CRM and market universes.`,
    },
  }
}
