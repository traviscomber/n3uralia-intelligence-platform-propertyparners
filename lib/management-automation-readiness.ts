import dependencyStatus from '@/config/client-dependencies-status.json'

const APPROVED_DEPENDENCY_STATUSES = new Set(['received', 'approved', 'waived'])

export type ManagementAutomationDependencyId = 'reporting-approval' | 'kpi-dictionary'

export type ManagementAutomationDependency = {
  id: ManagementAutomationDependencyId
  status: string
  ready: boolean
  label: string
}

function dependencyReadiness(id: ManagementAutomationDependencyId, fallbackLabel: string): ManagementAutomationDependency {
  const dependency = dependencyStatus.dependencies.find((item) => item.id === id)
  const status = dependency?.status ?? 'pending'
  return {
    id,
    status,
    ready: APPROVED_DEPENDENCY_STATUSES.has(status),
    label: dependency?.label ?? fallbackLabel,
  }
}

export function getManagementAutomationReadiness() {
  const reportingApproval = dependencyReadiness('reporting-approval', 'Calendario, destinatarios y reglas de reportes')
  const kpiDictionary = dependencyReadiness('kpi-dictionary', 'Diccionario oficial de KPI')
  return {
    ready: reportingApproval.ready && kpiDictionary.ready,
    reportingApproval,
    kpiDictionary,
  }
}
