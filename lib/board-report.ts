import crm from '@/data/crm-intelligence.json'
import presentations from '@/data/presentations-2026-summary.json'
import targets from '@/data/targets-2026.json'
import { getBranchTargetPerformance } from '@/lib/targets-2026'

const PRESENTATION_PERIOD = '2026-06'

function normalized(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}

function officeValue(entries: Array<{ label: string; count?: number; value?: number }>, branch: string) {
  const row = entries.find((entry) => normalized(entry.label) === normalized(branch))
  return row?.count ?? row?.value ?? null
}

function compliance(actual: number | null, target: number | null) {
  return actual !== null && target !== null && target !== 0 ? Number(((actual / target) * 100).toFixed(1)) : null
}

export function buildBoardReport(period?: string) {
  const availablePeriods = crm.months.map((month) => month.period)
  const selectedPeriod = availablePeriods.includes(period || '') ? period! : availablePeriods.at(-1)!
  const month = crm.months.find((item) => item.period === selectedPeriod)!
  const periodMonths = crm.months.filter((item) => item.period <= selectedPeriod)
  const cumulativeCrm = {
    salesCount: periodMonths.reduce((sum, item) => sum + item.salesCount, 0),
    salesUf: periodMonths.reduce((sum, item) => sum + item.salesUf, 0),
  }
  const companyTargetSales = targets.companyMonthlyTargets.sales_count[selectedPeriod as keyof typeof targets.companyMonthlyTargets.sales_count] ?? null
  const companyTargetUf = targets.companyMonthlyTargets.sales_uf[selectedPeriod as keyof typeof targets.companyMonthlyTargets.sales_uf] ?? null
  const branchTargets = getBranchTargetPerformance(selectedPeriod)
  const presentationAligned = selectedPeriod === PRESENTATION_PERIOD
  const companyPresentation = presentations.management.company

  const branches = branchTargets.map((branchTarget) => {
    const presentation = presentations.management.branches.find((item) => normalized(item.name) === normalized(branchTarget.branch))
    const salesMetric = branchTarget.metrics.find((metric) => metric.metric === 'sales_count')!
    const ufMetric = branchTarget.metrics.find((metric) => metric.metric === 'sales_uf')!
    const crmSales = officeValue(month.salesByOffice, branchTarget.branch)
    const crmUf = officeValue(month.salesUfByOffice, branchTarget.branch)

    return {
      branch: branchTarget.branch,
      crm: { sales: crmSales, salesUf: crmUf },
      target: { sales: salesMetric.target, salesUf: ufMetric.target },
      compliance: { sales: compliance(crmSales, salesMetric.target), salesUf: compliance(crmUf, ufMetric.target) },
      presentation: presentationAligned && presentation ? {
        sales: presentation.salesSummary.currentSalesCount,
        salesUf: presentation.salesSummary.currentSalesUf,
        cumulativeSales: presentation.salesSummary.cumulativeSalesCount,
        cumulativeSalesUf: presentation.salesSummary.cumulativeSalesUf,
        score: presentation.scores,
        indicators: presentation.indicators,
        sources: {
          sales: presentation.salesSummary.source,
          score: presentation.scores.source,
          indicators: presentation.indicators.source,
        },
      } : null,
      reconciliation: {
        sales: salesMetric.reconciliation,
        salesUf: ufMetric.reconciliation,
      },
      sourceFile: branchTarget.file,
    }
  })

  return {
    schemaVersion: 1,
    generatedMode: 'deterministic_source_backed' as const,
    generatedAt: new Date().toISOString(),
    period: selectedPeriod,
    availablePeriods,
    presentationPeriod: PRESENTATION_PERIOD,
    presentationAligned,
    company: {
      crm: {
        sales: month.salesCount,
        salesUf: month.salesUf,
        captures: month.capturesCount,
        leads: month.newLeadsCount,
        requirements: month.requirementsCount,
        visits: month.visitsCount,
        realizedVisits: month.realizedVisitsCount,
        stock: month.stockCount,
      },
      target: { sales: companyTargetSales, salesUf: companyTargetUf },
      compliance: { sales: compliance(month.salesCount, companyTargetSales), salesUf: compliance(month.salesUf, companyTargetUf) },
      cumulativeCrm,
      presentation: presentationAligned ? {
        sales: companyPresentation.salesSummary.currentSalesCount,
        salesUf: companyPresentation.salesSummary.currentSalesUf,
        cumulativeSales: companyPresentation.salesSummary.cumulativeSalesCount,
        cumulativeSalesUf: companyPresentation.salesSummary.cumulativeSalesUf,
        score: companyPresentation.scores,
        indicators: companyPresentation.indicators,
        sources: {
          sales: companyPresentation.salesSummary.source,
          evolution: companyPresentation.sales.source,
          score: companyPresentation.scores.source,
          indicators: companyPresentation.indicators.source,
        },
      } : null,
    },
    reconciliation: {
      rule: presentations.reconciliation.rule,
      counts: presentations.reconciliation.counts,
      headline: presentationAligned ? presentations.reconciliation.headline : null,
    },
    branches,
    quality: {
      crmCoverage: month.quality.sourceCoverage,
      crmMissingDatasets: month.quality.missingDatasets,
      targetIssues: targets.quality.issueCount,
      targetCriticalIssues: targets.quality.criticalCount,
      presentationComparisons: presentations.reconciliation.counts.total,
      presentationDifferences: presentations.reconciliation.counts.different,
      presentationNotComparable: presentations.reconciliation.counts.notComparable,
    },
    sources: {
      crm: { workbooks: crm.sourceInventory.workbookCount, generatedAt: crm.generatedAt },
      targets: { workbooks: targets.cellCoverage.workbookCount, version: targets.version, generatedAt: targets.generatedAt },
      presentations: { decks: presentations.source.presentationCount, slides: presentations.source.slideCount, sha256: presentations.source.sha256, generatedAt: presentations.generatedAt },
    },
  }
}

export type BoardReport = ReturnType<typeof buildBoardReport>
