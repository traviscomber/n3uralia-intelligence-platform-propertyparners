import type { ReactNode } from 'react'
import { PathRuntimeProvenanceReporter } from '@/components/layout/path-runtime-provenance-reporter'
import { getMlLabAuditedEvidence } from '@/lib/audited-runtime-provenance'

export default function MlLabLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PathRuntimeProvenanceReporter pathname="/dashboard/ml-lab" evidence={getMlLabAuditedEvidence('ML Lab')} />
      {children}
    </>
  )
}
