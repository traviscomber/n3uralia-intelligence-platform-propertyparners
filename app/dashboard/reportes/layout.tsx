import type { ReactNode } from 'react'
import { PathRuntimeProvenanceReporter } from '@/components/layout/path-runtime-provenance-reporter'
import { getExecutiveAuditedEvidence } from '@/lib/audited-runtime-provenance'

export default function ReportsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PathRuntimeProvenanceReporter pathname="/dashboard/reportes/autonomos" evidence={getExecutiveAuditedEvidence('Reportes ejecutivos')} />
      <PathRuntimeProvenanceReporter pathname="/dashboard/reportes/audiencias/ejecutivo" evidence={getExecutiveAuditedEvidence('Reportes para partners')} />
      {children}
    </>
  )
}
