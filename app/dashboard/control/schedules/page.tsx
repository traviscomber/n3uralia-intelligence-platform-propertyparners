'use client'

import { useEffect, useState } from 'react'

type Entity = {
  id: string
  name: string
  entity_type: string
}

type Schedule = {
  id: string
  name: string
  report_type: string
  entity_id: string | null
  cadence: string
  day_of_month: number
  recipients: string[]
  active: boolean
  next_run_at: string | null
  last_run_at: string | null
  management_entities?: { name: string; entity_type: string } | null
}

type ScheduleForm = {
  name: string
  reportType: string
  entityId: string
  cadence: string
  dayOfMonth: string
  recipients: string
  active: boolean
}

const emptyForm: ScheduleForm = {
  name: 'Reporte mensual ejecutivo',
  reportType: 'monthly',
  entityId: '',
  cadence: 'monthly',
  dayOfMonth: '1',
  recipients: '',
  active: true,
}

function recipientsFromText(value: string) {
  return value.split(/[;,\n]/).map((item) => item.trim()).filter(Boolean)
}

export default function ManagementSchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ScheduleForm>(emptyForm)

  async function load() {
    setLoading(true)
    const response = await fetch('/api/management/schedules', { cache: 'no-store' })
    const data = await response.json()
    if (response.ok) {
      setSchedules(data.schedules ?? [])
      setEntities(data.entities ?? [])
    } else {
      setMessage(data.error || 'No fue posible cargar las programaciones.')
    }
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
  }

  function editSchedule(schedule: Schedule) {
    setEditingId(schedule.id)
    setForm({
      name: schedule.name,
      reportType: schedule.report_type,
      entityId: schedule.entity_id ?? '',
      cadence: schedule.cadence,
      dayOfMonth: String(schedule.day_of_month),
      recipients: Array.isArray(schedule.recipients) ? schedule.recipients.join('; ') : '',
      active: schedule.active,
    })
    setMessage('Editando programación seleccionada.')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    const response = await fetch('/api/management/schedules', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: editingId,
        ...form,
        dayOfMonth: Number(form.dayOfMonth),
        recipients: recipientsFromText(form.recipients),
      }),
    })
    const data = await response.json()
    if (response.ok) {
      setMessage(editingId ? `Programación actualizada: ${data.schedule.name}.` : `Programación creada: ${data.schedule.name}.`)
      resetForm()
      await load()
    } else {
      setMessage(data.error || 'No fue posible guardar la programación.')
    }
    setSaving(false)
  }

  async function toggleSchedule(schedule: Schedule) {
    setMessage('')
    const response = await fetch('/api/management/schedules', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: schedule.id, active: !schedule.active }),
    })
    const data = await response.json()
    if (response.ok) {
      setMessage(`Programación ${data.schedule.active ? 'activada' : 'desactivada'}: ${data.schedule.name}.`)
      if (editingId === schedule.id) resetForm()
      await load()
    } else {
      setMessage(data.error || 'No fue posible cambiar el estado.')
    }
  }

  return (
    <div className="space-y-7">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">Administración · Automatización</p>
        <h1 className="mt-2 text-3xl font-semibold">Programación de reportes</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--n3-text-muted)]">Crear, editar, activar o suspender reportes recurrentes. Los cambios quedan sujetos a la cola de entrega y a la configuración segura del proveedor de correo.</p>
      </header>

      <form onSubmit={save} className="grid gap-4 border border-[var(--n3-line)] p-5 lg:grid-cols-3">
        <div className="lg:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">{editingId ? 'Editar programación' : 'Nueva programación'}</p>
        </div>
        <label className="text-sm">Nombre
          <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 w-full border border-[var(--n3-line)] bg-transparent p-3" />
        </label>
        <label className="text-sm">Tipo
          <select value={form.reportType} onChange={(event) => setForm({ ...form, reportType: event.target.value })} className="mt-2 w-full border border-[var(--n3-line)] bg-[var(--n3-black)] p-3">
            <option value="monthly">Mensual</option>
            <option value="cumulative">Acumulado</option>
            <option value="executive">Ejecutivo</option>
            <option value="office">Oficina</option>
            <option value="partner">Partner</option>
          </select>
        </label>
        <label className="text-sm">Entidad
          <select value={form.entityId} onChange={(event) => setForm({ ...form, entityId: event.target.value })} className="mt-2 w-full border border-[var(--n3-line)] bg-[var(--n3-black)] p-3">
            <option value="">Consolidado</option>
            {entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name} · {entity.entity_type}</option>)}
          </select>
        </label>
        <label className="text-sm">Frecuencia
          <select value={form.cadence} onChange={(event) => setForm({ ...form, cadence: event.target.value })} className="mt-2 w-full border border-[var(--n3-line)] bg-[var(--n3-black)] p-3">
            <option value="monthly">Mensual</option>
            <option value="quarterly">Trimestral</option>
            <option value="yearly">Anual</option>
          </select>
        </label>
        <label className="text-sm">Día del mes
          <input required type="number" min="1" max="28" value={form.dayOfMonth} onChange={(event) => setForm({ ...form, dayOfMonth: event.target.value })} className="mt-2 w-full border border-[var(--n3-line)] bg-transparent p-3" />
        </label>
        <label className="text-sm">Destinatarios
          <input value={form.recipients} onChange={(event) => setForm({ ...form, recipients: event.target.value })} placeholder="correo1@dominio.cl; correo2@dominio.cl" className="mt-2 w-full border border-[var(--n3-line)] bg-transparent p-3" />
        </label>
        <label className="flex items-center gap-3 text-sm lg:col-span-3">
          <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
          Programación activa
        </label>
        <div className="flex flex-wrap gap-3 lg:col-span-3">
          <button disabled={saving} className="border border-[#d7332b] px-5 py-3 text-sm disabled:opacity-50">{saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear programación'}</button>
          {editingId ? <button type="button" onClick={resetForm} className="border border-[var(--n3-line)] px-5 py-3 text-sm">Cancelar edición</button> : null}
        </div>
      </form>

      {message ? <div className="border border-[var(--n3-line)] p-4 text-sm">{message}</div> : null}

      <section>
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Programaciones registradas</h2>
          <button type="button" onClick={() => void load()} className="border border-[var(--n3-line)] px-3 py-2 text-xs">Actualizar</button>
        </div>
        <div className="overflow-x-auto border border-[var(--n3-line)]">
          <table className="min-w-[1050px] w-full text-sm">
            <thead>
              <tr>{['Nombre', 'Ámbito', 'Tipo', 'Frecuencia', 'Día', 'Destinatarios', 'Próxima ejecución', 'Estado', 'Acciones'].map((item) => <th key={item} className="p-3 text-left text-xs uppercase text-[var(--n3-text-muted)]">{item}</th>)}</tr>
            </thead>
            <tbody>
              {!loading && schedules.length === 0 ? <tr><td colSpan={9} className="border-t border-[var(--n3-line)] p-6 text-center text-[var(--n3-text-muted)]">No hay programaciones registradas.</td></tr> : null}
              {schedules.map((item) => (
                <tr key={item.id} className="border-t border-[var(--n3-line)]">
                  <td className="p-3 font-medium">{item.name}</td>
                  <td className="p-3">{item.management_entities?.name ?? 'Consolidado'}</td>
                  <td className="p-3">{item.report_type}</td>
                  <td className="p-3">{item.cadence}</td>
                  <td className="p-3">{item.day_of_month}</td>
                  <td className="p-3">{Array.isArray(item.recipients) ? item.recipients.length : 0}</td>
                  <td className="p-3">{item.next_run_at ? new Date(item.next_run_at).toLocaleString('es-CL') : 'Pendiente'}</td>
                  <td className="p-3">{item.active ? 'Activa' : 'Inactiva'}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => editSchedule(item)} className="border border-[var(--n3-line)] px-3 py-2 text-xs">Editar</button>
                      <button type="button" onClick={() => void toggleSchedule(item)} className="border border-[var(--n3-line)] px-3 py-2 text-xs">{item.active ? 'Desactivar' : 'Activar'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
