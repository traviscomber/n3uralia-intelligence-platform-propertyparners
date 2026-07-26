import type { ReactNode } from 'react'
import { PathRuntimeProvenanceReporter } from '@/components/layout/path-runtime-provenance-reporter'
import { getPresentationsAuditedEvidence } from '@/lib/audited-runtime-provenance'

export default function PresentationsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PathRuntimeProvenanceReporter pathname="/dashboard/presentaciones" evidence={getPresentationsAuditedEvidence('Presentaciones 2026')} />
      {children}
    </>
  )
}
