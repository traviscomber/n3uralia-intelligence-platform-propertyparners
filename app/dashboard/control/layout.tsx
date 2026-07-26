import type { ReactNode } from 'react'
import { RuntimeProvenanceReporter } from '@/components/layout/runtime-provenance-provider'
import { getExecutiveAuditedEvidence } from '@/lib/audited-runtime-provenance'

export default function ControlDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <RuntimeProvenanceReporter evidence={getExecutiveAuditedEvidence('Management control')} />
      {children}
    </>
  )
}
