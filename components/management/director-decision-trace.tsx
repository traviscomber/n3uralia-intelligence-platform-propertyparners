'use client'

import { useEffect, useMemo, useState } from 'react'
import { DecisionTrace } from '@/components/intelligence/decision-trace'
import type { DecisionTraceItem } from '@/lib/intelligence-decision-trace'

type Alert = {
  id: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  detail: string
  entityName: string
}

type SummaryPayload = {
  alerts?: Alert[]
  periodLabel?: string
  dataProvenance?: string
}

type Task = {
  source_key: string | null
  status: string
}

type TasksPayload = {
  tasks?: Task[]
}

export function DirectorDecisionTrace() {
  const [summary, setSummary] = useState<SummaryPayload | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const [summaryResponse, tasksResponse] = await Promise.all([
          fetch('/api/management/summary', { cache: 'no-store' }),
          fetch('/api/management/tasks', { cache: 'no-store' }),
        ])
        if (!summaryResponse.ok || !tasksResponse.ok) throw new Error('TRACE_LOAD_FAILED')
        const [summaryData, tasksData] = await Promise.all([
          summaryResponse.json() as Promise<SummaryPayload>,
          tasksResponse.json() as Promise<TasksPayload>,
        ])
        if (!active) return
        setSummary(summaryData)
        setTasks(tasksData.tasks ?? [])
      } catch {
        if (active) setFailed(true)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  const traces = useMemo<DecisionTraceItem[]>(() => {
    const alerts = summary?.alerts ?? []
    const source = summary?.dataProvenance || 'Resumen de gestión autorizado'
    const cutoff = summary?.periodLabel || null

    return alerts.slice(0, 5).map((alert) => {
      const task = tasks.find((item) => item.source_key === alert.id && ['open', 'in_progress'].includes(item.status))
      return {
        id: `director:${alert.id}`,
        domain: 'executive',
        title: `${alert.entityName} · ${alert.title}`,
        evidenceStatus: 'documentary_canonical',
        evidenceLabel: alert.detail,
        source,
        cutoff,
        ruleOrigin: 'n3uralia_provisional',
        ruleVersion: 'management-summary-alerts/2026-08',
        severity: alert.severity === 'critical' ? 'critical' : alert.severity === 'warning' ? 'warning' : 'info',
        confidence: 'high',
        action: task ? `Tarea ${task.status === 'in_progress' ? 'en curso' : 'abierta'} para esta señal.` : 'Revisar la brecha y crear una tarea si requiere seguimiento.',
        href: task ? '/dashboard/director/tareas' : '/dashboard/director',
        evidenceCount: 1,
      }
    })
  }, [summary, tasks])

  if (!summary && !failed) return null

  if (failed) {
    return (
      <div className="px-4 lg:px-8">
        <section role="status" aria-label="Trazabilidad de decisiones de oficina" className="mt-6 border-y border-[var(--n3-line)] py-4 text-xs text-[var(--n3-text-muted)]">
          La trazabilidad no está disponible en este momento. El dashboard operativo permanece disponible y no se muestran inferencias sin evidencia.
        </section>
      </div>
    )
  }

  if (!traces.length) {
    return (
      <div className="px-4 lg:px-8">
        <section aria-label="Trazabilidad de decisiones de oficina" className="mt-6 border-y border-[var(--n3-line)] py-4 text-xs text-[var(--n3-text-muted)]">
          No hay señales prioritarias con trazabilidad disponible para este corte.
        </section>
      </div>
    )
  }

  return (
    <div className="px-4 lg:px-8">
      <DecisionTrace items={traces} title="Trazabilidad de decisiones de oficina" />
    </div>
  )
}
