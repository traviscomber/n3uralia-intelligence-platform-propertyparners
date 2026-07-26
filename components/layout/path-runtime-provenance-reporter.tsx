'use client'

import { usePathname } from 'next/navigation'
import { RuntimeProvenanceReporter } from '@/components/layout/runtime-provenance-provider'
import type { RuntimeProvenanceEvidence } from '@/lib/runtime-provenance'

export function PathRuntimeProvenanceReporter({
  pathname,
  evidence,
}: {
  pathname: string
  evidence: RuntimeProvenanceEvidence
}) {
  const currentPathname = usePathname()
  if (currentPathname !== pathname) return null
  return <RuntimeProvenanceReporter evidence={evidence} />
}
