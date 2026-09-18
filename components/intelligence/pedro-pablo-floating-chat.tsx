'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { ArrowUpRight, Bot, ChevronDown, Send, ShieldCheck, Sparkles, X } from 'lucide-react'

type AssistantResponse = {
  title: string
  answer: string
  confidence: 'high' | 'medium'
  evidence?: Array<{ label: string; source: string }>
  routing?: {
    route: 'fast-track' | 'full-agentic'
    domains: string[]
    reason: string
  }
}

const starters = [
  '¿Qué requiere mi atención hoy?',
  '¿Cómo están las valorizaciones?',
  '¿Qué propiedades necesitan revisión?',
]

export function PedroPabloFloatingChat() {
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState<AssistantResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function ask(value: string) {
    const query = value.trim()
    if (!query || loading) return

    setLoading(true)
    setError(null)

    try {
      const result = await fetch('/api/pedro-pablo/decision-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query }),
      })
      const payload = await result.json()
      if (!result.ok) throw new Error(payload.error || 'No fue posible consultar Pedro Pablo.')
      setResponse(payload as AssistantResponse)
      setPrompt('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible consultar Pedro Pablo.')
    } finally {
      setLoading(false)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void ask(prompt)
  }

  return (
    <>
      {open ? (
        <section
          aria-label="Asistente Pedro Pablo"
          className="fixed inset-x-3 bottom-3 z-[70] flex max-h-[78vh] flex-col overflow-hidden border border-[var(--n3-line)] bg-[var(--n3-black)] shadow-2xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[390px]"
        >
          <header className="flex items-start justify-between gap-4 border-b border-[var(--n3-line)] px-4 py-3">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--n3-teal-soft)]">
                <Sparkles size={13} aria-hidden="true" />
                Asistente ejecutivo
              </div>
              <div className="mt-1 text-base font-semibold text-[var(--n3-text-light)]">Pedro Pablo</div>
              <div className="mt-1 text-[11px] leading-4 text-[var(--n3-text-muted)]">
                Evidencia autorizada, priorización y siguientes acciones.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar asistente"
              className="grid h-9 w-9 place-items-center border border-[var(--n3-line)] text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {!response && !loading && !error ? (
              <div className="space-y-4">
                <p className="text-sm leading-6 text-[var(--n3-text-light)]">
                  Pregunta por prioridades, cartera, tareas, valorizaciones, reportes o desempeño.
                </p>
                <div className="grid gap-2">
                  {starters.map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      onClick={() => void ask(starter)}
                      className="min-h-11 border border-[var(--n3-line)] px-3 py-2 text-left text-xs leading-5 text-[var(--n3-text-light)] hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {loading ? (
              <div className="py-12 text-center text-sm text-[var(--n3-text-muted)]" role="status">
                Componiendo evidencia autorizada…
              </div>
            ) : null}

            {error ? (
              <div className="border-l-2 border-[var(--destructive)] pl-3 text-sm leading-6 text-[var(--destructive)]" role="alert">
                {error}
              </div>
            ) : null}

            {response && !loading ? (
              <article>
                <div className="flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">
                  <span>{response.confidence === 'high' ? 'Confianza alta' : 'Confianza media'}</span>
                  {response.routing ? (
                    <>
                      <span aria-hidden="true">/</span>
                      <span>{response.routing.route === 'full-agentic' ? 'FullAgentic' : 'FastTrack'}</span>
                    </>
                  ) : null}
                </div>
                <h2 className="mt-3 text-base font-semibold text-[var(--n3-text-light)]">{response.title}</h2>
                <div className="mt-3 whitespace-pre-line text-sm leading-6 text-[var(--n3-text-light)]">{response.answer}</div>

                {response.evidence?.length ? (
                  <div className="mt-4 border-t border-[var(--n3-line)] pt-3">
                    <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Evidencia</div>
                    <div className="space-y-2">
                      {response.evidence.slice(0, 3).map((item, index) => (
                        <div key={`${item.label}-${index}`} className="text-[11px] leading-4 text-[var(--n3-text-muted)]">
                          <span className="text-[var(--n3-text-light)]">{item.label}</span> · {item.source}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            ) : null}
          </div>

          <form onSubmit={submit} className="border-t border-[var(--n3-line)] p-3">
            <label htmlFor="pedro-pablo-floating-query" className="sr-only">Pregunta a Pedro Pablo</label>
            <div className="flex gap-2">
              <textarea
                id="pedro-pablo-floating-query"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={2}
                maxLength={800}
                placeholder="Pregunta a Pedro Pablo…"
                className="min-h-12 flex-1 resize-none border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 py-2 text-sm text-[var(--n3-text-light)] outline-none placeholder:text-[var(--n3-text-muted)] focus:border-[var(--primary)]"
              />
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                aria-label="Enviar consulta"
                className="grid w-12 place-items-center border border-[var(--primary)] text-[var(--n3-text-light)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]"
              >
                <Send size={16} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">
                <ShieldCheck size={12} aria-hidden="true" />
                Escrituras con confirmación
              </div>
              <Link
                href="/dashboard/pedro-pablo"
                className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-teal-soft)]"
              >
                Abrir completo <ArrowUpRight size={12} aria-hidden="true" />
              </Link>
            </div>
          </form>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir asistente Pedro Pablo"
          className="fixed bottom-4 right-4 z-[70] flex min-h-12 items-center gap-2 border border-[var(--primary)] bg-[var(--n3-black)] px-4 text-sm font-semibold text-[var(--n3-text-light)] shadow-xl hover:bg-[var(--n3-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)] sm:bottom-5 sm:right-5"
        >
          <Bot size={17} aria-hidden="true" />
          Pedro Pablo
          <ChevronDown size={14} className="rotate-180" aria-hidden="true" />
        </button>
      )}
    </>
  )
}
