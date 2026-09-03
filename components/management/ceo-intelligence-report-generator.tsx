'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileBarChart2, Loader2 } from 'lucide-react'
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
    kmlPolygonCount?: number
    marketRows?: number
  }
  error?: string
}

function gatewayErrorMessage(status: number) {
  if ([502, 503, 504].includes(status)) return 'La generación excedió la ventana interactiva disponible. Intenta nuevamente.'
  return 'El servicio de generación devolvió una respuesta no válida. Intenta nuevamente.'
}

export function CeoIntelligenceReportGenerator() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GenerationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    if (loading) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const response = await fetch('/api/management/reports/ceo-intelligence/latest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const contentType = response.headers.get('content-type') || ''
      const payload = contentType.includes('application/json') ? await response.json() as GenerationResponse : null
      if (!response.ok) throw new Error(payload?.error || gatewayErrorMessage(response.status))
      if (!payload) throw new Error(gatewayErrorMessage(response.status))
      setResult(payload)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible generar el CEO Intelligence Report.')
    } finally {
      setLoading(false)
    }
  }

  return <IntelligencePanel
    eyebrow="Reportin · CEO Intelligence"
    title="Informe ejecutivo para Pedro Pablo"
    description="Cruza gestión comercial, oficinas, funnel, KML de Vitacura, benchmark por micromercado y actividad de valorización. Se guarda como borrador y no se envía automáticamente."
  >
    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 text-xs text-[var(--n3-text-muted)]">
        <p>Salida: CEO snapshot · mapa KML · micromercados · conversión · oficinas · decisiones.</p>
        <p className="mt-1">Protección: N/D se conserva; Portal y CBRS mantienen su propio corte de referencia.</p>
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={() => void generate()}
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : <FileBarChart2 size={15} />}
        {loading ? 'Generando CEO Intelligence…' : 'Generar CEO Intelligence'}
      </button>
    </div>

    {result?.id ? <div role="status" className="border-t border-[var(--n3-line)] p-5 text-sm">
      <p className="font-medium text-[#65c780]">{result.reused ? 'Informe CEO existente recuperado.' : 'Borrador CEO Intelligence generado.'}</p>
      <p className="mt-2 break-words text-[var(--n3-text-muted)]">{result.title || 'CEO Intelligence Report'}</p>
      {result.sourceSnapshot ? <p className="mt-1 text-xs text-[var(--n3-text-muted)]">
        {result.sourceSnapshot.periodStart} – {result.sourceSnapshot.periodEnd} · corte {result.sourceSnapshot.sourceCutoff} · {result.sourceSnapshot.evidenceCount ?? 0} evidencias · {result.sourceSnapshot.kmlPolygonCount ?? 0} polígonos KML · {result.sourceSnapshot.marketRows ?? 0} benchmarks
      </p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/dashboard/reportes/canonicos" className="inline-flex min-h-11 items-center border border-[var(--n3-line)] px-4 py-2 text-sm">Revisar informe</Link>
        {result.artifactUrl ? <Link href={`${result.artifactUrl}?disposition=inline`} target="_blank" className="inline-flex min-h-11 items-center border border-[var(--n3-line)] px-4 py-2 text-sm">Abrir PDF</Link> : null}
      </div>
    </div> : null}

    {error ? <p role="alert" className="border-t border-[var(--n3-line)] p-5 text-sm text-[#ff766f]">{error}</p> : null}
  </IntelligencePanel>
}
