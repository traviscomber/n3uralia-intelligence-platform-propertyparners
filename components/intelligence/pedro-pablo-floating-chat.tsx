'use client'

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bot, RotateCcw, Send, X } from 'lucide-react'

type Evidence = {
  label: string
  source: string
  reference?: string | null
  cutoff?: string | null
  domain?: string
}

type AssistantResponse = {
  title: string
  answer: string
  confidence: 'high' | 'medium'
  evidence?: Evidence[]
  routing?: {
    route: 'fast-track' | 'full-agentic'
    domains: string[]
    reason: string
  }
  suggestedQuestions?: string[]
}

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  title?: string
  confidence?: 'high' | 'medium'
  evidence?: Evidence[]
  routing?: AssistantResponse['routing']
  suggestedQuestions?: string[]
}

const starterSections = [
  {
    label: 'Mercado Vitacura',
    prompts: [
      '¿Qué está cambiando en el mercado de Vitacura?',
      '¿Qué microzona merece revisión?',
    ],
  },
  {
    label: 'Valorizaciones',
    prompts: [
      '¿Qué valorizaciones requieren atención?',
      '¿Qué comparables sostienen mejor una valorización?',
    ],
  },
  {
    label: 'Propiedades y antecedentes',
    prompts: [
      '¿Qué propiedades tienen brechas de evidencia?',
      '¿Qué antecedente falta verificar?',
    ],
  },
  {
    label: 'Gestión y reportes',
    prompts: [
      '¿Qué requiere atención hoy?',
      '¿Qué entrega o reporte requiere revisión?',
    ],
  },
] as const

