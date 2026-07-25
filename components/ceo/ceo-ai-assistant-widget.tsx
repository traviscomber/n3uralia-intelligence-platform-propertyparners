'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'

type EvidenceItem = {
  label?: string
  value?: unknown
  source?: string
  domain?: string
}

type ActionItem = {
  title?: string
  detail?: string
  rationale?: string
  action?: string
  domain?: string
  href?: string
}

type CopilotResponse = {
  summary?: string
  signals?: Array<string | { title?: string; interpretation?: string; detail?: string }>
  evidence?: Array<string | EvidenceItem>
  risks?: Array<string | { title?: string; detail?: string; severity?: string }>
  opportunities?: Array<string | ActionItem>
  actions?: Array<string | ActionItem>
  confidence?: string
  confidenceReason?: string
  sources?: string[]
  reasoningMode?: string
  generatedAt?: string
}

type ConversationMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  response?: CopilotResponse
  createdAt: string
}

const STORAGE_KEY = 'n3uralia-ceo-conversation-v2'

const SUGGESTED_PROMPTS = [
  '¿Qué debo saber hoy?',
  '¿Dónde está el mayor riesgo?',
  '¿Cómo estamos frente a la meta?',
  '¿Qué sabemos realmente del mercado?',
  '¿Qué decisión requiere mi atención?',
]

const DOMAIN_LINKS: Record<string, string> = {
  crm: '/dashboard/datos-crm',
  executive: '/dashboard/ceo',
  market: '/dashboard/market',
  valuation: '/dashboard/valorizador',
  reports: '/dashboard/reportes/autonomos',
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
  return [record.title, record.label, record.interpretation, record.detail, record.rationale, record.action, record.value]
    .filter((value) => value !== null && value !== undefined && value !== '')
    .join(' — ')
}

function uniqueSources(response: CopilotResponse) {
  const evidenceSources = response.evidence?.flatMap((item) => {
    if (typeof item === 'string') return []
    return item.source ? [item.source] : []
  }) ?? []

  return [...new Set([...(response.sources ?? []), ...evidenceSources].filter(Boolean))]
}

function domainHref(item: unknown) {
  if (!item || typeof item !== 'object') return null
  const record = item as ActionItem
  return record.href || (record.domain ? DOMAIN_LINKS[record.domain] : null) || null
}

function confidenceExplanation(response: CopilotResponse) {
  if (response.confidenceReason) return response.confidenceReason
  const marketEvidence = response.evidence?.some((item) => typeof item !== 'string' && item.domain === 'market')
  if (response.confidence === 'alta') return 'La respuesta cuenta con evidencia suficiente y fuentes identificables para las conclusiones principales.'
  if (response.confidence === 'baja') return 'La evidencia disponible es incompleta o no permite validar cuantitativamente las conclusiones principales.'
  return marketEvidence
    ? 'La evidencia interna es consistente, pero algunas conclusiones externas todavía dependen de cobertura parcial o datos no agregados.'
    : 'La evidencia interna es consistente, pero faltan fuentes complementarias para elevar la certeza.'
}

function LoadingDots() {
  return (
    <span className="ml-1 inline-flex items-center gap-1" aria-hidden="true">
      <span className="h-1 w-1 animate-bounce rounded-full bg-[#d37755] [animation-delay:-0.3s]" />
      <span className="h-1 w-1 animate-bounce rounded-full bg-[#d37755] [animation-delay:-0.15s]" />
      <span className="h-1 w-1 animate-bounce rounded-full bg-[#d37755]" />
    </span>
  )
}

