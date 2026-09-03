'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileText, Loader2 } from 'lucide-react'
import { IntelligencePanel } from '@/components/intelligence/design-system'

type GenerationResponse = {
  id?: string
  title?: string
  artifactUrl?: string
  reused?: boolean
  sourceSnapshot?: {
    periodStart?: string
    periodEnd?: string
    sourceCutoff?: string
    evidenceCount?: number
  }
  error?: string
  code?: string
}

export function CanonicalLatestReportGenerator() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GenerationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    if (loading) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const response = await fetch('/api/management/reports/canonical-client/latest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const payload = await response.json() as GenerationResponse
      if (!response.ok) throw new Error(payload.error || 'No fue posible generar el informe canónico.')
      setResult(payload)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible generar el informe canónico.')
    } finally {
      setLoading(false)
    }
  }

  return <IntelligencePanel
    eyebrow="Reportin · canónico"
    title="Último período disponible"
    description="Construye el paquete exclusivamente desde métricas y estados canónicos persistidos. Los valores no verificables permanecen N/D y el resultado se guarda como borrador; no se envía automáticamente."
  >
    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 text-xs text-[var(--n3-text-muted)]">
        <p>Fuente: gestión canónica + registro de capacidades.</p>
        <p className="mt-1">Protección: no duplica un informe canónico existente para el mismo período.</p>
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={() => void generate()}
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
        {loading ? 'Generando informe…' : 'Generar canónico'}
      </button>
    </div>

    {result?.id ? <div role="status" className="border-t border-[var(--n3-line)] p-5 text-sm">
      <p className="font-medium text-[#65c780]">{result.reused ? 'Informe existente recuperado.' : 'Borrador canónico generado.'}</p>
      <p className="mt-2 break-words text-[var(--n3-text-muted)]">{result.title || 'Informe canónico'}</p>
      {result.sourceSnapshot ? <p className="mt-1 text-xs text-[var(--n3-text-muted)]">
        {result.sourceSnapshot.periodStart} – {result.sourceSnapshot.periodEnd} · corte {result.sourceSnapshot.sourceCutoff} · {result.sourceSnapshot.evidenceCount ?? 0} evidencias
      </p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/dashboard/reportes/canonicos" className="inline-flex min-h-11 items-center border border-[var(--n3-line)] px-4 py-2 text-sm">Revisar informe</Link>
        {result.artifactUrl ? <Link href={`${result.artifactUrl}?disposition=inline`} target="_blank" className="inline-flex min-h-11 items-center border border-[var(--n3-line)] px-4 py-2 text-sm">Abrir PDF</Link> : null}
      </div>
    </div> : null}

    {error ? <p role="alert" className="border-t border-[var(--n3-line)] p-5 text-sm text-[#ff766f]">{error}</p> : null}
  </IntelligencePanel>
}
