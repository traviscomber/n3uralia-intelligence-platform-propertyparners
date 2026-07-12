'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, MessageCircle, RefreshCw, Send, TriangleAlert, Link2 } from 'lucide-react'

type DeliveryRow = {
  id: number
  report_type: string
  channel: 'email' | 'whatsapp_web' | 'webhook'
  recipient: string | null
  delivery_url: string | null
  status: 'queued' | 'sent' | 'failed' | 'escalated'
  subject: string | null
  created_at: string
  sent_at: string | null
}

type DeliverySummary = {
  total: number
  sent: number
  failed: number
  queued: number
  email: number
  whatsappWeb: number
  webhook: number
  recentSuccessRate: number
  lastSentAt: string | null
}

const statusOptions = [
  { value: '', label: 'Todos' },
  { value: 'sent', label: 'Enviados' },
  { value: 'failed', label: 'Fallidos' },
  { value: 'queued', label: 'En cola' },
  { value: 'escalated', label: 'Escalados' },
]

const channelOptions = [
  { value: '', label: 'Todos' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp_web', label: 'WhatsApp Web' },
  { value: 'webhook', label: 'Webhook' },
]

export default function DeliveryTelemetryPanel() {
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([])
  const [summary, setSummary] = useState<DeliverySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [channel, setChannel] = useState('')

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    params.set('limit', '25')
    if (status) params.set('status', status)
    if (channel) params.set('channel', channel)
    return params.toString()
  }, [channel, status])

  async function loadTelemetry() {
    setRefreshing(true)
    setError(null)
    try {
      const response = await fetch(`/api/report-deliveries?${queryString}`, { cache: 'no-store' })
      const data = (await response.json()) as {
        error?: string
        deliveries?: DeliveryRow[]
        summary?: DeliverySummary
      }

      if (!response.ok) {
        throw new Error(data.error || 'No pudimos cargar la telemetría de entregas.')
      }

      setDeliveries(data.deliveries || [])
      setSummary(data.summary || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos cargar la telemetría de entregas.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadTelemetry()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">Telemetría de entregas</p>
          <p className="text-sm text-gray-600">Historial de email, WhatsApp Web y webhooks generado por el cron semanal.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: '#d8e5e2', background: '#f5f9f7', color: '#111827' }}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: '#d8e5e2', background: '#f5f9f7', color: '#111827' }}
          >
            {channelOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void loadTelemetry()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: '#8fb2aa' }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refrescar
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            { label: 'Total', value: summary.total, icon: Send },
            { label: 'Exitos', value: summary.sent, icon: CheckCircle2 },
            { label: 'Fallos', value: summary.failed, icon: TriangleAlert },
            { label: 'WhatsApp', value: summary.whatsappWeb, icon: MessageCircle },
            { label: 'Webhook', value: summary.webhook, icon: Link2 },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.label} className="rounded-2xl border p-3" style={{ borderColor: '#d8e5e2', background: '#f5f9f7' }}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-[0.18em]" style={{ color: '#9ca9a3' }}>{item.label}</p>
                  <Icon size={14} style={{ color: '#8fb2aa' }} />
                </div>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{item.value}</p>
              </div>
            )
          })}
        </div>
      )}

      {error && <p className="text-sm" style={{ color: '#b45309' }}>{error}</p>}

      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-gray-500">Cargando telemetría...</p>
        ) : deliveries.length ? (
          deliveries.map((delivery) => (
            <div key={delivery.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between" style={{ borderColor: '#d8e5e2', background: '#fff' }}>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-gray-900">{delivery.report_type}</p>
                  <span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]" style={{ background: '#e8f3f0', color: '#555a56' }}>
                    {delivery.channel}
                  </span>
                  <span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]" style={{ background: delivery.status === 'failed' ? '#fef2f2' : '#eef7f4', color: delivery.status === 'failed' ? '#991b1b' : '#166534' }}>
                    {delivery.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{delivery.recipient || 'Sin destinatario'} · {new Date(delivery.created_at).toLocaleString('es-CL')}</p>
                {delivery.subject && <p className="mt-1 text-xs text-gray-500">{delivery.subject}</p>}
              </div>
              {delivery.delivery_url && (
                <a
                  href={delivery.delivery_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium"
                  style={{ borderColor: '#d8e5e2', background: '#f5f9f7', color: '#555a56' }}
                >
                  {delivery.channel === 'whatsapp_web' ? 'Abrir WhatsApp Web' : delivery.channel === 'webhook' ? 'Abrir webhook' : 'Abrir entrega'}
                </a>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">Todavía no hay entregas registradas con este filtro.</p>
        )}
      </div>
    </div>
  )
}
