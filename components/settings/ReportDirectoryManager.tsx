'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, UserPlus } from 'lucide-react'

type Person = { id: string; full_name: string; email: string | null; phone: string | null; person_role: 'ceo' | 'director' | 'executive'; source_key: string | null; origin: string; active: boolean }
type Assignment = { id: string; person_id: string; branch_name: string; assignment_role: 'director' | 'executive'; origin: string; active: boolean; person: { full_name: string } | null }
type Subscription = { id: string; person_id: string; audience: 'ceo' | 'director-cuenta' | 'ejecutivo'; channel: 'email' | 'whatsapp_web' | 'webhook'; recipient: string; cadence: 'weekly' | 'monthly' | 'manual'; active: boolean; person: { full_name: string } | null }
type AuditRow = { id: number; action: string; entity_type: string; entity_id: string; created_at: string }
type Candidate = { name: string; branch: string; sourceKey: string }
type Payload = { people: Person[]; assignments: Assignment[]; subscriptions: Subscription[]; auditLog: AuditRow[]; candidates: { branches: string[]; partners: Candidate[] }; error?: string }

const field = 'border border-[var(--n3-line)] bg-[var(--n3-black)] px-3 py-2 text-sm text-[var(--n3-text-light)] outline-none focus:border-[var(--n3-teal)]'
const button = 'border border-[var(--n3-teal)] bg-[var(--n3-teal)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50'
const secondary = 'border border-[var(--n3-line)] bg-[var(--n3-black)] px-3 py-2 text-xs font-semibold text-[var(--n3-text-light)]'

