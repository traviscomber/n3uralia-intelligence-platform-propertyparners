import type { ReactNode } from 'react'
import { RuntimeProvenanceReporter } from '@/components/layout/runtime-provenance-provider'
import { getCrmAuditedEvidence } from '@/lib/audited-runtime-provenance'

export default function CrmDataLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <RuntimeProvenanceReporter evidence={getCrmAuditedEvidence('CRM data')} />
      {children}
    </>
  )
}
