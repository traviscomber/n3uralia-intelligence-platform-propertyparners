'use client'

import { useState } from 'react'

type CopilotResponse = {
  summary?: string
  signals?: Array<string | { title?: string; interpretation?: string; detail?: string }>
  evidence?: Array<string | { label?: string; value?: unknown; source?: string; domain?: string }>
  risks?: Array<string | { title?: string; detail?: string; severity?: string }>
  opportunities?: Array<string | { title?: string; detail?: string; action?: string }>
  actions?: Array<string | { title?: string; rationale?: string; action?: string }>
  confidence?: string
  sources?: string[]
  reasoningMode?: string
}

function N3uraliaMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className} fill="none">
      <path d="M9 23.5 24 10l15 13.5v14A2.5 2.5 0 0 1 36.5 40h-25A2.5 2.5 0 0 1 9 37.5v-14Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M17 39V27.5h14V39" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M18.5 22.5c2.2-2.8 8.8-2.8 11 0M20.5 26c1.4-1.7 5.6-1.7 7 0M23 29.5c.5-.6 1.5-.6 2 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="24" cy="32.5" r="1.5" fill="currentColor" />
    </svg>
  )
}

function itemText(item: unknown) {
  if (typeof item === 'string') return item
  if (!item || typeof item !== 'object') return ''
  const record = item as Record<string, unknown>
  return [record.title, record.label, record.interpretation, record.detail, record.action, record.value]
    .filter((value) => value !== null && value !== undefined && value !== '')
    .join(' — ')
}

