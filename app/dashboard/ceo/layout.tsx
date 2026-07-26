import type { ReactNode } from 'react'
import { RuntimeProvenanceReporter } from '@/components/layout/runtime-provenance-provider'
import { getExecutiveAuditedEvidence } from '@/lib/audited-runtime-provenance'

export default function CeoDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <RuntimeProvenanceReporter evidence={getExecutiveAuditedEvidence('CEO dashboard')} />
      {children}
    </>
  )
}
