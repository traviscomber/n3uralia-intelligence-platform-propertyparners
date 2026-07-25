'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import type { RuntimeProvenanceEvidence } from '@/lib/runtime-provenance'

type RuntimeProvenanceContextValue = {
  evidence: RuntimeProvenanceEvidence | null
  reportEvidence: (evidence: RuntimeProvenanceEvidence) => void
  clearEvidence: () => void
}

const RuntimeProvenanceContext = createContext<RuntimeProvenanceContextValue | null>(null)

export function RuntimeProvenanceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [evidence, setEvidence] = useState<RuntimeProvenanceEvidence | null>(null)

  useEffect(() => {
    setEvidence(null)
  }, [pathname])

  const reportEvidence = useCallback((nextEvidence: RuntimeProvenanceEvidence) => {
    setEvidence(nextEvidence)
  }, [])

  const clearEvidence = useCallback(() => {
    setEvidence(null)
  }, [])

  const value = useMemo(() => ({ evidence, reportEvidence, clearEvidence }), [evidence, reportEvidence, clearEvidence])

  return <RuntimeProvenanceContext.Provider value={value}>{children}</RuntimeProvenanceContext.Provider>
}

export function useRuntimeProvenance() {
  const context = useContext(RuntimeProvenanceContext)
  if (!context) throw new Error('useRuntimeProvenance must be used within RuntimeProvenanceProvider')
  return context
}

export function RuntimeProvenanceReporter({ evidence }: { evidence: RuntimeProvenanceEvidence }) {
  const { reportEvidence, clearEvidence } = useRuntimeProvenance()
  const serializedEvidence = JSON.stringify(evidence)

  useEffect(() => {
    reportEvidence(evidence)
    return clearEvidence
  }, [clearEvidence, reportEvidence, serializedEvidence])

  return null
}