export function CEOAIAssistantWidget() {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [response, setResponse] = useState<CopilotResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')

  async function ask() {
    if (!question.trim() || loading) return
    setLoading(true)
    setError('')
    setFeedbackError('')
    setResponse(null)
    setFeedbackSent(false)

    try {
      const request = await fetch('/api/ceo/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim() }),
      })
      const data = await request.json()
      if (!request.ok) throw new Error(data.error ?? 'No fue posible consultar N3uralia')
      setResponse(data)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible consultar N3uralia')
    } finally {
      setLoading(false)
    }
  }

  async function sendFeedback(rating: 'up' | 'down') {
    if (!response || feedbackSent) return
    setFeedbackError('')

    const sources = response.sources ?? response.evidence?.map((item) => {
      if (typeof item === 'string') return item
      return item.source ?? item.label ?? ''
    }).filter(Boolean) ?? []

    try {
      const request = await fetch('/api/ceo/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          answerSummary: response.summary ?? '',
          rating,
          sources,
        }),
      })

      if (!request.ok) {
        const data = await request.json().catch(() => ({}))
        throw new Error(data.error ?? 'No fue posible guardar el feedback')
      }

      setFeedbackSent(true)
    } catch (caught) {
      setFeedbackError(caught instanceof Error ? caught.message : 'No fue posible guardar el feedback')
    }
  }

  const opportunities = response?.opportunities ?? response?.actions ?? []

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      {open && (
        <div className="mb-3 max-h-[78vh] w-[calc(100vw-2rem)] max-w-[420px] overflow-y-auto rounded-2xl border border-[#8f3f24]/45 bg-[#090909]/97 p-4 text-white shadow-[0_24px_70px_rgba(0,0,0,0.58)] backdrop-blur-xl sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#a84b2b]/55 bg-[#17110f] text-[#c9633d]">
                <N3uraliaMark className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xs font-medium tracking-[0.22em] text-[#c9633d]">N3URALIA</h3>
                <p className="mt-0.5 text-base font-medium text-neutral-100">Copiloto estratégico CEO</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Cerrar N3uralia" className="rounded-lg px-2 py-1 text-neutral-500 transition hover:bg-white/5 hover:text-white">×</button>
          </div>

          <label htmlFor="ceo-copilot-question" className="sr-only">Pregunta para N3uralia</label>
          <textarea
            id="ceo-copilot-question"
            name="ceoCopilotQuestion"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') ask()
            }}
            placeholder="¿Qué debo saber hoy?"
            rows={3}
            maxLength={2000}
            className="w-full resize-none rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-sm leading-6 text-neutral-100 outline-none transition placeholder:text-neutral-600 focus:border-[#8f3f24]"
          />

          <button
            onClick={ask}
            disabled={loading || !question.trim()}
            className="mt-3 w-full rounded-xl bg-[#8f3f24] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#a94b2b] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {loading ? 'Analizando evidencia...' : 'Consultar N3uralia'}
          </button>

          {error && <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/25 p-3 text-sm text-red-200">{error}</div>}

          {response && (
            <div className="mt-5 space-y-4 text-sm">
              <section className="rounded-xl border border-neutral-800 bg-white/[0.02] p-3.5">
                <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-[#c9633d]">Resumen ejecutivo</p>
                <p className="leading-6 text-neutral-100">{response.summary ?? 'Sin resumen disponible.'}</p>
              </section>

              {response.signals?.length ? <section>
                <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-amber-300">Señales principales</p>
                <div className="space-y-2">{response.signals.map((item, index) => <div key={index} className="rounded-xl border border-amber-900/35 bg-amber-950/10 p-3 leading-6">{itemText(item)}</div>)}</div>
              </section> : null}

              {response.evidence?.length ? <section>
                <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-sky-300">Evidencia</p>
                <div className="space-y-2">{response.evidence.map((item, index) => <div key={index} className="rounded-xl border border-sky-900/35 bg-sky-950/10 p-3 leading-6">{itemText(item)}</div>)}</div>
              </section> : null}

              {response.risks?.length ? <section>
                <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-red-300">Riesgos</p>
                <div className="space-y-2">{response.risks.map((item, index) => <div key={index} className="rounded-xl border border-red-900/35 bg-red-950/10 p-3 leading-6">{itemText(item)}</div>)}</div>
              </section> : null}

              {opportunities.length ? <section>
                <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-emerald-300">Oportunidades y acciones</p>
                <div className="space-y-2">{opportunities.map((item, index) => <div key={index} className="rounded-xl border border-emerald-900/35 bg-emerald-950/10 p-3 leading-6">{itemText(item)}</div>)}</div>
              </section> : null}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-neutral-800 px-3 py-2.5 text-xs">
                {response.confidence && <span><span className="text-neutral-500">Confianza: </span><span className="font-medium text-white">{response.confidence}</span></span>}
                {response.reasoningMode && <span><span className="text-neutral-500">Profundidad: </span><span className="font-medium text-white">{response.reasoningMode}</span></span>}
              </div>

              <div className="border-t border-neutral-800 pt-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-neutral-500">¿Fue útil esta respuesta?</span>
                  {feedbackSent ? <span className="text-xs text-emerald-300">Feedback guardado</span> : <div className="flex gap-2"><button onClick={() => sendFeedback('up')} className="rounded-lg border border-neutral-700 px-3 py-1.5 transition hover:border-emerald-700 hover:bg-emerald-950/20" aria-label="Respuesta útil">↑</button><button onClick={() => sendFeedback('down')} className="rounded-lg border border-neutral-700 px-3 py-1.5 transition hover:border-red-700 hover:bg-red-950/20" aria-label="Respuesta no útil">↓</button></div>}
                </div>
                {feedbackError && <p className="mt-2 text-xs text-red-300">{feedbackError}</p>}
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Cerrar N3uralia' : 'Abrir N3uralia'}
        aria-expanded={open}
        className="group flex h-13 w-13 items-center justify-center rounded-2xl border border-[#8f3f24]/60 bg-[#0b0b0b] text-[#c9633d] shadow-[0_12px_35px_rgba(0,0,0,0.48)] transition hover:-translate-y-0.5 hover:border-[#b65332] hover:bg-[#14100e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a84b2b]/70 sm:h-14 sm:w-14"
      >
        <N3uraliaMark className="h-7 w-7 transition-transform group-hover:scale-105" />
      </button>
    </div>
  )
}
