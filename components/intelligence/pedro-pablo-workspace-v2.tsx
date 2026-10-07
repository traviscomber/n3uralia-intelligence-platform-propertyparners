'use client'

import Link from 'next/link'
import { FormEvent, KeyboardEvent, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, CircleAlert, Database, History, ListChecks, Scale, Send, Target } from 'lucide-react'

type Evidence = {
  label: string
  source: string
  reference?: string | null
  cutoff?: string | null
  domain?: 'management' | 'tasks' | 'valuations' | 'properties' | 'reports' | 'market'
}

type Coverage = {
  management: { available: boolean; entities: number; alerts: number }
  tasks: { available: boolean; total: number; active: number; overdue: number }
  valuations: { available: boolean; total: number; review: number; drafts: number; approved: number }
  properties: { available: boolean; total: number; pendingIdentity: number; stale: number; attention: number }
  reports: { available: boolean; total: number; sent: number; failed: number; queued: number; escalated: number }
}

type ActionProposal = {
  id: string
  kind: 'review' | 'follow_up' | 'verify' | 'prepare'
  domain: 'management' | 'tasks' | 'valuations' | 'properties' | 'reports' | 'market' | 'cross-domain'
  action: string
  objectLabel: string
  reason: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  href: string
  requiresConfirmation: true
  executionStatus: 'proposed'
  evidence: Evidence[]
}

type AssistantProfile = {
  id: string
  purpose: string
  tone: string
  answerOrder: readonly string[]
  opinionPolicy: 'evidence-only-no-personal-opinion'
  missingDataPolicy: 'state-unavailable-do-not-infer'
}

type AssistantResponse = {
  title: string
  answer: string
  scopeLabel: string
  periodLabel: string
  confidence: 'high' | 'medium'
  evidence: Evidence[]
  coverage: Coverage
  decisionPolicy: string
  mode: string
  writesPerformed: number
  generatedAt: string
  proposals: ActionProposal[]
  assistantProfile: AssistantProfile
  availableConfirmedActions: Array<'create_task'>
  proposalPolicy: string
  executionPolicy: string
  executableWrites: number
}

type TaskDraft = {
  sourceKey: string
  title: string
  detail: string
  severity: 'info' | 'warning' | 'critical'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dueDate: string | null
}

type ActionPreview = {
  proposal: ActionProposal
  taskDraft: TaskDraft
  confirmationRequired: true
  executable: true
  executionStatus: 'preview'
  writesPerformed: 0
  gatewayPolicy: string
}

type ActionExecution = {
  proposalId: string
  executionStatus: 'executed'
  writesPerformed: 1
  task: { id?: string } | null
  confirmedByHuman: true
  executedAt: string
}

type HistoryItem = { query: string; response: AssistantResponse }

function evidenceSourceLabel(value:string){
  if(value.includes('market_ingestion_runs') || value.includes('market_current_listings')) return value.includes('inventario completo') ? 'Portal Inmobiliario · inventario verificado' : 'Portal Inmobiliario · actualización diaria'
  if(value.includes('management_tasks')) return 'Tareas autorizadas'
  if(value.includes('valuation_cases')) return 'Valorizaciones autorizadas'
  if(value.includes('valuation_comparables')) return 'Comparables autorizados'
  if(value.includes('property_assignments') || value.includes('market_properties')) return 'Cartera autorizada'
  if(value.includes('report_deliveries')) return 'Entregas de informes'
  if(value.includes('client-response-pedro-pablo')) return 'Criterio Property Partners · Vitacura'
  return value
}

function evidenceCutoffLabel(value:string){
  const parsed=new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('es-CL')
}

const starters = [
  { label: 'Mercado hoy', prompt: '¿Qué cambió esta mañana en el mercado?' },
  { label: 'Prioridades', prompt: '¿Qué requiere mi atención hoy?' },
  { label: 'Propiedades', prompt: '¿Qué propiedades necesitan revisión?' },
  { label: 'Tareas vencidas', prompt: '¿Qué tareas están vencidas?' },
  { label: 'Valorizaciones', prompt: '¿Cómo están las valorizaciones?' },
  { label: 'Reportes', prompt: '¿Cómo están los reportes?' },
]