export function CEOAIAssistantWidget() {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedbackState, setFeedbackState] = useState<Record<string, 'idle' | 'detail' | 'sent'>>({})
  const [feedbackError, setFeedbackError] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const launcherRef = useRef<HTMLButtonElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) setMessages(JSON.parse(stored))
    } catch {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-20)))
  }, [messages])

  useEffect(() => {
    if (open) {
      window.setTimeout(() => textareaRef.current?.focus(), 80)
    } else {
      launcherRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && open) setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  const latestAssistant = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'assistant'),
    [messages],
  )

  async function ask(prompt = question) {
    const trimmed = prompt.trim()
    if (!trimmed || loading) return

    const userMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: trimmed,
      createdAt: new Date().toISOString(),
    }

    const controller = new AbortController()
    abortRef.current = controller
    setMessages((current) => [...current, userMessage])
    setQuestion('')
    setLoading(true)
    setError('')
    setFeedbackError('')

    try {
      const conversation = [...messages, userMessage]
        .slice(-8)
        .map((message) => ({ role: message.role, text: message.text }))

      const request = await fetch('/api/ceo/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed, conversation }),
        signal: controller.signal,
      })
      const data = await request.json()
      if (!request.ok) throw new Error(data.error ?? 'No fue posible consultar N3uralia')

      const assistantMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: data.summary ?? 'Respuesta ejecutiva disponible.',
        response: data,
        createdAt: new Date().toISOString(),
      }
      setMessages((current) => [...current, assistantMessage])
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') {
        setError('Consulta cancelada.')
      } else {
        setError(caught instanceof Error ? caught.message : 'No fue posible consultar N3uralia')
      }
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }

  function startNewConversation() {
    abortRef.current?.abort()
    setMessages([])
    setQuestion('')
    setError('')
    setFeedbackError('')
    window.localStorage.removeItem(STORAGE_KEY)
    window.setTimeout(() => textareaRef.current?.focus(), 50)
  }

  async function sendFeedback(message: ConversationMessage, rating: 'up' | 'down', comment?: string) {
    if (!message.response) return
    setFeedbackError('')

    try {
      const request = await fetch('/api/ceo/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: messages.findLast((item) => item.role === 'user' && item.createdAt <= message.createdAt)?.text ?? '',
          answerSummary: message.response.summary ?? '',
          rating,
          comment,
          sources: uniqueSources(message.response),
        }),
      })

      if (!request.ok) {
        const data = await request.json().catch(() => ({}))
        throw new Error(data.error ?? 'No fue posible guardar el feedback')
      }

      setFeedbackState((current) => ({ ...current, [message.id]: 'sent' }))
    } catch (caught) {
      setFeedbackError(caught instanceof Error ? caught.message : 'No fue posible guardar el feedback')
    }
  }

  const panelClass = expanded
    ? 'md:h-[min(84vh,820px)] md:w-[min(760px,calc(100vw-3rem))]'
    : 'md:h-[min(78vh,720px)] md:w-[440px]'

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      {open && (
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="n3uralia-title"
          className={`fixed inset-0 flex h-[100dvh] w-screen flex-col bg-[#090909] text-white shadow-[0_24px_70px_rgba(0,0,0,0.58)] md:inset-auto md:bottom-20 md:right-6 md:rounded-2xl md:border md:border-[#8f3f24]/40 ${panelClass}`}
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/8 px-4 py-3.5 md:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#a84b2b]/45 bg-[#17110f] text-[#c9633d]">
                <N3uraliaMark className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h2 id="n3uralia-title" className="text-xs font-medium tracking-[0.2em] text-[#c9633d]">N3URALIA</h2>
                <p className="truncate text-sm font-medium text-neutral-100">Copiloto estratégico CEO</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={startNewConversation} className="rounded-lg px-2.5 py-2 text-xs text-neutral-400 transition hover:bg-white/5 hover:text-white">Nueva</button>
              <button onClick={() => setExpanded((value) => !value)} className="hidden rounded-lg px-2.5 py-2 text-xs text-neutral-400 transition hover:bg-white/5 hover:text-white md:block">{expanded ? 'Compactar' : 'Expandir'}</button>
              <button onClick={() => setOpen(false)} aria-label="Cerrar N3uralia" className="rounded-lg px-3 py-2 text-neutral-400 transition hover:bg-white/5 hover:text-white">×</button>
            </div>
          </header>

          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/6 px-4 py-2.5 text-[11px] text-neutral-400 md:px-5">
            <span className="text-neutral-500">Conectado:</span>
            <span>CRM</span><span>·</span><span>Metas</span><span>·</span><span>Mercado</span><span>·</span><span>Valorización</span><span>·</span><span>Presentaciones</span>
            <span className="ml-auto rounded-full border border-[#8f3f24]/35 px-2 py-0.5 text-[#d37755]">Mercado cuantitativo parcial</span>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 md:px-5" aria-live="polite">
            {messages.length === 0 && (
              <div className="mx-auto flex h-full max-w-xl flex-col justify-center py-8">
                <p className="text-lg font-medium text-neutral-100">¿Qué necesita decidir hoy?</p>
                <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">N3uralia combina evidencia operativa, metas, mercado, valorización y presentaciones. Las limitaciones de datos se muestran explícitamente.</p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button key={prompt} onClick={() => ask(prompt)} className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2.5 text-left text-sm text-neutral-300 transition hover:border-[#8f3f24]/55 hover:bg-[#8f3f24]/8 hover:text-white">{prompt}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-5">
              {messages.map((message) => (
                <article key={message.id} className={message.role === 'user' ? 'ml-auto max-w-[88%]' : 'max-w-full'}>
                  {message.role === 'user' ? (
                    <div className="rounded-2xl rounded-br-md bg-[#8f3f24] px-4 py-3 text-sm leading-6 text-white">{message.text}</div>
                  ) : message.response ? (
                    <ExecutiveResponse
                      message={message}
                      feedbackState={feedbackState[message.id] ?? 'idle'}
                      onFeedback={(rating, comment) => sendFeedback(message, rating, comment)}
                      onRequestDetail={() => setFeedbackState((current) => ({ ...current, [message.id]: 'detail' }))}
                    />
                  ) : null}
                </article>
              ))}

              {loading && (
                <div className="relative overflow-hidden rounded-2xl border border-[#8f3f24]/35 bg-[#8f3f24]/6 p-4" role="status" aria-live="polite">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                        <span className="absolute inset-0 animate-spin rounded-full border border-[#8f3f24]/25 border-t-[#d37755]" />
                        <N3uraliaMark className="h-5 w-5 animate-pulse text-[#d37755]" />
                      </div>
                      <div className="min-w-0">
                        <p className="flex items-center text-sm font-medium text-neutral-100">N3uralia está razonando<LoadingDots /></p>
                        <p className="mt-1 text-xs text-neutral-500">Revisando dominios, evidencia y trazabilidad de la respuesta.</p>
                      </div>
                    </div>
                    <button onClick={() => abortRef.current?.abort()} className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-neutral-400 transition hover:border-[#8f3f24]/45 hover:text-white">Cancelar</button>
                  </div>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/45">
                    <div className="h-full w-1/3 animate-[n3uralia-progress_1.35s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-[#6f2f1c] via-[#d37755] to-[#6f2f1c]" />
                  </div>
                  <style jsx>{`
                    @keyframes n3uralia-progress {
                      0% { transform: translateX(-120%); }
                      55% { transform: translateX(145%); }
                      100% { transform: translateX(320%); }
                    }
                    @media (prefers-reduced-motion: reduce) {
                      div[role='status'] * { animation-duration: 2.8s !important; }
                    }
                  `}</style>
                </div>
              )}
            </div>

            {error && <div role="alert" className="mt-4 rounded-xl border border-red-900/55 bg-red-950/20 p-3 text-sm text-red-200">{error}</div>}
            {feedbackError && <div role="alert" className="mt-3 text-xs text-red-300">{feedbackError}</div>}
          </div>

          <footer className="shrink-0 border-t border-white/8 bg-[#0b0b0b] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:p-4">
            <label htmlFor="ceo-copilot-question" className="sr-only">Pregunta para N3uralia</label>
            <div className="flex items-end gap-2 rounded-xl border border-neutral-800 bg-neutral-950 p-2 focus-within:border-[#8f3f24]">
              <textarea
                ref={textareaRef}
                id="ceo-copilot-question"
                name="ceoCopilotQuestion"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') ask()
                }}
                placeholder={latestAssistant ? 'Profundiza, compara o pide una decisión…' : '¿Qué debo saber hoy?'}
                rows={2}
                maxLength={2000}
                className="min-h-12 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-6 text-neutral-100 outline-none placeholder:text-neutral-600"
              />
              <button onClick={() => ask()} disabled={loading || !question.trim()} className="mb-0.5 rounded-lg bg-[#8f3f24] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#a94b2b] disabled:cursor-not-allowed disabled:opacity-40">Enviar</button>
            </div>
            <p className="mt-2 text-center text-[10px] text-neutral-600">Ctrl/Cmd + Enter para enviar · Esc para cerrar</p>
          </footer>
        </section>
      )}

      <button
        ref={launcherRef}
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Cerrar N3uralia' : 'Abrir N3uralia'}
        aria-expanded={open}
        className="group flex h-13 w-13 items-center justify-center rounded-2xl border border-[#8f3f24]/60 bg-[#0b0b0b] text-[#c9633d] shadow-[0_12px_35px_rgba(0,0,0,0.48)] transition hover:-translate-y-0.5 hover:border-[#b65332] hover:bg-[#14100e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a84b2b]/70 sm:h-14 sm:w-14"
      >
        <N3uraliaMark className={`h-7 w-7 transition-transform group-hover:scale-105 ${loading ? 'animate-pulse' : ''}`} />
      </button>
    </div>
  )
}

