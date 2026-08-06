'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, FileText, Loader2, ShieldCheck } from 'lucide-react'

type SourceDocument = { id: string; title: string; excerpt: string; createdAt: string }
type GenerateResponse = { artifactUrl?: string; error?: string; code?: string }

export function ReportCreateForm({ sources }: { sources: SourceDocument[] }) {
  const today = new Date().toISOString().slice(0, 10)
  const [periodStart, setPeriodStart] = useState('2026-04-01')
  const [periodEnd, setPeriodEnd] = useState('2026-04-30')
  const [sourceCutoff, setSourceCutoff] = useState('2026-04-30')
  const [title, setTitle] = useState('Informe ejecutivo Property Partners — abril 2026')
  const [purpose, setPurpose] = useState('Consolidar el desempeño del período y sus principales decisiones ejecutivas.')
  const [selected, setSelected] = useState<string[]>([])
  const [state, setState] = useState<'idle' | 'generating' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [artifactUrl, setArtifactUrl] = useState<string | null>(null)

  const selectedSources = useMemo(() => sources.filter((source) => selected.includes(source.id)), [selected, sources])
  const fieldClass = 'mt-2 w-full bg-[#0c1111] px-4 py-3 text-sm text-[var(--n3-text-light)] outline-none ring-1 ring-[var(--n3-line)] transition focus:ring-[#d7332b]'

  function toggleSource(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  async function generateReport() {
    if (!title.trim() || !periodStart || !periodEnd || !sourceCutoff || selectedSources.length === 0) {
      setState('error')
      setMessage('Complete el período, el título y seleccione al menos una fuente canónica.')
      return
    }

    setState('generating')
    setMessage('Validando fuentes canónicas y generando el informe…')
    setArtifactUrl(null)

    try {
      const response = await fetch('/api/management/reports/canonical-client/simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          client: 'Property Partners Vitacura / PL Real Estate SpA',
          periodStart,
          periodEnd,
          sourceCutoff,
          purpose: purpose.trim(),
          audience: 'Cliente y contraparte ejecutiva',
          verifiedEvidence: selectedSources.map((source) => ({
            id: `knowledge:${source.id}`,
            claim: `${source.title}\n${source.excerpt}`,
            source: `knowledge_documents:${source.id}`,
          })),
        }),
      })
      const result = await response.json() as GenerateResponse
      if (!response.ok || !result.artifactUrl) throw new Error(result.error || result.code || 'No fue posible generar el informe.')
      setArtifactUrl(result.artifactUrl)
      setState('done')
      setMessage('Informe generado y persistido. Ya puede abrir el PDF.')
    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : 'No fue posible generar el informe.')
    }
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,0.78fr)_minmax(420px,1.22fr)]">
      <section className="space-y-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ff766f]">01 · Definir reporte</p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--n3-text-light)]">Período y propósito</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--n3-text-muted)]">El sistema redacta y compone. Las cifras y afirmaciones provienen únicamente de las fuentes seleccionadas.</p>
        </div>

        <label className="block"><span className="text-xs font-medium text-[var(--n3-text-light)]">Título</span><input value={title} onChange={(event) => setTitle(event.target.value)} className={fieldClass} /></label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block"><span className="text-xs font-medium text-[var(--n3-text-light)]">Desde</span><input type="date" value={periodStart} max={today} onChange={(event) => setPeriodStart(event.target.value)} className={fieldClass} /></label>
          <label className="block"><span className="text-xs font-medium text-[var(--n3-text-light)]">Hasta</span><input type="date" value={periodEnd} max={today} onChange={(event) => { setPeriodEnd(event.target.value); setSourceCutoff(event.target.value) }} className={fieldClass} /></label>
          <label className="block"><span className="text-xs font-medium text-[var(--n3-text-light)]">Corte</span><input type="date" value={sourceCutoff} max={today} onChange={(event) => setSourceCutoff(event.target.value)} className={fieldClass} /></label>
        </div>
        <label className="block"><span className="text-xs font-medium text-[var(--n3-text-light)]">Propósito</span><textarea value={purpose} onChange={(event) => setPurpose(event.target.value)} rows={4} className={`${fieldClass} resize-none leading-6`} /></label>

        <div className="border-l-2 border-[#d7332b] pl-4 text-xs leading-5 text-[var(--n3-text-muted)]">
          <p className="flex items-center gap-2 font-medium text-[var(--n3-text-light)]"><ShieldCheck size={14} /> Borrador interno</p>
          <p className="mt-1">No se registra como enviado ni pagado. Requiere revisión humana antes de distribución.</p>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-5">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ff766f]">02 · Seleccionar evidencia</p><h2 className="mt-2 text-xl font-semibold text-[var(--n3-text-light)]">Fuentes canónicas</h2></div>
          <p className="text-xs text-[var(--n3-text-muted)]">{selected.length} seleccionadas</p>
        </div>

        <div className="mt-5 max-h-[520px] space-y-2 overflow-y-auto pr-1">
          {sources.length === 0 ? <div className="bg-[#0c1111] p-5 text-sm text-[var(--n3-text-muted)] ring-1 ring-[var(--n3-line)]">No hay fuentes canónicas disponibles.</div> : sources.map((source) => {
            const active = selected.includes(source.id)
            return (
              <button key={source.id} type="button" onClick={() => toggleSource(source.id)} className={`w-full p-4 text-left transition ring-1 ${active ? 'bg-[#171111] ring-[#d7332b]' : 'bg-[#0c1111] ring-[var(--n3-line)] hover:ring-[#6f332f]'}`}>
                <div className="flex items-start gap-3">
                  {active ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#ff766f]" /> : <FileText size={18} className="mt-0.5 shrink-0 text-[var(--n3-text-muted)]" />}
                  <div className="min-w-0"><p className="text-sm font-medium text-[var(--n3-text-light)]">{source.title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--n3-text-muted)]">{source.excerpt}</p><p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{new Date(source.createdAt).toLocaleDateString('es-CL')}</p></div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-6 border-t border-[var(--n3-line)] pt-5">
          <button type="button" onClick={generateReport} disabled={state === 'generating' || selected.length === 0} className="flex w-full items-center justify-center gap-2 bg-[#d7332b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#bb2d27] disabled:cursor-not-allowed disabled:opacity-45">
            {state === 'generating' ? <Loader2 size={17} className="animate-spin" /> : <FileText size={17} />}{state === 'generating' ? 'Generando reporte…' : 'Generar reporte'}
          </button>
          {message ? <div className={`mt-4 p-4 text-sm ring-1 ${state === 'error' ? 'bg-[#1a0f0f] text-[#ffaaa5] ring-[#6f332f]' : 'bg-[#0c1111] text-[var(--n3-text-muted)] ring-[var(--n3-line)]'}`}><p>{message}</p>{artifactUrl ? <a href={artifactUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex font-semibold text-[#ff766f] hover:underline">Abrir PDF generado</a> : null}</div> : null}
        </div>
      </section>
    </div>
  )
}