function CoverageItem({ label, value, detail, unavailable = false }: { label: string; value: string; detail: string; unavailable?: boolean }) {
  return <div className="border-t border-[var(--n3-line)] pt-3 first:border-t-0 first:pt-0">
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-[var(--n3-text-muted)]">{label}</span>
      <span className={unavailable ? 'text-xs text-[var(--n3-text-muted)]' : 'text-sm font-semibold text-[var(--n3-text-light)]'}>{value}</span>
    </div>
    <div className="mt-1 text-[10px] leading-4 text-[var(--n3-text-muted)]">{detail}</div>
  </div>
}

function priorityLabel(priority: ActionProposal['priority']) {
  if (priority === 'critical') return 'Crítica'
  if (priority === 'high') return 'Alta'
  if (priority === 'low') return 'Baja'
  return 'Media'
}

function priorityClass(priority: ActionProposal['priority']) {
  if (priority === 'critical') return 'text-[var(--destructive)]'
  if (priority === 'high') return 'text-[var(--chart-4)]'
  return 'text-[var(--n3-text-muted)]'
}

export function PedroPabloWorkspaceV2() {
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState<AssistantResponse | null>(null)
  const [lastQuery, setLastQuery] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionPreview, setActionPreview] = useState<ActionPreview | null>(null)
  const [actionBusyId, setActionBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const evidence = useMemo(() => response?.evidence.slice(0, 8) ?? [], [response])
  const proposals = useMemo(() => response?.proposals.slice(0, 4) ?? [], [response])
  const canCreateTask = response?.availableConfirmedActions.includes('create_task') ?? false

  async function fetchDecisionSupport(query: string) {
    const result = await fetch('/api/pedro-pablo/decision-support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: query }),
    })
    const payload = await result.json()
    if (!result.ok) throw new Error(payload.error || 'No fue posible consultar Pedro Pablo.')
    return payload as AssistantResponse
  }

  async function ask(value: string) {
    const query = value.trim()
    if (!query || loading) return
    setLoading(true)
    setError(null)
    setActionPreview(null)
    setActionError(null)
    setActionSuccess(null)
    try {
      const next = await fetchDecisionSupport(query)
      if (response && lastQuery) setHistory((current) => [...current.slice(-3), { query: lastQuery, response }])
      setResponse(next)
      setLastQuery(query)
      setPrompt('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible consultar Pedro Pablo.')
    } finally {
      setLoading(false)
    }
  }

  async function previewAction(proposal: ActionProposal) {
    if (!lastQuery || actionBusyId) return
    setActionBusyId(proposal.id)
    setActionError(null)
    setActionSuccess(null)
    try {
      const result = await fetch('/api/pedro-pablo/action-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: lastQuery, proposalId: proposal.id, mode: 'preview' }),
      })
      const payload = await result.json()
      if (!result.ok) throw new Error(payload.error || 'No fue posible preparar la acción.')
      setActionPreview(payload as ActionPreview)
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'No fue posible preparar la acción.')
    } finally {
      setActionBusyId(null)
    }
  }

  async function executeAction() {
    if (!lastQuery || !actionPreview || actionBusyId) return
    const proposalId = actionPreview.proposal.id
    setActionBusyId(proposalId)
    setActionError(null)
    setActionSuccess(null)
    try {
      const result = await fetch('/api/pedro-pablo/action-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: lastQuery, proposalId, mode: 'execute', confirm: true }),
      })
      const payload = await result.json()
      if (!result.ok) throw new Error(payload.error || 'No fue posible ejecutar la acción confirmada.')
      const execution = payload as ActionExecution
      setActionSuccess(execution.task?.id ? `Tarea creada y registrada · ${execution.task.id}` : 'Tarea creada y registrada.')
      setActionPreview(null)
      try {
        setResponse(await fetchDecisionSupport(lastQuery))
      } catch {
        // La escritura ya fue confirmada y registrada. Mantener el resultado visible aunque falle el refresh de lectura.
      }
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'No fue posible ejecutar la acción confirmada.')
    } finally {
      setActionBusyId(null)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void ask(prompt)
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      void ask(prompt)
    }
  }

  return <section className="space-y-6" aria-labelledby="pedro-pablo-title">
    <header className="border-b border-[var(--n3-line)] pb-5">
      <h1 id="pedro-pablo-title" className="font-[var(--font-rajdhani)] text-3xl font-semibold tracking-[-0.02em] text-[var(--n3-text-light)] md:text-4xl">Pedro Pablo</h1>
      <p className="mt-1 text-sm text-[var(--n3-text-muted)]">Decisiones con datos verificados.</p>
    </header>

    <div className="space-y-4">
      <div className="min-w-0 border border-[var(--n3-line)] bg-[var(--n3-deep)]">
        <div className="border-b border-[var(--n3-line)] px-5 py-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-light)]">Consulta</div>
        </div>

        <div className="min-h-[430px] p-5 md:p-6">
          {!response && !loading ? <div className="flex min-h-[330px] flex-col justify-between gap-8">
            <div className="max-w-xl text-xl font-medium leading-8 text-[var(--n3-text-light)]">¿Qué necesitas saber?</div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{starters.map((starter) => <button key={starter.label} type="button" onClick={() => void ask(starter.prompt)} className="min-h-14 border border-[var(--n3-line)] px-4 py-3 text-left text-sm leading-5 text-[var(--n3-text-light)] transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]">{starter.label}</button>)}</div>
          </div> : null}

          {loading ? <div className="flex min-h-[370px] items-center justify-center text-sm text-[var(--n3-text-muted)]" role="status">Revisando datos…</div> : null}

          {response && !loading ? <article aria-live="polite">
            {lastQuery ? <div className="mb-4 border-l-2 border-[var(--primary)] pl-3 text-xs leading-5 text-[var(--n3-text-muted)]">Consulta: <span className="text-[var(--n3-text-light)]">{lastQuery}</span></div> : null}

            <h2 className="text-xl font-semibold text-[var(--n3-text-light)]">{response.title}</h2>
            <div className="mt-4 whitespace-pre-line text-sm leading-7 text-[var(--n3-text-light)]">{response.answer}</div>

            {proposals.length ? <section className="mt-7 border-t border-[var(--n3-line)] pt-5" aria-labelledby="pedro-pablo-proposals-title">
              <div className="flex items-center gap-2"><Target aria-hidden="true" size={15} className="text-[var(--n3-teal-soft)]" /><h3 id="pedro-pablo-proposals-title" className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-light)]">Acciones</h3></div>

              <div className="mt-4 grid gap-px border border-[var(--n3-line)] bg-[var(--n3-line)] md:grid-cols-2">
                {proposals.map((proposal, index) => <div key={proposal.id} className="bg-[var(--n3-black)] p-4">
                  <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.14em]"><span className="text-[var(--n3-text-muted)]">Acción {index + 1} · {proposal.domain}</span><span className={priorityClass(proposal.priority)}>{priorityLabel(proposal.priority)}</span></div>
                  <div className="mt-2 text-sm font-medium text-[var(--n3-text-light)]">{proposal.action}</div>
                  <div className="mt-1 text-xs text-[var(--n3-text-muted)]">Objeto: {proposal.objectLabel}</div>
                  <p className="mt-3 text-xs leading-5 text-[var(--n3-text-muted)]">{proposal.reason}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={proposal.href} className="inline-flex min-h-9 items-center gap-2 border border-[var(--primary)] px-3 text-xs font-semibold text-[var(--n3-text-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]">Revisar evidencia <ArrowRight aria-hidden="true" size={14} /></Link>
                    {canCreateTask ? <button type="button" onClick={() => void previewAction(proposal)} disabled={Boolean(actionBusyId)} className="min-h-9 border border-[var(--n3-line)] px-3 text-xs font-semibold text-[var(--n3-text-light)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]">{actionBusyId === proposal.id ? 'Preparando…' : 'Preparar tarea'}</button> : null}
                  </div>
                </div>)}
              </div>

              {actionPreview ? <div className="mt-4 border border-[var(--primary)] bg-[var(--n3-black)] p-4" aria-live="polite">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-teal-soft)]">Confirmar acción</div>
                <div className="mt-3 text-sm font-semibold text-[var(--n3-text-light)]">Crear tarea: {actionPreview.taskDraft.title}</div>
                <div className="mt-2 grid gap-1 text-xs leading-5 text-[var(--n3-text-muted)]">
                  <div><span className="text-[var(--n3-text-light)]">Prioridad:</span> {actionPreview.taskDraft.priority}</div>
                  <div><span className="text-[var(--n3-text-light)]">Severidad:</span> {actionPreview.taskDraft.severity}</div>
                  <div><span className="text-[var(--n3-text-light)]">Origen:</span> {actionPreview.taskDraft.sourceKey}</div>
                  <div className="mt-1"><span className="text-[var(--n3-text-light)]">Detalle:</span> {actionPreview.taskDraft.detail}</div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => void executeAction()} disabled={Boolean(actionBusyId)} className="min-h-10 border border-[var(--primary)] px-4 text-xs font-semibold text-[var(--n3-text-light)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]">{actionBusyId === actionPreview.proposal.id ? 'Registrando…' : 'Confirmar y crear tarea'}</button>
                  <button type="button" onClick={() => setActionPreview(null)} disabled={Boolean(actionBusyId)} className="min-h-10 px-3 text-xs text-[var(--n3-text-muted)] disabled:opacity-40">Cancelar</button>

                </div>
              </div> : null}

              {actionError ? <div className="mt-4 flex items-start gap-2 border-l-2 border-[var(--destructive)] pl-3 text-xs leading-5 text-[var(--destructive)]" role="alert"><CircleAlert aria-hidden="true" size={15} className="mt-0.5 shrink-0" />{actionError}</div> : null}
              {actionSuccess ? <div className="mt-4 flex items-start gap-2 border-l-2 border-[var(--chart-3)] pl-3 text-xs leading-5 text-[var(--n3-text-light)]" role="status"><CheckCircle2 aria-hidden="true" size={15} className="mt-0.5 shrink-0 text-[var(--chart-3)]" />{actionSuccess}</div> : null}
            </section> : null}
          </article> : null}

          {error ? <div className="flex min-h-[370px] items-center gap-3 text-sm text-[var(--destructive)]" role="alert"><CircleAlert aria-hidden="true" size={18} />{error}</div> : null}
        </div>

        <form onSubmit={submit} className="border-t border-[var(--n3-line)] p-4">
          <label htmlFor="pedro-pablo-query" className="sr-only">Pregunta a Pedro Pablo</label>
          <div className="flex gap-2"><textarea id="pedro-pablo-query" value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={onComposerKeyDown} rows={2} maxLength={800} placeholder="Pregunta a Pedro Pablo…" className="min-h-12 flex-1 resize-none border border-[var(--n3-line)] bg-[var(--n3-black)] px-3 py-3 text-sm text-[var(--n3-text-light)] outline-none placeholder:text-[var(--n3-text-muted)] focus:border-[var(--primary)]" /><button type="submit" disabled={loading || !prompt.trim()} aria-label="Enviar consulta" className="flex w-12 items-center justify-center border border-[var(--primary)] text-[var(--n3-text-light)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]"><Send aria-hidden="true" size={16} /></button></div>

        </form>
      </div>

      <details className="border-t border-[var(--n3-line)] pt-4">
        <summary className="cursor-pointer text-xs font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">
          Ver detalle
        </summary>
        <aside className="mt-4 grid gap-4 lg:grid-cols-2">
        {response ? <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]"><ListChecks aria-hidden="true" size={14} /> Cobertura operativa</div>
          <div className="mt-4 space-y-3">
            <CoverageItem label="Gestión" value={`${response.coverage.management.entities} entidades`} detail={`${response.coverage.management.alerts} alertas visibles`} />
            <CoverageItem label="Tareas" value={response.coverage.tasks.available ? `${response.coverage.tasks.active} activas` : 'No disponible'} detail={response.coverage.tasks.available ? `${response.coverage.tasks.overdue} vencidas · ${response.coverage.tasks.total} visibles` : 'El rol no expone este módulo'} unavailable={!response.coverage.tasks.available} />
            <CoverageItem label="Valorizaciones" value={response.coverage.valuations.available ? `${response.coverage.valuations.total} casos` : 'No disponible'} detail={response.coverage.valuations.available ? `${response.coverage.valuations.review} revisión · ${response.coverage.valuations.drafts} borrador · ${response.coverage.valuations.approved} aprobadas/emitidas` : 'El rol no expone este módulo'} unavailable={!response.coverage.valuations.available} />
            <CoverageItem label="Propiedades" value={response.coverage.properties.available ? `${response.coverage.properties.total} asignadas` : 'No disponible'} detail={response.coverage.properties.available ? `${response.coverage.properties.pendingIdentity} identidad pendiente · ${response.coverage.properties.stale} sin vigencia reciente · ${response.coverage.properties.attention} requieren atención` : 'El rol no expone este módulo'} unavailable={!response.coverage.properties.available} />
            <CoverageItem label="Reportes" value={response.coverage.reports.available ? `${response.coverage.reports.total} entregas recientes` : 'No disponible'} detail={response.coverage.reports.available ? `${response.coverage.reports.sent} enviadas/escaladas · ${response.coverage.reports.failed} fallidas · ${response.coverage.reports.queued} en cola` : 'El rol o la fuente no exponen telemetría de entregas'} unavailable={!response.coverage.reports.available} />
          </div>
        </div> : null}

        {history.length ? <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]"><History aria-hidden="true" size={14} /> Sesión actual</div><div className="mt-4 space-y-3">{history.slice().reverse().map((item, index) => <button key={`${item.query}-${index}`} type="button" onClick={() => { setResponse(item.response); setLastQuery(item.query); setActionPreview(null); setActionError(null); setActionSuccess(null) }} className="block w-full border-t border-[var(--n3-line)] pt-3 text-left first:border-t-0 first:pt-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)]"><div className="text-xs leading-5 text-[var(--n3-text-light)]">{item.query}</div><div className="mt-1 text-[10px] text-[var(--n3-text-muted)]">{item.response.title}</div></button>)}</div></div> : null}

        <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]"><Database aria-hidden="true" size={14} /> Evidencia</div>{response ? <div className="mt-4 space-y-4">{evidence.length ? evidence.map((item, index) => <div key={`${item.label}-${index}`} className="border-t border-[var(--n3-line)] pt-3 first:border-t-0 first:pt-0"><div className="text-sm font-medium text-[var(--n3-text-light)]">{item.label}</div><div className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">{evidenceSourceLabel(item.source)}</div>{item.cutoff ? <div className="mt-1 text-[10px] text-[var(--n3-teal-soft)]">Actualizado {evidenceCutoffLabel(item.cutoff)}</div> : null}</div>) : <div className="mt-4 text-sm text-[var(--n3-text-muted)]">Sin evidencia adicional disponible.</div>}</div> : <p className="mt-3 text-sm leading-6 text-[var(--n3-text-muted)]">La procedencia aparecerá junto a cada lectura evaluable.</p>}</div>

        <div className="border border-[var(--n3-line)] p-5"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]"><Scale aria-hidden="true" size={14} /> Criterio del asistente</div><div className="mt-3 grid gap-3 text-xs leading-5 text-[var(--n3-text-muted)]"><div><span className="text-[var(--n3-text-light)]">Objetivo:</span> ayudar a decidir con evidencia autorizada.</div><div><span className="text-[var(--n3-text-light)]">Evidencia:</span> muestra fuente y vigencia cuando están disponibles.</div><div><span className="text-[var(--n3-text-light)]">Vacíos:</span> se declaran; no se completan ni estiman.</div><div><span className="text-[var(--n3-text-light)]">Acciones:</span> {canCreateTask ? 'puede preparar una tarea y sólo ejecutarla después de confirmación humana.' : 'este rol no puede ejecutar cambios desde el asistente.'}</div></div></div>
        </aside>
      </details>
    </div>
  </section>
}