'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Download, Loader2, Play, RefreshCw, XCircle } from 'lucide-react'

type GenerationResponse = {
  id: string
  artifactUrl: string
  createdAt: string
  timing?: { totalMs?: number }
}

type Phase = 'idle' | 'preparing' | 'generating' | 'completed' | 'failed'

const phaseCopy: Record<Phase, { title: string; detail: string }> = {
  idle: {
    title: 'Listo para generar',
    detail: 'Se utilizará el período completo disponible: 01.01.2026 al 31.07.2026.',
  },
  preparing: {
    title: 'Preparando paquete canónico',
    detail: 'Validando período, corte y fuentes disponibles antes de llamar al modelo.',
  },
  generating: {
    title: 'Generando informe con GPT-5.6 y Reportin',
    detail: 'El servidor está analizando la evidencia, validando la salida y componiendo el PDF. Puede tardar varios minutos.',
  },
  completed: {
    title: 'Informe generado',
    detail: 'La copia canónica fue persistida y el PDF está disponible para descarga.',
  },
  failed: {
    title: 'La generación falló',
    detail: 'No se creó un informe parcial. Revise el mensaje y vuelva a ejecutar cuando el origen esté corregido.',
  },
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

export function CanonicalReportGenerator() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<GenerationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const running = phase === 'preparing' || phase === 'generating'

  useEffect(() => {
    if (!running) return
    const startedAt = Date.now()
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000)
    return () => window.clearInterval(timer)
  }, [running])

  const status = useMemo(() => phaseCopy[phase], [phase])

  async function generate() {
    setResult(null)
    setError(null)
    setElapsed(0)
    setPhase('preparing')

    await new Promise((resolve) => window.setTimeout(resolve, 300))
    setPhase('generating')

    try {
      const response = await fetch('/api/management/reports/canonical-client/full-period', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodStart: '2026-01-01', periodEnd: '2026-07-31', sourceCutoff: '2026-07-31' }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'No fue posible generar el informe canónico.')
      setResult(payload as GenerationResponse)
      setPhase('completed')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible generar el informe canónico.')
      setPhase('failed')
    }
  }

  return (
    <section className="border border-[var(--n3-line)] bg-[#0c1111]">
      <div className="grid gap-px bg-[var(--n3-line)] lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="bg-[#0c1111] p-6 sm:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ff766f]">Generación canónica</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-[var(--n3-text-light)]">Nuevo informe · período completo</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">
            Genera una nueva versión usando únicamente fuentes canónicas registradas, GPT-5.6 y el renderer editorial Reportin 1.1. La generación se ejecuta como borrador y no altera datos operacionales.
          </p>

          <div className="mt-6 grid gap-px bg-[var(--n3-line)] sm:grid-cols-3">
            {[
              ['Inicio', '01.01.2026'],
              ['Cierre', '31.07.2026'],
              ['Corte de fuentes', '31.07.2026'],
            ].map(([label, value]) => (
              <div key={label} className="bg-[#080d0d] p-4">
                <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{label}</p>
                <p className="mt-2 text-sm font-medium text-[var(--n3-text-light)]">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={generate}
              disabled={running}
              className="inline-flex min-h-11 items-center gap-2 bg-[#d7332b] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#ef4b43] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running ? <Loader2 size={16} className="animate-spin" /> : phase === 'failed' ? <RefreshCw size={16} /> : <Play size={16} />}
              {running ? 'Generando informe' : phase === 'failed' ? 'Reintentar generación' : 'Generar nuevo informe'}
            </button>

            {result ? (
              <a
                href={result.artifactUrl}
                className="inline-flex min-h-11 items-center gap-2 border border-[var(--n3-line)] bg-[#080d0d] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--n3-text-light)] hover:border-[#d7332b]"
              >
                <Download size={16} /> Descargar PDF
              </a>
            ) : null}
          </div>
        </div>

        <aside className="bg-[#080d0d] p-6">
          <div className="flex items-start gap-3">
            {phase === 'completed' ? <CheckCircle2 size={20} className="mt-0.5 text-[#65d3a5]" /> : phase === 'failed' ? <XCircle size={20} className="mt-0.5 text-[#ff766f]" /> : running ? <Loader2 size={20} className="mt-0.5 animate-spin text-[#ff766f]" /> : <Play size={20} className="mt-0.5 text-[#ff766f]" />}
            <div>
              <p className="text-sm font-semibold text-[var(--n3-text-light)]">{status.title}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">{status.detail}</p>
            </div>
          </div>

          <div className="mt-6 border-t border-[var(--n3-line)] pt-5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Tiempo transcurrido</p>
            <p className="mt-2 font-mono text-2xl text-[var(--n3-text-light)]">{formatElapsed(elapsed)}</p>
          </div>

          {error ? <p className="mt-5 border-l-2 border-[#ff766f] pl-3 text-xs leading-5 text-[#ff9b95]">{error}</p> : null}
          {result?.timing?.totalMs ? <p className="mt-5 text-xs text-[var(--n3-text-muted)]">Tiempo total servidor: {(result.timing.totalMs / 1000).toFixed(1)} s</p> : null}
        </aside>
      </div>
    </section>
  )
}
