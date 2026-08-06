'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, FileText, RefreshCw, Send } from 'lucide-react'

type DocumentRecord = {
  id: string
  title: string
  file_url: string
  file_type: string
  created_at: string
}

type Schedule = {
  id: string
  document_id: string
  title: string
  cadence: 'weekly' | 'monthly'
  day_of_week?: string
  day_of_month?: number
  send_time: string
  active: boolean
  next_send_at: string
  document_recipients?: Array<{ recipient_role: string }>
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'N/D'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'N/D'
    : date.toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })
}

function recipientLabel(value: string) {
  if (value === 'ceo') return 'CEO'
  if (value === 'director') return 'Directores'
  return value
}

export default function DocumentDeliveryManager() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showConfiguration, setShowConfiguration] = useState(false)
  const [configurationTab, setConfigurationTab] = useState<'schedule' | 'document'>('schedule')

  const [newSchedule, setNewSchedule] = useState({
    document_id: '',
    title: '',
    description: '',
    cadence: 'weekly' as 'weekly' | 'monthly',
    day_of_week: 'monday',
    day_of_month: 1,
    send_time: '09:00',
    recipient_roles: ['ceo', 'director'] as string[],
  })

  const [newDocument, setNewDocument] = useState({
    title: '',
    description: '',
    file_url: '',
    file_type: 'pdf',
  })

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const [docsResponse, schedulesResponse] = await Promise.all([
        fetch('/api/documents', { cache: 'no-store' }),
        fetch('/api/document-schedules', { cache: 'no-store' }),
      ])

      const docsPayload = await docsResponse.json().catch(() => ({}))
      const schedulesPayload = await schedulesResponse.json().catch(() => ({}))

      if (!docsResponse.ok || !schedulesResponse.ok) {
        throw new Error(
          docsPayload.error || schedulesPayload.error || 'No fue posible cargar las entregas programadas.',
        )
      }

      setDocuments(docsPayload.documents || [])
      setSchedules(schedulesPayload.schedules || [])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible cargar las entregas programadas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [])

  const sortedSchedules = useMemo(
    () => [...schedules].sort((a, b) => (a.next_send_at || '').localeCompare(b.next_send_at || '')),
    [schedules],
  )
  const activeSchedules = sortedSchedules.filter((item) => item.active)
  const nextSchedule = activeSchedules[0] || null
  const inactiveSchedules = schedules.filter((item) => !item.active).length
  const scheduledDocumentIds = new Set(schedules.map((item) => item.document_id))
  const unscheduledDocuments = documents.filter((item) => !scheduledDocumentIds.has(item.id)).length

  async function handleCreateSchedule(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const response = await fetch('/api/document-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSchedule, send_time: `${newSchedule.send_time}:00` }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'No fue posible crear la programación.')

      setNewSchedule({
        document_id: '',
        title: '',
        description: '',
        cadence: 'weekly',
        day_of_week: 'monday',
        day_of_month: 1,
        send_time: '09:00',
        recipient_roles: ['ceo', 'director'],
      })
      await fetchData()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible crear la programación.')
    }
  }

  async function handleCreateDocument(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDocument),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'No fue posible registrar el documento.')

      setNewDocument({ title: '', description: '', file_url: '', file_type: 'pdf' })
      await fetchData()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible registrar el documento.')
    }
  }

  if (loading) {
    return <div role="status" className="border border-[var(--n3-line)] p-8 text-sm text-[var(--n3-text-muted)]">Cargando entregas programadas…</div>
  }

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--n3-line)] pb-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d7332b]">Operación ejecutiva</p>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--n3-text-light)]">Entregas programadas</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">Próximos envíos, destinatarios y documentos disponibles. La configuración queda en segundo nivel para no ocultar el estado operativo.</p>
        </div>
        <button onClick={() => void fetchData()} className="inline-flex min-h-11 items-center gap-2 border border-[var(--n3-line)] px-4 py-2 text-sm text-[var(--n3-text-light)]">
          <RefreshCw className="h-4 w-4" />Actualizar
        </button>
      </header>

      {error ? <div role="alert" className="border border-[#d7332b] bg-[#2a1010] p-4 text-sm text-[#ff9a94]">{error}</div> : null}

      <section>
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">01 · Estado actual</p>
          <h2 className="mt-2 text-2xl font-semibold">Qué ocurrirá a continuación</h2>
        </div>
        <div className="grid gap-px bg-[var(--n3-line)] sm:grid-cols-2 xl:grid-cols-4">
          <article className="bg-[var(--n3-deep)] p-5"><p className="text-xs uppercase tracking-wide text-[var(--n3-text-muted)]">Próximo envío</p><p className="mt-2 text-lg font-semibold">{nextSchedule ? formatDate(nextSchedule.next_send_at) : 'Sin envío programado'}</p></article>
          <article className="bg-[var(--n3-deep)] p-5"><p className="text-xs uppercase tracking-wide text-[var(--n3-text-muted)]">Programaciones activas</p><p className="mt-2 text-3xl font-semibold">{activeSchedules.length}</p></article>
          <article className="bg-[var(--n3-deep)] p-5"><p className="text-xs uppercase tracking-wide text-[var(--n3-text-muted)]">Programaciones inactivas</p><p className="mt-2 text-3xl font-semibold">{inactiveSchedules}</p></article>
          <article className="bg-[var(--n3-deep)] p-5"><p className="text-xs uppercase tracking-wide text-[var(--n3-text-muted)]">Documentos sin programación</p><p className="mt-2 text-3xl font-semibold">{unscheduledDocuments}</p></article>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">02 · Próximas entregas</p>
          <h2 className="mt-2 text-2xl font-semibold">Envíos y responsables</h2>
        </div>
        <div className="space-y-3">
          {sortedSchedules.length ? sortedSchedules.map((schedule) => {
            const document = documents.find((item) => item.id === schedule.document_id)
            const recipients = schedule.document_recipients?.map((item) => recipientLabel(item.recipient_role)).join(', ') || 'N/D'
            return (
              <article key={schedule.id} className={`border bg-[#0c1111] p-5 ${schedule.active ? 'border-[var(--n3-line)]' : 'border-[#8a6b2e]'}`}>
                <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_auto] lg:items-center">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{schedule.active ? 'Activa' : 'Inactiva'} · {schedule.cadence === 'weekly' ? 'Semanal' : 'Mensual'}</p>
                    <h3 className="mt-2 text-lg font-semibold">{schedule.title}</h3>
                    <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Documento: {document?.title || 'Documento no disponible'}</p>
                  </div>
                  <div className="text-sm leading-6 text-[var(--n3-text-muted)]">
                    <p>Próximo envío: <span className="text-[var(--n3-text-light)]">{formatDate(schedule.next_send_at)}</span></p>
                    <p>Destinatarios: <span className="text-[var(--n3-text-light)]">{recipients}</span></p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--n3-text-muted)]"><Send className="h-4 w-4" />{schedule.active ? 'En cola operativa' : 'Requiere revisión'}</div>
                </div>
              </article>
            )
          }) : <div className="border border-dashed border-[var(--n3-line)] p-6 text-sm text-[var(--n3-text-muted)]">No existen entregas programadas.</div>}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">03 · Documentos disponibles</p>
          <h2 className="mt-2 text-2xl font-semibold">Material registrado</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {documents.length ? documents.map((document) => (
            <article key={document.id} className="border border-[var(--n3-line)] bg-[#0c1111] p-5">
              <div className="flex items-start gap-3"><FileText className="mt-1 h-4 w-4 text-[var(--n3-teal)]" /><div className="min-w-0 flex-1"><h3 className="font-semibold">{document.title}</h3><p className="mt-1 text-xs uppercase tracking-wide text-[var(--n3-text-muted)]">{document.file_type || 'N/D'} · registrado {formatDate(document.created_at)}</p><a href={document.file_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-[#ff766f]">Abrir documento</a></div></div>
            </article>
          )) : <div className="border border-dashed border-[var(--n3-line)] p-6 text-sm text-[var(--n3-text-muted)]">No existen documentos registrados.</div>}
        </div>
      </section>

      <section className="border border-[var(--n3-line)] bg-[var(--n3-deep)]">
        <button onClick={() => setShowConfiguration((value) => !value)} className="flex min-h-12 w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold">
          <span className="inline-flex items-center gap-2"><CalendarClock className="h-4 w-4" />{showConfiguration ? 'Ocultar configuración' : 'Configurar entregas y documentos'}</span>
          <span className="text-[var(--n3-text-muted)]">{showConfiguration ? '−' : '+'}</span>
        </button>

        {showConfiguration ? (
          <div className="border-t border-[var(--n3-line)] p-5">
            <div className="mb-5 flex gap-2">
              <button onClick={() => setConfigurationTab('schedule')} className={`min-h-11 px-4 py-2 text-sm ${configurationTab === 'schedule' ? 'bg-[#d7332b] text-white' : 'border border-[var(--n3-line)]'}`}>Nueva programación</button>
              <button onClick={() => setConfigurationTab('document')} className={`min-h-11 px-4 py-2 text-sm ${configurationTab === 'document' ? 'bg-[#d7332b] text-white' : 'border border-[var(--n3-line)]'}`}>Registrar documento</button>
            </div>

            {configurationTab === 'schedule' ? (
              <form onSubmit={handleCreateSchedule} className="grid gap-4 md:grid-cols-2">
                <label className="text-sm">Documento<select value={newSchedule.document_id} onChange={(event) => setNewSchedule({ ...newSchedule, document_id: event.target.value })} className="mt-2 w-full border border-[var(--n3-line)] bg-black/20 px-3 py-2" required><option value="">Seleccionar documento</option>{documents.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}</select></label>
                <label className="text-sm">Nombre de la entrega<input value={newSchedule.title} onChange={(event) => setNewSchedule({ ...newSchedule, title: event.target.value })} className="mt-2 w-full border border-[var(--n3-line)] bg-black/20 px-3 py-2" required /></label>
                <label className="text-sm">Frecuencia<select value={newSchedule.cadence} onChange={(event) => setNewSchedule({ ...newSchedule, cadence: event.target.value as 'weekly' | 'monthly' })} className="mt-2 w-full border border-[var(--n3-line)] bg-black/20 px-3 py-2"><option value="weekly">Semanal</option><option value="monthly">Mensual</option></select></label>
                {newSchedule.cadence === 'weekly' ? <label className="text-sm">Día<select value={newSchedule.day_of_week} onChange={(event) => setNewSchedule({ ...newSchedule, day_of_week: event.target.value })} className="mt-2 w-full border border-[var(--n3-line)] bg-black/20 px-3 py-2">{Object.entries(DAY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label> : <label className="text-sm">Día del mes<input type="number" min="1" max="28" value={newSchedule.day_of_month} onChange={(event) => setNewSchedule({ ...newSchedule, day_of_month: Number(event.target.value) })} className="mt-2 w-full border border-[var(--n3-line)] bg-black/20 px-3 py-2" /></label>}
                <label className="text-sm">Hora<input type="time" value={newSchedule.send_time} onChange={(event) => setNewSchedule({ ...newSchedule, send_time: event.target.value })} className="mt-2 w-full border border-[var(--n3-line)] bg-black/20 px-3 py-2" /></label>
                <div className="text-sm"><p>Destinatarios confirmados</p><div className="mt-3 flex gap-4"><label><input type="checkbox" checked={newSchedule.recipient_roles.includes('ceo')} onChange={(event) => setNewSchedule({ ...newSchedule, recipient_roles: event.target.checked ? [...newSchedule.recipient_roles, 'ceo'] : newSchedule.recipient_roles.filter((role) => role !== 'ceo') })} /> <span className="ml-2">CEO</span></label><label><input type="checkbox" checked={newSchedule.recipient_roles.includes('director')} onChange={(event) => setNewSchedule({ ...newSchedule, recipient_roles: event.target.checked ? [...newSchedule.recipient_roles, 'director'] : newSchedule.recipient_roles.filter((role) => role !== 'director') })} /> <span className="ml-2">Directores</span></label></div></div>
                <div className="md:col-span-2"><button type="submit" className="min-h-11 bg-[#d7332b] px-5 py-2 text-sm font-semibold text-white">Crear programación</button></div>
              </form>
            ) : (
              <form onSubmit={handleCreateDocument} className="grid gap-4 md:grid-cols-2">
                <label className="text-sm">Título<input value={newDocument.title} onChange={(event) => setNewDocument({ ...newDocument, title: event.target.value })} className="mt-2 w-full border border-[var(--n3-line)] bg-black/20 px-3 py-2" required /></label>
                <label className="text-sm">Tipo<select value={newDocument.file_type} onChange={(event) => setNewDocument({ ...newDocument, file_type: event.target.value })} className="mt-2 w-full border border-[var(--n3-line)] bg-black/20 px-3 py-2"><option value="pdf">PDF</option><option value="pptx">PowerPoint</option><option value="xlsx">Excel</option><option value="other">Otro</option></select></label>
                <label className="text-sm md:col-span-2">URL del archivo<input type="url" value={newDocument.file_url} onChange={(event) => setNewDocument({ ...newDocument, file_url: event.target.value })} className="mt-2 w-full border border-[var(--n3-line)] bg-black/20 px-3 py-2" required /></label>
                <label className="text-sm md:col-span-2">Descripción<textarea value={newDocument.description} onChange={(event) => setNewDocument({ ...newDocument, description: event.target.value })} rows={3} className="mt-2 w-full border border-[var(--n3-line)] bg-black/20 px-3 py-2" /></label>
                <div className="md:col-span-2"><button type="submit" className="min-h-11 bg-[#d7332b] px-5 py-2 text-sm font-semibold text-white">Registrar documento</button></div>
              </form>
            )}
          </div>
        ) : null}
      </section>
    </div>
  )
}
