'use client'

import { useState } from 'react'

type CopilotResponse = {
  summary?: string
  signals?: Array<string | { title?: string; interpretation?: string }>
  evidence?: Array<string | { label?: string; value?: unknown; source?: string; domain?: string }>
  risks?: Array<string | { title?: string; detail?: string; severity?: string }>
  opportunities?: Array<string | { title?: string; detail?: string; action?: string }>
  actions?: Array<string | { title?: string; rationale?: string; action?: string }>
  confidence?: string
  sources?: string[]
}

function itemText(item: unknown) {
  if (typeof item === 'string') return item
  if (!item || typeof item !== 'object') return ''
  const record = item as Record<string, unknown>
  return [record.title, record.label, record.interpretation, record.detail, record.action, record.value]
    .filter(Boolean)
    .join(' — ')
}

export function CEOAIAssistantWidget() {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [response, setResponse] = useState<CopilotResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedbackSent, setFeedbackSent] = useState(false)

  async function ask() {
    if (!question.trim() || loading) return
    setLoading(true)
    setError('')
    setResponse(null)
    setFeedbackSent(false)

    try {
      const request = await fetch('/api/ceo/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
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
    const sources = response.sources ?? response.evidence?.map((item) => {
      if (typeof item === 'string') return item
      return item.source ?? item.label ?? ''
    }).filter(Boolean) ?? []

    const request = await fetch('/api/ceo/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        answerSummary: response.summary ?? '',
        rating,
        sources,
      }),
    })

    if (request.ok) setFeedbackSent(true)
  }

  const opportunities = response?.opportunities ?? response?.actions ?? []

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-8 sm:right-8">
      {open && (
        <div className="mb-4 max-h-[75vh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto rounded-3xl border border-orange-900/50 bg-black/95 p-5 text-white shadow-2xl backdrop-blur-xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-orange-400">⌂</span>
              <div>
                <h3 className="text-sm tracking-[0.2em] text-orange-400">N3URALIA</h3>
                <p className="text-lg">Copiloto estratégico CEO</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Cerrar N3uralia" className="text-neutral-400 hover:text-white">×</button>
          </div>

          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="¿Qué debo saber hoy?"
            rows={3}
            className="w-full resize-none rounded-xl border border-neutral-700 bg-neutral-950 p-3 text-sm outline-none focus:border-orange-700"
          />

          <button
            onClick={ask}
            disabled={loading || !question.trim()}
            className="mt-3 w-full rounded-xl bg-orange-800 px-4 py-3 text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Analizando evidencia...' : 'Consultar N3uralia'}
          </button>

          {error && <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-200">{error}</div>}

          {response && (
            <div className="mt-5 space-y-4 text-sm">
              <section className="rounded-xl border border-neutral-800 p-3">
                <p className="mb-2 text-xs uppercase tracking-[0.16em] text-orange-400">Resumen ejecutivo</p>
                <p className="leading-6 text-neutral-100">{response.summary ?? 'Sin resumen disponible.'}</p>
              </section>

              {response.signals?.length ? <section>
                <p className="mb-2 text-xs uppercase tracking-[0.16em] text-amber-300">Señales principales</p>
                <div className="space-y-2">{response.signals.map((item, index) => <div key={index} className="rounded-xl border border-amber-900/40 bg-amber-950/15 p-3">{itemText(item)}</div>)}</div>
              </section> : null}

              {response.evidence?.length ? <section>
                <p className="mb-2 text-xs uppercase tracking-[0.16em] text-sky-300">Evidencia</p>
                <div className="space-y-2">{response.evidence.map((item, index) => <div key={index} className="rounded-xl border border-sky-900/40 bg-sky-950/15 p-3">{itemText(item)}</div>)}</div>
              </section> : null}

              {response.risks?.length ? <section>
                <p className="mb-2 text-xs uppercase tracking-[0.16em] text-red-300">Riesgos</p>
                <div className="space-y-2">{response.risks.map((item, index) => <div key={index} className="rounded-xl border border-red-900/40 bg-red-950/15 p-3">{itemText(item)}</div>)}</div>
              </section> : null}

              {opportunities.length ? <section>
                <p className="mb-2 text-xs uppercase tracking-[0.16em] text-emerald-300">Oportunidades y acciones</p>
                <div className="space-y-2">{opportunities.map((item, index) => <div key={index} className="rounded-xl border border-emerald-900/40 bg-emerald-950/15 p-3">{itemText(item)}</div>)}</div>
              </section> : null}

              {response.confidence && <div className="rounded-xl border border-neutral-800 p-3"><span className="text-neutral-400">Nivel de confianza: </span><span className="font-medium text-white">{response.confidence}</span></div>}

              <div className="flex items-center justify-between border-t border-neutral-800 pt-3">
                <span className="text-xs text-neutral-500">¿Fue útil esta respuesta?</span>
                {feedbackSent ? <span className="text-xs text-emerald-300">Feedback guardado</span> : <div className="flex gap-2"><button onClick={() => sendFeedback('up')} className="rounded-lg border border-neutral-700 px-3 py-1.5 hover:border-emerald-600" aria-label="Respuesta útil">👍</button><button onClick={() => sendFeedback('down')} className="rounded-lg border border-neutral-700 px-3 py-1.5 hover:border-red-600" aria-label="Respuesta no útil">👎</button></div>}
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        aria-label="Abrir N3uralia"
        className="flex h-16 w-16 items-center justify-center rounded-3xl border border-orange-700 bg-black text-3xl text-orange-400 shadow-2xl sm:h-20 sm:w-20"
      >
        ⌂
      </button>
    </div>
  )
}
