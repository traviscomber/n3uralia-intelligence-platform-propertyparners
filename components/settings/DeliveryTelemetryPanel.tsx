'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart3, CheckCircle2, Clock3, Link2, MessageCircle, RefreshCw, Send, TriangleAlert } from 'lucide-react'

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
  provider_response: Record<string, unknown> | null
}

type DeliverySummary = {
  total: number
  sent: number
  failed: number
  queued: number
  escalated: number
  email: number
  whatsappWeb: number
  webhook: number
  recentSuccessRate: number
  lastSentAt: string | null
  latestCreatedAt: string | null
  byReportType: Array<{ report_type: string; count: number }>
  byChannel: Array<{ channel: DeliveryRow['channel']; count: number }>
  byStatus: Array<{ status: DeliveryRow['status']; count: number }>
}

const statusOptions = [
  { value: '', label: 'Todos los estados' },
  { value: 'sent', label: 'Enviados' },
  { value: 'failed', label: 'Fallidos' },
  { value: 'queued', label: 'En cola' },
  { value: 'escalated', label: 'Escalados' },
]

const channelOptions = [
  { value: '', label: 'Todos los canales' },
  { value: 'email', label: 'Correo' },
  { value: 'whatsapp_web', label: 'WhatsApp Web' },
  { value: 'webhook', label: 'Webhook' },
]

const reportTypeOptions = [
  { value: '', label: 'Todos los reportes' },
  { value: 'weekly_directors', label: 'Directores semanales' },
  { value: 'monthly_ceo', label: 'CEO mensual' },
  { value: 'ceo_brief', label: 'Resumen CEO' },
  { value: 'director_accounts', label: 'Directores de cuenta' },
  { value: 'seller_playbook', label: 'Guion vendedor' },
  { value: 'market_brief', label: 'Resumen de mercado' },
  { value: 'captation_alert', label: 'Alerta de captacion' },
]

