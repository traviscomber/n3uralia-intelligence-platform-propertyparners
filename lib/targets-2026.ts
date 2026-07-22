import targets from '@/data/targets-2026.json'
import crm from '@/data/crm-intelligence.json'

export type TargetMetric = 'stock_count' | 'requirements_count' | 'leads_count' | 'visits_count' | 'offers_count' | 'sales_count' | 'sales_uf'

const ACTUAL_FIELD: Partial<Record<TargetMetric, string>> = {
  stock_count: 'stockByOffice',
  requirements_count: 'requirementsByOffice',
  leads_count: 'leadsByOffice',
  sales_count: 'salesByOffice',
  sales_uf: 'salesUfByOffice',
}

function normalized(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}

function officeActual(month: (typeof crm.months)[number], branch: string, metric: TargetMetric) {
  const field = ACTUAL_FIELD[metric]
  if (!field) return null
  const entries = month[field as keyof typeof month]
  if (!Array.isArray(entries)) return null
  const entry = entries.find((item) => typeof item === 'object' && item !== null && 'label' in item && normalized(String(item.label)) === normalized(branch))
  if (!entry || typeof entry !== 'object') return null
  if ('count' in entry && typeof entry.count === 'number') return entry.count
  if ('value' in entry && typeof entry.value === 'number') return entry.value
  return null
}

export function getTargetSource() {
  return targets
}

export function getCompanySalesCompliance(period = '2026-06') {
  const month = crm.months.find((item) => item.period === period)
  const target = targets.companyMonthlyTargets.sales_count[period as keyof typeof targets.companyMonthlyTargets.sales_count] ?? null
  const actual = month?.salesCount ?? null
  return {
    period,
    target,
    actual,
    compliance: target && actual !== null ? Number(((actual / target) * 100).toFixed(1)) : null,
  }
}

export function getBranchTargetPerformance(period = '2026-06') {
  const month = crm.months.find((item) => item.period === period)
  return targets.branches.map((branch) => ({
    branch: branch.branch,
    file: branch.file,
    metrics: branch.sections.map((section) => {
      const metric = section.metric as TargetMetric
      const targetCell = section.branchMonths[period as keyof typeof section.branchMonths]
      const target = targetCell?.value ?? null
      const actual = month ? officeActual(month, branch.branch, metric) : null
      return {
        metric,
        label: section.label,
        unit: section.unit,
        target,
        targetDisplayedValue: targetCell?.displayedValue ?? null,
        actual,
        compliance: target && actual !== null ? Number(((actual / target) * 100).toFixed(1)) : null,
        compatibility: ACTUAL_FIELD[metric] ? 'compatible' as const : metric === 'visits_count' ? 'definition_pending' as const : 'actual_unavailable' as const,
        reconciliation: section.monthlyReconciliation.find((item) => item.period === period) ?? null,
        annualValues: section.branchAnnualValues,
        partners: section.partners.map((partner) => ({
          sourceRow: partner.sourceRow,
          name: partner.name,
          identityStatus: partner.identityStatus,
          inferredName: 'inferredName' in partner ? partner.inferredName : null,
          identityEvidence: 'identityEvidence' in partner ? partner.identityEvidence : null,
          sourceColor: partner.sourceColor,
          target: partner.months[period as keyof typeof partner.months]?.value ?? null,
          targetDisplayedValue: partner.months[period as keyof typeof partner.months]?.displayedValue ?? null,
          annualValues: partner.annualValues,
        })),
      }
    }),
    unmappedCells: branch.unmappedCells,
  }))
}

export function getBranchSalesYtdPerformance(endPeriod = '2026-06') {
  const months = crm.months.filter((month) => month.period <= endPeriod)
  return targets.branches.map((branch) => {
    const salesSection = branch.sections.find((section) => section.metric === 'sales_count')!
    const ufSection = branch.sections.find((section) => section.metric === 'sales_uf')!
    const periods = Object.keys(salesSection.branchMonths).filter((period) => period <= endPeriod)
    const targetSales = periods.reduce((sum, period) => sum + (salesSection.branchMonths[period as keyof typeof salesSection.branchMonths].value ?? 0), 0)
    const targetUf = periods.reduce((sum, period) => sum + (ufSection.branchMonths[period as keyof typeof ufSection.branchMonths].value ?? 0), 0)
    const actualSales = months.reduce((sum, month) => sum + (officeActual(month, branch.branch, 'sales_count') ?? 0), 0)
    const actualUf = months.reduce((sum, month) => sum + (officeActual(month, branch.branch, 'sales_uf') ?? 0), 0)
    return {
      id: normalized(branch.branch).replace(/[^a-z0-9]+/g, '-'),
      branch: branch.branch,
      actualSales,
      actualUf,
      targetSales,
      targetUf,
      compliance: targetSales > 0 ? Number(((actualSales / targetSales) * 100).toFixed(1)) : null,
    }
  }).sort((a, b) => b.actualSales - a.actualSales)
}
