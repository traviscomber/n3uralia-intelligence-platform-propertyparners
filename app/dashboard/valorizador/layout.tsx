import type { ReactNode } from 'react'
import { RuntimeProvenanceReporter } from '@/components/layout/runtime-provenance-provider'
import { getValuationAuditedEvidence } from '@/lib/audited-runtime-provenance'

export default function ValuationLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <RuntimeProvenanceReporter evidence={getValuationAuditedEvidence('Valorizador')} />
      {children}
    </>
  )
}