function formatDate(value: string | null) {
  if (!value) return 'Sin fecha'
  return new Date(value).toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatLabel(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('es-CL').format(value)
}

function getProviderAttempts(providerResponse: Record<string, unknown> | null) {
  const attempts = providerResponse && typeof providerResponse.attempts === 'number' ? providerResponse.attempts : null
  return attempts ? `${attempts} intento${attempts === 1 ? '' : 's'}` : null
}

export default function DeliveryTelemetryPanel() {
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([])
  const [summary, setSummary] = useState<DeliverySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [channel, setChannel] = useState('')
  const [reportType, setReportType] = useState('')

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    params.set('limit', '25')
    if (status) params.set('status', status)
    if (channel) params.set('channel', channel)
    if (reportType) params.set('report_type', reportType)
    return params.toString()
  }, [channel, reportType, status])

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
        throw new Error(data.error || 'No pudimos cargar la telemetria de entregas.')
      }

      setDeliveries(data.deliveries || [])
      setSummary(data.summary || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos cargar la telemetria de entregas.')
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
      <div className="rounded-2xl border p-4" style={{ borderColor: '#e5e7eb', background: '#fff' }}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em]" style={{ color: '#6b7280' }}>
              Resumen ejecutivo
            </p>
            <p className="mt-2 text-sm font-medium text-gray-900">Telemetria de entregas</p>
            <p className="text-sm text-gray-600">
              Seguimiento de email, WhatsApp Web y webhooks con estado, lote, intentos y marca de tiempo.
            </p>
          </div>
          {summary && (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <div className="rounded-2xl border px-3 py-2" style={{ borderColor: '#e5e7eb', background: '#f9fafb' }}>
                <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: '#6b7280' }}>
                  Exito reciente
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{summary.recentSuccessRate}%</p>
              </div>
              <div className="rounded-2xl border px-3 py-2" style={{ borderColor: '#e5e7eb', background: '#f9fafb' }}>
                <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: '#6b7280' }}>
                  Ultimo envio
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{formatDate(summary.lastSentAt)}</p>
              </div>
              <div className="rounded-2xl border px-3 py-2" style={{ borderColor: '#e5e7eb', background: '#f9fafb' }}>
                <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: '#6b7280' }}>
                  Registro total
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{formatNumber(summary.total)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: '#e5e7eb', background: '#f9fafb', color: '#111827' }}
        >
          {reportTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: '#e5e7eb', background: '#f9fafb', color: '#111827' }}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: '#e5e7eb', background: '#f9fafb', color: '#111827' }}
        >
          {channelOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void loadTelemetry()}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: '#d61f2c' }}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Actualizando' : 'Refrescar'}
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          {[
            { label: 'Total', value: summary.total, icon: Send },
            { label: 'Exitos', value: summary.sent, icon: CheckCircle2 },
            { label: 'Fallos', value: summary.failed, icon: TriangleAlert },
            { label: 'Escalados', value: summary.escalated, icon: BarChart3 },
            { label: 'WhatsApp', value: summary.whatsappWeb, icon: MessageCircle },
            { label: 'Webhook', value: summary.webhook, icon: Link2 },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.label} className="rounded-2xl border p-3" style={{ borderColor: '#e5e7eb', background: '#f9fafb' }}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-[0.18em]" style={{ color: '#6b7280' }}>
                    {item.label}
                  </p>
                  <Icon size={14} style={{ color: '#d61f2c' }} />
                </div>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{formatNumber(item.value)}</p>
              </div>
            )
          })}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border p-4" style={{ borderColor: '#e5e7eb', background: '#fff' }}>
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: '#6b7280' }}>
              Ultimo envio
            </p>
            <p className="mt-2 text-sm font-semibold text-gray-900">{formatDate(summary.lastSentAt)}</p>
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: '#e5e7eb', background: '#fff' }}>
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: '#6b7280' }}>
              Ultima entrada
            </p>
            <p className="mt-2 text-sm font-semibold text-gray-900">{formatDate(summary.latestCreatedAt)}</p>
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: '#e5e7eb', background: '#fff' }}>
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: '#6b7280' }}>
              Tasa reciente
            </p>
            <p className="mt-2 text-sm font-semibold text-gray-900">{summary.recentSuccessRate}%</p>
          </div>
        </div>
      )}

      {summary?.byReportType?.length ? (
        <div className="rounded-2xl border p-4" style={{ borderColor: '#e5e7eb', background: '#fff' }}>
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: '#6b7280' }}>
            Mix por tipo de reporte
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.byReportType.map((item) => (
              <span
                key={item.report_type}
                className="rounded-full border px-3 py-1 text-xs font-medium"
                style={{ borderColor: '#e5e7eb', background: '#f9fafb', color: '#374151' }}
              >
                {formatLabel(item.report_type)} · {formatNumber(item.count)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {summary?.byStatus?.length ? (
        <div className="rounded-2xl border p-4" style={{ borderColor: '#e5e7eb', background: '#fff' }}>
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: '#6b7280' }}>
            Mix por estado
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.byStatus.map((item) => (
              <span
                key={item.status}
                className="rounded-full border px-3 py-1 text-xs font-medium"
                style={{ borderColor: '#e5e7eb', background: '#f9fafb', color: '#374151' }}
              >
                {formatLabel(item.status)} · {formatNumber(item.count)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {summary?.byChannel?.length ? (
        <div className="rounded-2xl border p-4" style={{ borderColor: '#e5e7eb', background: '#fff' }}>
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: '#6b7280' }}>
            Mix por canal
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.byChannel.map((item) => (
              <span
                key={item.channel}
                className="rounded-full border px-3 py-1 text-xs font-medium"
                style={{ borderColor: '#e5e7eb', background: '#f9fafb', color: '#374151' }}
              >
                {formatLabel(item.channel)} · {formatNumber(item.count)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {error && (
        <p className="text-sm" style={{ color: '#b45309' }}>
          {error}
        </p>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 rounded-2xl bg-white/6 animate-pulse" />
            ))}
          </div>
        ) : deliveries.length ? (
          deliveries.map((delivery) => {
            const attempts = getProviderAttempts(delivery.provider_response)
            const isFailed = delivery.status === 'failed'
            const isEscalated = delivery.status === 'escalated'
            return (
              <div
                key={delivery.id}
                className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between"
                style={{ borderColor: '#e5e7eb', background: '#fff' }}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-900">{formatLabel(delivery.report_type)}</p>
                    <span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]" style={{ background: '#f9fafb', color: '#374151' }}>
                      {delivery.channel}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]"
                      style={{
                        background: isFailed ? '#fef2f2' : isEscalated ? '#fff7ed' : '#eef7f4',
                        color: isFailed ? '#991b1b' : isEscalated ? '#9a3412' : '#166534',
                      }}
                    >
                      {delivery.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {delivery.recipient || 'Sin destinatario'} · {formatDate(delivery.created_at)}
                  </p>
                  {delivery.sent_at && (
                    <p className="mt-1 text-xs text-gray-500">Enviado: {formatDate(delivery.sent_at)}</p>
                  )}
                  {delivery.subject && <p className="mt-1 text-xs text-gray-500">{delivery.subject}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    {attempts && (
                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1" style={{ borderColor: '#e5e7eb', background: '#f9fafb' }}>
                        <Clock3 size={12} />
                        {attempts}
                      </span>
                    )}
                    {isEscalated && (
                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1" style={{ borderColor: '#fed7aa', background: '#fff7ed', color: '#9a3412' }}>
                        Escalado
                      </span>
                    )}
                  </div>
                </div>
                {delivery.delivery_url && (
                  <a
                    href={delivery.delivery_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium md:self-start"
                    style={{ borderColor: '#e5e7eb', background: '#f9fafb', color: '#374151' }}
                  >
                    {delivery.channel === 'whatsapp_web'
                      ? 'Abrir WhatsApp Web'
                      : delivery.channel === 'webhook'
                        ? 'Abrir webhook'
                        : 'Abrir entrega'}
                  </a>
                )}
              </div>
            )
          })
        ) : (
          <p className="text-sm text-gray-500">Todavia no hay entregas registradas con este filtro.</p>
        )}
      </div>
    </div>
  )
}

