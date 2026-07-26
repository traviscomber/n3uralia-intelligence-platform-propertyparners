import type { ReactNode } from 'react'
import { PathRuntimeProvenanceReporter } from '@/components/layout/path-runtime-provenance-reporter'
import { getMarketAndValuationAuditedEvidence } from '@/lib/audited-runtime-provenance'

export default function MarketLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PathRuntimeProvenanceReporter pathname="/dashboard/market" evidence={getMarketAndValuationAuditedEvidence('Inteligencia de mercado')} />
      {children}
    </>
  )
}
