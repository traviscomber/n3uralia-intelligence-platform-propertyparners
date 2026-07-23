'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, CheckCheck, Download, FileText, Loader2 } from 'lucide-react'

type Notification = {
  id: string
  notification_type: string
  title: string
  message: string
  action_url: string | null
  read: boolean
  created_at: string
}

type Artifact = {
  id: string
  run_id: string
  title: string
  artifact_type: string
  version: number
  created_at: string
}

type Run = {
  id: string
  title: string
  agent_key: string
  status: string
  agent_artifacts: Artifact[]
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

export default function AgentExportsNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [notificationsResponse, runsResponse] = await Promise.all([
        fetch('/api/agents/notifications?limit=20', { cache: 'no-store' }),
        fetch('/api/agents/runs?limit=30', { cache: 'no-store' }),
      ])
      const notificationsPayload = await notificationsResponse.json()
      const runsPayload = await runsResponse.json()
      if (!notificationsResponse.ok) throw new Error(notificationsPayload.error || 'No se pudieron cargar las notificaciones.')
      if (!runsResponse.ok) throw new Error(runsPayload.error || 'No se pudieron cargar las exportaciones.')
      setNotifications(notificationsPayload.notifications || [])
      setRuns(runsPayload.runs || [])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo cargar la información.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const artifacts = useMemo(() => runs.flatMap((run) => (run.agent_artifacts || []).map((artifact) => ({ ...artifact, runTitle: run.title, agentKey: run.agent_key, runStatus: run.status }))).slice(0, 12), [runs])
  const unreadCount = notifications.filter((notification) => !notification.read).length

  async function markAllRead() {
    const response = await fetch('/api/agents/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    })
    const payload = await response.json()
    if (!response.ok) {
      setMessage(payload.error || 'No se pudieron actualizar las notificaciones.')
      return
    }
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })))
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-xl border border-[var(--n3-line)] bg-[var(--n3-dark-surface)] p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-[var(--n3-teal-soft)]" />
            <div>
              <h2 className="font-semibold text-[var(--n3-text-light)]">Exportaciones</h2>
              <p className="text-sm text-[var(--n3-text-muted)]">Descarga reportes y valorizaciones registrados.</p>
            </div>
          </div>
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-[var(--n3-teal-soft)]" /> : null}
        </div>

        <div className="mt-4 space-y-3">
          {artifacts.map((artifact) => (
            <div key={artifact.id} className="rounded-lg border border-[var(--n3-line)] bg-[var(--n3-black)] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--n3-text-light)]">{artifact.title}</p>
                  <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{artifact.agentKey} · v{artifact.version} · {formatDate(artifact.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <a href={`/api/agents/exports?artifactId=${artifact.id}&format=pdf`} className="inline-flex items-center gap-2 rounded-lg border border-[var(--n3-line)] px-3 py-2 text-xs font-semibold text-[var(--n3-text-light)]"><Download className="h-4 w-4" /> PDF</a>
                  <a href={`/api/agents/exports?artifactId=${artifact.id}&format=docx`} className="inline-flex items-center gap-2 rounded-lg border border-[var(--n3-line)] px-3 py-2 text-xs font-semibold text-[var(--n3-text-light)]"><Download className="h-4 w-4" /> DOCX</a>
                </div>
              </div>
            </div>
          ))}
          {!artifacts.length && !loading ? <div className="rounded-lg border border-dashed border-[var(--n3-line)] p-6 text-center text-sm text-[var(--n3-text-muted)]">Todavía no hay artefactos exportables.</div> : null}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--n3-line)] bg-[var(--n3-dark-surface)] p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-[var(--n3-teal-soft)]" />
            <div>
              <h2 className="font-semibold text-[var(--n3-text-light)]">Notificaciones {unreadCount ? `(${unreadCount})` : ''}</h2>
              <p className="text-sm text-[var(--n3-text-muted)]">Revisiones, errores, decisiones y exportaciones.</p>
            </div>
          </div>
          {unreadCount ? <button type="button" onClick={() => void markAllRead()} className="inline-flex items-center gap-2 rounded-lg border border-[var(--n3-line)] px-3 py-2 text-xs text-[var(--n3-text-light)]"><CheckCheck className="h-4 w-4" /> Marcar leídas</button> : null}
        </div>

        {message ? <div className="mt-4 rounded-lg border border-[var(--n3-line)] bg-[var(--n3-black)] px-3 py-2 text-xs text-[var(--n3-text-light)]">{message}</div> : null}

        <div className="mt-4 space-y-3">
          {notifications.map((notification) => (
            <div key={notification.id} className={`rounded-lg border p-4 ${notification.read ? 'border-[var(--n3-line)] bg-[var(--n3-black)]' : 'border-[var(--n3-teal-soft)] bg-[var(--n3-black)]'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--n3-text-light)]">{notification.title}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">{notification.message}</p>
                  <p className="mt-2 text-[10px] text-[var(--n3-text-muted)]">{formatDate(notification.created_at)}</p>
                </div>
                {!notification.read ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--n3-teal-soft)]" /> : null}
              </div>
            </div>
          ))}
          {!notifications.length && !loading ? <div className="rounded-lg border border-dashed border-[var(--n3-line)] p-6 text-center text-sm text-[var(--n3-text-muted)]">No hay notificaciones.</div> : null}
        </div>
      </div>
    </section>
  )
}