export function PedroPabloFloatingChat({ role, team }: { role: string | null; team: string | null }) {
  const pathname = usePathname()
  const isDirectorSupport = role === 'director' || role === 'subdirector'
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const valuationCaseId = useMemo(() => pathname.match(/^\/dashboard\/valuations\/([^/]+)/)?.[1] ?? null, [pathname])
  const contextualStarterSections = useMemo(() => {
    if (valuationCaseId) {
      return isDirectorSupport ? [
        {
          label: 'Esta valorización',
          prompts: [
            '¿Qué debo validar antes de aceptar este expediente?',
            '¿Qué comparables requieren más atención?',
          ],
        },
        {
          label: 'Apoyo de dirección',
          prompts: [
            '¿Hay una razón objetiva para devolver esta valorización?',
            '¿Qué evidencia respalda el valor propuesto?',
          ],
        },
      ] as const : [
        {
          label: 'Esta valorización',
          prompts: [
            '¿Por qué este valor es defendible?',
            '¿Qué comparables sostienen mejor este valor?',
          ],
        },
        {
          label: 'Antes de enviar',
          prompts: [
            '¿Qué debo revisar antes de enviarla a dirección?',
            '¿Hay alguna alerta importante en este expediente?',
          ],
        },
      ] as const
    }

    if (isDirectorSupport) {
      return [
        {
          label: 'Valorizaciones de mi oficina',
          prompts: [
            '¿Qué valorizaciones requieren mi atención?',
            '¿Qué expedientes tienen evidencia débil o alertas?',
          ],
        },
        {
          label: 'Partners y seguimiento',
          prompts: [
            '¿Qué tareas o devoluciones están pendientes?',
            '¿Qué requiere atención hoy en mi oficina?',
          ],
        },
      ] as const
    }

    return starterSections
  }, [valuationCaseId, isDirectorSupport])

  useEffect(() => {
    if (!open) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [open, messages, loading])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  async function ask(value: string) {
    const query = value.trim()
    if (!query || loading) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
    }

    setMessages((current) => [...current, userMessage])
    setPrompt('')
    setLoading(true)
    setError(null)

    try {
      const result = await fetch('/api/pedro-pablo/decision-support', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          pageContext: {
            pathname,
            valuationCaseId,
          },
        }),
      })
      const payload = await result.json()
      if (!result.ok) throw new Error(payload.error || 'No fue posible consultar Asistente de IA.')

      const response = payload as AssistantResponse
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        title: response.title,
        confidence: response.confidence,
        evidence: response.evidence,
        routing: response.routing,
        suggestedQuestions: response.suggestedQuestions,
      }

      setMessages((current) => [...current, assistantMessage])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible consultar Asistente de IA.')
    } finally {
      setLoading(false)
    }
  }

  function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    void ask(prompt)
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void ask(prompt)
    }
  }

  function resetConversation() {
    if (loading) return
    setMessages([])
    setPrompt('')
    setError(null)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir Asistente de IA"
        title="Asistente de IA"
        className={`fixed bottom-5 right-4 z-[70] grid h-16 w-16 place-items-center border border-[var(--primary)] bg-[var(--n3-black)] text-[var(--n3-text-light)] transition-colors hover:bg-[var(--n3-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)] md:right-6 ${open ? 'pointer-events-none opacity-0' : ''}`}
      >
        <Bot size={27} aria-hidden="true" />
      </button>

      {open ? (
        <section
          aria-label="Asistente de IA"
          className="fixed inset-x-3 bottom-3 z-[70] flex h-[min(720px,calc(100vh-1.5rem))] flex-col overflow-hidden border border-[var(--n3-line)] bg-[var(--n3-black)] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[min(460px,calc(100vw-2rem))]"
        >
          <header className="border-b border-[var(--n3-line)] bg-[var(--n3-deep)] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center border border-[var(--primary)] bg-[var(--n3-black)]">
                  <Bot size={20} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-teal-soft)]">
                    Apoyo para la decisión
                  </div>
                  <div className="mt-0.5 truncate text-sm font-semibold text-[var(--n3-text-light)]">{isDirectorSupport ? 'Asistente de Dirección' : 'Pedro Pablo'}</div>
                  {team ? <div className="truncate text-[11px] text-[var(--n3-text-muted)]">{team}</div> : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={resetConversation}
                  disabled={loading || messages.length === 0}
                  aria-label="Nueva conversación"
                  title="Nueva conversación"
                  className="grid h-9 w-9 place-items-center text-[var(--n3-text-muted)] transition-colors hover:bg-white/[0.04] hover:text-[var(--n3-text-light)] disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]"
                >
                  <RotateCcw size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar asistente"
                  className="grid h-9 w-9 place-items-center text-[var(--n3-text-muted)] transition-colors hover:bg-white/[0.04] hover:text-[var(--n3-text-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--n3-black)] px-4 py-4">
            {messages.length === 0 && !loading ? (
              <div className="space-y-4">
                <div className="text-sm font-medium text-[var(--n3-text-light)]">¿Qué quieres revisar?</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {contextualStarterSections.map((section) => (
                    <div key={section.label} className="border border-[var(--n3-line)] p-3">
                      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">
                        {section.label}
                      </div>
                      <div className="space-y-1.5">
                        {section.prompts.map((question) => (
                          <button
                            key={question}
                            type="button"
                            onClick={() => setPrompt(question)}
                            className="block w-full px-2 py-1.5 text-left text-[11px] leading-4 text-[var(--n3-text-light)] transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((message) => (
                  <article key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[92%] px-3.5 py-3 text-sm leading-6 ${message.role === 'user' ? 'bg-[var(--primary)] text-[var(--n3-text-light)]' : 'border border-[var(--n3-line)] bg-[var(--n3-deep)] text-[var(--n3-text-light)]'}`}>
                      {message.role === 'assistant' && message.confidence === 'medium' ? (
                        <div className="mb-2 text-[9px] uppercase tracking-[0.12em] text-[var(--chart-4)]">Confianza media</div>
                      ) : null}
                      {message.role === 'assistant' && message.title ? <div className="mb-1 font-semibold">{message.title}</div> : null}
                      <div className="whitespace-pre-wrap break-words">{message.content}</div>
                      {message.role === 'assistant' && message.evidence?.length ? (
                        <details className="mt-3 border-t border-[var(--n3-line)] pt-2">
                          <summary className="cursor-pointer text-[10px] text-[var(--n3-text-muted)]">Ver fuentes</summary>
                          <div className="mt-2 space-y-1">
                            {message.evidence.slice(0, 3).map((item, index) => (
                              <div key={`${message.id}-evidence-${index}`} className="text-[10px] leading-4 text-[var(--n3-text-muted)]">
                                <span className="text-[var(--n3-text-light)]">{item.label}</span> · {item.source}
                              </div>
                            ))}
                          </div>
                        </details>
                      ) : null}
                      {message.role === 'assistant' && message.suggestedQuestions?.length ? (
                        <div className="mt-3 space-y-1.5 border-t border-[var(--n3-line)] pt-2">
                          <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Siguiente</div>
                          {message.suggestedQuestions.map((question) => (
                            <button
                              key={question}
                              type="button"
                              onClick={() => void ask(question)}
                              className="block w-full border border-[var(--n3-line)] px-2.5 py-2 text-left text-[11px] leading-4 text-[var(--n3-text-light)] transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]"
                            >
                              {question}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
                {loading ? (
                  <div className="flex justify-start">
                    <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3.5 py-3 text-sm text-[var(--n3-text-muted)]">
                      Revisando información…
                    </div>
                  </div>
                ) : null}
                <div ref={bottomRef} />
              </div>
            ) : null}

            {error ? (
              <div className="mt-3 border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 px-3 py-2 text-xs text-[var(--destructive)]" role="alert">
                {error}
              </div>
            ) : null}
          </div>

          <footer className="border-t border-[var(--n3-line)] bg-[var(--n3-black)] p-3">
            <form onSubmit={submit} className="flex items-end gap-2">
              <textarea
                id="pedro-pablo-floating-query"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={onComposerKeyDown}
                rows={2}
                maxLength={800}
                placeholder="Pregunta sobre tu oficina o un expediente…"
                className="min-h-[54px] max-h-36 flex-1 resize-none border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 py-2 text-sm text-[var(--n3-text-light)] outline-none placeholder:text-[var(--n3-text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]"
              />
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                aria-label="Enviar consulta"
                className="grid h-[54px] w-[54px] place-items-center border border-[var(--primary)] text-[var(--n3-text-light)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]"
              >
                <Send size={17} aria-hidden="true" />
              </button>
            </form>
          </footer>
        </section>
      ) : null}
    </>
  )
}