export default function ReportDirectoryManager() {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [person, setPerson] = useState({ full_name: '', email: '', phone: '', person_role: 'executive' })
  const [assignment, setAssignment] = useState({ person_id: '', branch_name: '', assignment_role: 'executive' })
  const [subscription, setSubscription] = useState({ person_id: '', audience: 'ejecutivo', channel: 'email', recipient: '', cadence: 'weekly' })

  async function load() {
    setLoading(true); setError(null)
    try {
      const response = await fetch('/api/report-directory', { cache: 'no-store' })
      const body = await response.json() as Payload
      if (!response.ok) throw new Error(body.error || 'No pudimos cargar el directorio.')
      setData(body)
      if (!assignment.branch_name && body.candidates.branches[0]) setAssignment((value) => ({ ...value, branch_name: body.candidates.branches[0] }))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No pudimos cargar el directorio.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  async function mutate(method: 'POST' | 'PATCH' | 'DELETE', body: Record<string, unknown>) {
    setError(null)
    const response = await fetch('/api/report-directory', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const result = await response.json() as { item?: Person; error?: string }
    if (!response.ok) throw new Error(result.error || 'No pudimos guardar el cambio.')
    await load()
    return result.item
  }

  async function createPerson(event: React.FormEvent) {
    event.preventDefault()
    try { await mutate('POST', { entity: 'person', ...person, origin: 'administrative', active: true }); setPerson({ full_name: '', email: '', phone: '', person_role: 'executive' }) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No pudimos crear la persona.') }
  }

  async function importCandidate(candidate: Candidate) {
    try {
      const created = await mutate('POST', { entity: 'person', full_name: candidate.name, person_role: 'executive', source_key: candidate.sourceKey, origin: 'source_candidate', active: true })
      if (created) await mutate('POST', { entity: 'assignment', person_id: created.id, branch_name: candidate.branch, assignment_role: 'executive', origin: 'source_confirmed', active: true })
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No pudimos incorporar el candidato.') }
  }

  async function editPerson(item: Person) {
    const full_name = window.prompt('Nombre', item.full_name)?.trim()
    if (!full_name) return
    const email = window.prompt('Correo (opcional)', item.email || '')?.trim() || ''
    try { await mutate('PATCH', { entity: 'person', id: item.id, full_name, email }) } catch (reason) { setError(reason instanceof Error ? reason.message : 'No pudimos editar la persona.') }
  }

  const people = data?.people || []
  const activePeople = people.filter((item) => item.active)
  const unimported = (data?.candidates.partners || []).filter((candidate) => !people.some((item) => item.source_key === candidate.sourceKey))

  return <div className="space-y-8" aria-busy={loading}>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-semibold">Personas y asignaciones</h3><p className="mt-1 text-sm text-[var(--n3-text-muted)]">Directorio administrativo separado de CRM, Metas y presentaciones auditadas.</p></div><button type="button" className={secondary} onClick={() => void load()}><RefreshCw className="mr-2 inline h-4 w-4" />Actualizar</button></div>
    {error && <p className="border border-[var(--n3-line)] bg-[var(--accent)] p-3 text-sm text-[var(--n3-teal-soft)]">{error}</p>}
    {loading && !data ? <p className="text-sm text-[var(--n3-text-muted)]">Cargando directorio…</p> : null}

    <section className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
      <form onSubmit={createPerson} className="space-y-3 border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5"><p className="text-xs font-bold uppercase tracking-widest text-[var(--n3-teal-soft)]">Nueva persona</p><input required className={`${field} w-full`} placeholder="Nombre completo" value={person.full_name} onChange={(event) => setPerson({ ...person, full_name: event.target.value })} /><input className={`${field} w-full`} type="email" placeholder="Correo" value={person.email} onChange={(event) => setPerson({ ...person, email: event.target.value })} /><input className={`${field} w-full`} placeholder="Teléfono opcional" value={person.phone} onChange={(event) => setPerson({ ...person, phone: event.target.value })} /><select className={`${field} w-full`} value={person.person_role} onChange={(event) => setPerson({ ...person, person_role: event.target.value })}><option value="executive">Ejecutivo / Partner</option><option value="director">Director de Cuenta</option><option value="ceo">CEO</option></select><button className={button}><UserPlus className="mr-2 inline h-4 w-4" />Crear persona</button></form>
      <div className="border border-[var(--n3-line)] bg-[var(--n3-deep)]"><div className="border-b border-[var(--n3-line)] p-4"><p className="text-xs font-bold uppercase tracking-widest text-[var(--n3-teal-soft)]">Directorio activo</p></div><div className="max-h-80 overflow-auto">{people.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 border-b border-[var(--n3-line)] p-4 last:border-0"><div><p className="font-semibold">{item.full_name}</p><p className="text-xs text-[var(--n3-text-muted)]">{item.person_role} · {item.email || 'sin correo'} · {item.origin}</p></div><div className="flex gap-2"><button className={secondary} onClick={() => void editPerson(item)}>Editar</button><button className={secondary} disabled={!item.active} onClick={() => void mutate('DELETE', { entity: 'person', id: item.id })}>{item.active ? 'Desactivar' : 'Inactivo'}</button></div></div>)}</div></div>
    </section>

    <section className="grid gap-5 xl:grid-cols-2">
      <form className="space-y-3 border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5" onSubmit={async (event) => { event.preventDefault(); try { await mutate('POST', { entity: 'assignment', ...assignment, origin: 'administrative', active: true }) } catch (reason) { setError(reason instanceof Error ? reason.message : 'No pudimos crear la asignación.') } }}><p className="text-xs font-bold uppercase tracking-widest text-[var(--n3-teal-soft)]">Asignar sucursal</p><select required className={`${field} w-full`} value={assignment.person_id} onChange={(event) => setAssignment({ ...assignment, person_id: event.target.value })}><option value="">Seleccionar persona</option>{activePeople.map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select><select className={`${field} w-full`} value={assignment.branch_name} onChange={(event) => setAssignment({ ...assignment, branch_name: event.target.value })}>{data?.candidates.branches.map((branch) => <option key={branch}>{branch}</option>)}</select><select className={`${field} w-full`} value={assignment.assignment_role} onChange={(event) => setAssignment({ ...assignment, assignment_role: event.target.value })}><option value="executive">Ejecutivo</option><option value="director">Director</option></select><button className={button}>Guardar asignación</button><div className="space-y-2 pt-2">{data?.assignments.map((item) => <div key={item.id} className="flex justify-between border-t border-[var(--n3-line)] pt-2 text-sm"><span>{item.person?.full_name} · {item.branch_name} · {item.assignment_role}</span><button type="button" className="text-xs text-[var(--n3-teal-soft)]" disabled={!item.active} onClick={() => void mutate('DELETE', { entity: 'assignment', id: item.id })}>{item.active ? 'Desactivar' : 'Inactiva'}</button></div>)}</div></form>
      <form className="space-y-3 border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5" onSubmit={async (event) => { event.preventDefault(); try { await mutate('POST', { entity: 'subscription', ...subscription, active: true }) } catch (reason) { setError(reason instanceof Error ? reason.message : 'No pudimos crear la suscripción.') } }}><p className="text-xs font-bold uppercase tracking-widest text-[var(--n3-teal-soft)]">Suscripción de reporte</p><select required className={`${field} w-full`} value={subscription.person_id} onChange={(event) => setSubscription({ ...subscription, person_id: event.target.value })}><option value="">Seleccionar persona</option>{activePeople.map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select><div className="grid grid-cols-2 gap-2"><select className={`${field} w-full`} value={subscription.audience} onChange={(event) => setSubscription({ ...subscription, audience: event.target.value })}><option value="ejecutivo">Ejecutivo</option><option value="director-cuenta">Director de Cuenta</option><option value="ceo">CEO</option></select><select className={`${field} w-full`} value={subscription.channel} onChange={(event) => setSubscription({ ...subscription, channel: event.target.value })}><option value="email">Email</option><option value="whatsapp_web">WhatsApp Web</option><option value="webhook">Webhook</option></select></div><input required className={`${field} w-full`} placeholder="Destinatario" value={subscription.recipient} onChange={(event) => setSubscription({ ...subscription, recipient: event.target.value })} /><select className={`${field} w-full`} value={subscription.cadence} onChange={(event) => setSubscription({ ...subscription, cadence: event.target.value })}><option value="weekly">Semanal</option><option value="monthly">Mensual</option><option value="manual">Manual</option></select><button className={button}>Guardar suscripción</button><div className="space-y-2 pt-2">{data?.subscriptions.map((item) => <div key={item.id} className="flex justify-between border-t border-[var(--n3-line)] pt-2 text-sm"><span>{item.person?.full_name} · {item.audience} · {item.channel}</span><button type="button" className="text-xs text-[var(--n3-teal-soft)]" disabled={!item.active} onClick={() => void mutate('DELETE', { entity: 'subscription', id: item.id })}>{item.active ? 'Desactivar' : 'Inactiva'}</button></div>)}</div></form>
    </section>

    <section className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5"><p className="text-xs font-bold uppercase tracking-widest text-[var(--n3-teal-soft)]">Candidatos desde presentaciones ({unimported.length})</p><p className="mt-2 text-sm text-[var(--n3-text-muted)]">La incorporación es manual y conserva la procedencia; no crea una cuenta de acceso.</p><div className="mt-4 grid max-h-72 gap-px overflow-auto bg-[var(--n3-line)] md:grid-cols-2 xl:grid-cols-3">{unimported.map((candidate) => <div key={candidate.sourceKey} className="flex items-center justify-between gap-3 bg-[var(--n3-black)] p-3"><div><p className="text-sm font-semibold">{candidate.name}</p><p className="text-xs text-[var(--n3-text-muted)]">{candidate.branch}</p></div><button className={secondary} onClick={() => void importCandidate(candidate)}>Incorporar</button></div>)}</div></section>

    <details className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5"><summary className="cursor-pointer text-sm font-semibold">Historial administrativo ({data?.auditLog.length || 0})</summary><div className="mt-4 space-y-2">{data?.auditLog.map((item) => <p key={item.id} className="text-xs text-[var(--n3-text-muted)]">{new Date(item.created_at).toLocaleString('es-CL')} · {item.action} · {item.entity_type} · {item.entity_id}</p>)}</div></details>
  </div>
}