function ExecutiveResponse({
  message,
  feedbackState,
  onFeedback,
  onRequestDetail,
}: {
  message: ConversationMessage
  feedbackState: 'idle' | 'detail' | 'sent'
  onFeedback: (rating: 'up' | 'down', comment?: string) => void
  onRequestDetail: () => void
}) {
  const response = message.response!
  const opportunities = response.opportunities ?? response.actions ?? []
  const decision = opportunities[0]
  const sources = uniqueSources(response)
  const [sourcesOpen, setSourcesOpen] = useState(false)

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-2 text-[11px] text-neutral-500">
        <span className="font-medium tracking-[0.14em] text-[#c9633d]">N3URALIA</span>
        <span>·</span>
        <time>{new Date(message.createdAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</time>
      </div>

      {decision && (
        <section className="rounded-2xl border border-[#8f3f24]/40 bg-[#8f3f24]/8 p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.17em] text-[#d37755]">Decisión sugerida</p>
          <p className="mt-2 font-medium leading-6 text-white">{itemText(decision)}</p>
          {domainHref(decision) && <Link href={domainHref(decision)!} className="mt-3 inline-flex text-xs font-medium text-[#d37755] hover:text-[#e28a68]">Abrir módulo relacionado →</Link>}
        </section>
      )}

      <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <p className="text-[10px] uppercase tracking-[0.17em] text-neutral-500">Resumen ejecutivo</p>
        <p className="mt-2 leading-6 text-neutral-100">{response.summary ?? 'Sin resumen disponible.'}</p>
      </section>

      {response.signals?.length ? <CollapsibleSection title="Qué cambió" items={response.signals} /> : null}
      {response.risks?.length ? <CollapsibleSection title="Riesgos y limitaciones" items={response.risks} tone="risk" /> : null}
      {opportunities.length > 1 ? <CollapsibleSection title="Acciones siguientes" items={opportunities.slice(1)} links /> : null}
      {response.evidence?.length ? <CollapsibleSection title="Evidencia utilizada" items={response.evidence} collapsed /> : null}

      <section className="rounded-xl border border-white/8 px-3.5 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          {response.confidence && <span><span className="text-neutral-500">Confianza: </span><span className="font-medium capitalize text-white">{response.confidence}</span></span>}
          {response.reasoningMode && <span><span className="text-neutral-500">Profundidad: </span><span className="font-medium capitalize text-white">{response.reasoningMode}</span></span>}
        </div>
        <p className="mt-2 text-xs leading-5 text-neutral-500">{confidenceExplanation(response)}</p>
      </section>

      {sources.length > 0 && (
        <section className="rounded-xl border border-white/8">
          <button onClick={() => setSourcesOpen((value) => !value)} className="flex w-full items-center justify-between px-3.5 py-3 text-left text-xs text-neutral-400 hover:text-white">
            <span>Fuentes utilizadas · {sources.length}</span><span>{sourcesOpen ? '−' : '+'}</span>
          </button>
          {sourcesOpen && <div className="border-t border-white/8 px-3.5 py-3"><ul className="space-y-2 text-xs text-neutral-500">{sources.map((source) => <li key={source} className="break-words">{source}</li>)}</ul></div>}
        </section>
      )}

      <div className="border-t border-white/8 pt-3">
        {feedbackState === 'sent' ? (
          <p className="text-xs text-[#d37755]">Feedback guardado.</p>
        ) : feedbackState === 'detail' ? (
          <div>
            <p className="mb-2 text-xs text-neutral-500">¿Qué faltó?</p>
            <div className="flex flex-wrap gap-2">
              {['No respondió la pregunta', 'Faltó evidencia', 'Información incorrecta', 'Demasiado extenso', 'Recomendación poco útil'].map((reason) => (
                <button key={reason} onClick={() => onFeedback('down', reason)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-neutral-400 transition hover:border-[#8f3f24]/55 hover:text-white">{reason}</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-neutral-500">¿Fue útil esta respuesta?</span>
            <div className="flex gap-2">
              <button onClick={() => onFeedback('up')} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-neutral-400 transition hover:border-[#8f3f24]/55 hover:text-white" aria-label="Respuesta útil">Útil</button>
              <button onClick={onRequestDetail} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-neutral-400 transition hover:border-[#8f3f24]/55 hover:text-white" aria-label="Respuesta no útil">No útil</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CollapsibleSection({
  title,
  items,
  collapsed = false,
  tone = 'neutral',
  links = false,
}: {
  title: string
  items: unknown[]
  collapsed?: boolean
  tone?: 'neutral' | 'risk'
  links?: boolean
}) {
  const [open, setOpen] = useState(!collapsed)
  return (
    <section className="rounded-xl border border-white/8">
      <button onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between px-3.5 py-3 text-left">
        <span className={`text-[10px] uppercase tracking-[0.17em] ${tone === 'risk' ? 'text-red-300' : 'text-neutral-500'}`}>{title}</span>
        <span className="text-xs text-neutral-600">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-white/8 p-3">
          {items.map((item, index) => (
            <div key={index} className="rounded-lg bg-white/[0.025] px-3 py-2.5 leading-6 text-neutral-300">
              {itemText(item)}
              {links && domainHref(item) && <Link href={domainHref(item)!} className="mt-2 block text-xs text-[#d37755] hover:text-[#e28a68]">Abrir módulo →</Link>}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
