import type { ReactNode } from 'react'
import { RuntimeProvenanceReporter } from '@/components/layout/runtime-provenance-provider'
import { getTargetsAuditedEvidence } from '@/lib/audited-runtime-provenance'

export default function TargetsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <RuntimeProvenanceReporter evidence={getTargetsAuditedEvidence('Metas 2026')} />
      {children}
    </>
  )
}
