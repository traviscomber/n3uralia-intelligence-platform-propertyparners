import type { ReactNode } from 'react'
import { PathRuntimeProvenanceReporter } from '@/components/layout/path-runtime-provenance-reporter'
import { getCorporateIntelligenceEvidence } from '@/lib/audited-runtime-provenance'

export default function IntelligenceLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PathRuntimeProvenanceReporter pathname="/dashboard/inteligencia" evidence={getCorporateIntelligenceEvidence('Inteligencia corporativa')} />
      {children}
    </>
  )
}
