'use client'

import { useEffect, useState } from 'react'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'

type DeliveryTarget = {
  id: number
  label: string
  channel: 'email' | 'whatsapp_web' | 'webhook'
  recipient: string
  active: boolean
  notify_weekly: boolean
  notes: string | null
}

const initialForm = {
  label: '',
  channel: 'email' as 'email' | 'whatsapp_web' | 'webhook',
  recipient: '',
  active: true,
  notify_weekly: true,
  notes: '',
}

export default function ReportDeliveryTargetsManager() {
  const [targets, setTargets] = useState<DeliveryTarget[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState(initialForm)

  async function loadTargets() {
    setRefreshing(true)
    setError(null)
    try {
      const res = await fetch('/api/report-delivery-targets', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'No pudimos cargar los destinatarios.')
      setTargets((json.targets || []) as DeliveryTarget[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos cargar los destinatarios.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadTargets()
  }, [])

  async function handleCreate() {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/report-delivery-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'No pudimos crear el destinatario.')
      setMessage('Destinatario creado.')
      setForm(initialForm)
      await loadTargets()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos crear el destinatario.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(target: DeliveryTarget, field: 'active' | 'notify_weekly') {
    setError(null)
    try {
      const res = await fetch('/api/report-delivery-targets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: target.id, [field]: !target[field] }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'No pudimos actualizar el destinatario.')
      await loadTargets()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos actualizar el destinatario.')
    }
  }

  async function handleDelete(target: DeliveryTarget) {
    setError(null)
    try {
      const res = await fetch('/api/report-delivery-targets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: target.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'No pudimos eliminar el destinatario.')
      setMessage('Destinatario eliminado.')
      await loadTargets()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos eliminar el destinatario.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <input
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          placeholder="Nombre del destinatario"
          className="rounded-lg border px-3 py-2 text-sm text-gray-900"
          style={{ borderColor: '#e5e7eb', background: '#f9fafb' }}
        />
        <select
          value={form.channel}
          onChange={(e) => setForm({ ...form, channel: e.target.value as 'email' | 'whatsapp_web' | 'webhook' })}
          className="rounded-lg border px-3 py-2 text-sm text-gray-900"
          style={{ borderColor: '#e5e7eb', background: '#f9fafb' }}
        >
          <option value="email">Correo</option>
          <option value="whatsapp_web">WhatsApp Web</option>
          <option value="webhook">Webhook</option>
        </select>
        <input
          value={form.recipient}
          onChange={(e) => setForm({ ...form, recipient: e.target.value })}
          placeholder={form.channel === 'email' ? 'correo@empresa.com' : form.channel === 'whatsapp_web' ? '+56912345678' : 'https://hooks.example.com/report'}
          className="rounded-lg border px-3 py-2 text-sm text-gray-900 md:col-span-2"
          style={{ borderColor: '#e5e7eb', background: '#f9fafb' }}
        />
        <input
          value={form.notes || ''}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Notas opcionales"
          className="rounded-lg border px-3 py-2 text-sm text-gray-900 md:col-span-2"
          style={{ borderColor: '#e5e7eb', background: '#f9fafb' }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => void handleCreate()}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: 'var(--n3-teal)' }}
        >
          <Plus size={14} />
          {saving ? 'Guardando...' : 'Agregar destinatario'}
        </button>
        <button
          onClick={() => void loadTargets()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold"
          style={{ borderColor: '#e5e7eb', background: '#fff', color: '#374151' }}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refrescar
        </button>
      </div>

      {error && <p className="text-sm" style={{ color: '#b45309' }}>{error}</p>}
      {message && <p className="text-sm" style={{ color: '#166534' }}>{message}</p>}

      <div className="space-y-2">
        {loading ? (
          <p className="text-sm" style={{ color: '#6b7280' }}>Cargando destinatarios...</p>
        ) : targets.length ? (
          targets.map((target) => (
            <div key={target.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between" style={{ borderColor: '#e5e7eb', background: '#f9fafb' }}>
              <div>
                <p className="font-semibold text-gray-900">{target.label}</p>
                <p className="text-sm" style={{ color: '#374151' }}>{target.channel} Â· {target.recipient}</p>
                {target.notes && <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{target.notes}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => void handleToggle(target, 'active')}
                  className="rounded-md px-3 py-1.5 text-xs font-medium"
                  style={{ background: target.active ? '#f9fafb' : '#fef2f2', color: target.active ? '#166534' : '#991b1b' }}
                >
                  {target.active ? 'Activo' : 'Inactivo'}
                </button>
                <button
                  onClick={() => void handleToggle(target, 'notify_weekly')}
                  className="rounded-md px-3 py-1.5 text-xs font-medium"
                  style={{ background: target.notify_weekly ? '#f9fafb' : '#f9fafb', color: target.notify_weekly ? '#166534' : '#374151' }}
                >
                  {target.notify_weekly ? 'Incluido semanal' : 'Excluido semanal'}
                </button>
                <button
                  onClick={() => void handleDelete(target)}
                  className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium"
                  style={{ background: '#fef2f2', color: '#991b1b' }}
                >
                  <Trash2 size={13} />
                  Eliminar
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm" style={{ color: '#6b7280' }}>Todavía no hay destinatarios configurados.</p>
        )}
      </div>
    </div>
  )
}

