import type { ReactNode } from 'react'
import { RuntimeProvenanceReporter } from '@/components/layout/runtime-provenance-provider'
import { getMarketAndValuationAuditedEvidence } from '@/lib/audited-runtime-provenance'

export default function PropertiesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <RuntimeProvenanceReporter evidence={getMarketAndValuationAuditedEvidence('Propiedades')} />
      {children}
    </>
  )
}
