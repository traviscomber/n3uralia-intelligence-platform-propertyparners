'use client'

import Link from 'next/link'

export type Property360InternalOperationsData = {
  linked: boolean
  legacyPropertyId: string | null
  permissions: {
    canReadProperties: boolean
    canReadValuations: boolean
  }
  coverage: {
    assignments: 'available' | 'not_informed' | 'restricted' | 'not_linked'
    valuations: 'available' | 'not_informed' | 'restricted' | 'not_linked'
    crmActivity: 'available' | 'not_informed'
  }
  currentAssignment: {
    id: string
    assignedTo: string | null
    assignedToName: string | null
    assignedToRole: string | null
    team: string | null
    assignmentRole: string | null
    status: string | null
    notes: string | null
    assignedAt: string | null
    endedAt: string | null
    updatedAt: string | null
  } | null
  assignmentHistory: Array<{
    id: number
    assignmentId: string | null
    assignedTo: string | null
    action: string
    createdAt: string
  }>
  latestValuation: {
    id: string
    status: string
    valuationDate: string | null
    estimatedValueUf: number | null
    lowValueUf: number | null
    highValueUf: number | null
    confidence: string | null
    methodologyVersion: string | null
    versionNumber: number | null
    createdAt: string | null
    updatedAt: string | null
    reviewedAt: string | null
    approvedAt: string | null
    issuedAt: string | null
  } | null
  prospect: {
    id: string
    status: string
    priority: string
    directorKey: string
    directorName: string | null
    directorRole: string | null
    officeName: string | null
    assignedAt: string
    firstContactAt: string | null
    lastFollowUpAt: string | null
    nextFollowUpAt: string | null
    wonAt: string | null
    lostAt: string | null
    latestNote: string | null
    updatedAt: string
    events: Array<{
      id: number
      event_type: string
      from_status: string | null
      to_status: string | null
      note: string | null
      occurred_at: string
    }>
  } | null
  valuations: Array<{
    id: string
    status: string
    valuationDate: string | null
    estimatedValueUf: number | null
    confidence: string | null
    methodologyVersion: string | null
    versionNumber: number | null
    createdAt: string | null
    issuedAt: string | null
  }>
  limitation: string
}

const n0 = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })

function date(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString('es-CL') : '—'
}

function uf(value: number | null | undefined) {
  return value == null ? '—' : `UF ${n0.format(value)}`
}

function coverageLabel(value: Property360InternalOperationsData['coverage']['assignments']) {
  if (value === 'available') return 'Disponible'
  if (value === 'restricted') return 'Restringido'
  if (value === 'not_linked') return 'Sin vínculo canónico'
  return 'No informado'
}

function prospectStatus(value: string | null | undefined) {
  const labels: Record<string, string> = {
    new: 'Nuevo',
    assigned: 'Asignado',
    contacting: 'Contacto',
    qualified: 'Calificado',
    valuation: 'Valorización',
    proposal: 'Propuesta',
    won: 'Ganado',
    lost: 'Perdido',
    archived: 'Archivado',
  }
  return value ? labels[value] ?? value : 'Sin lead'
}

function valuationStatus(value: string | null | undefined) {
  const labels: Record<string, string> = {
    draft: 'Borrador',
    review: 'En revisión',
    returned: 'Devuelta',
    approved: 'Aprobada',
    issued: 'Emitida',
  }
  return value ? labels[value] ?? value : 'Sin valorización'
}

export function Property360InternalOperations({ data }: { data: Property360InternalOperationsData }) {
  const assignment = data.currentAssignment
  const valuation = data.latestValuation
  const prospect = data.prospect
  const coverageItems = [
    { label: 'Asignación', value: coverageLabel(data.coverage.assignments) },
    { label: 'Valorización', value: coverageLabel(data.coverage.valuations) },
    { label: 'Lead', value: data.coverage.crmActivity === 'available' ? 'Disponible' : 'No informado' },
  ]
  const nextAction = prospect
    ? prospect.status === 'won' || prospect.status === 'lost' || prospect.status === 'archived'
      ? 'Lead cerrado: revisar resultado y trazabilidad final.'
      : prospect.nextFollowUpAt
        ? `Próximo seguimiento: ${date(prospect.nextFollowUpAt)}.`
        : 'Definir próximo seguimiento para mantener trazabilidad operativa.'
    : valuation
      ? 'La propiedad tiene valorización, pero aún no un lead de prospección.'
      : assignment
        ? 'Responsable asignado; evaluar valorización o creación de lead según oportunidad.'
        : 'Sin operación interna registrada para esta propiedad.'

  return <section className="mt-7">
    <div className="flex flex-col gap-2 border-b border-[var(--n3-line)] pb-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Operación interna · Property 360</p>
        <h2 className="mt-1 text-lg font-medium text-[var(--n3-text-light)]">Responsable, valorización y cobertura comercial</h2>
      </div>
      <span className="text-xs text-[var(--n3-text-muted)]">{data.linked ? 'Vínculo canónico confirmado' : 'Sin vínculo interno'}</span>
    </div>

    <div className="grid gap-px bg-[var(--n3-line)] sm:grid-cols-3">
      <div className="bg-[var(--n3-deep)] p-4">
        <p className="text-xs text-[var(--n3-text-muted)]">Responsable actual</p>
        <p className="mt-2 text-lg font-semibold text-[var(--n3-text-light)]">{assignment?.assignedToName || coverageLabel(data.coverage.assignments)}</p>
        <p className="mt-1 text-xs text-[var(--n3-text-muted)]">
          {assignment ? [assignment.assignmentRole, assignment.team, date(assignment.assignedAt)].filter(Boolean).join(' · ') : 'No existe una asignación visible para esta propiedad.'}
        </p>
      </div>
      <div className="bg-[var(--n3-deep)] p-4">
        <p className="text-xs text-[var(--n3-text-muted)]">Valorización</p>
        <p className="mt-2 text-lg font-semibold text-[var(--n3-text-light)]">{valuationStatus(valuation?.status)}</p>
        <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{valuation ? `${uf(valuation.estimatedValueUf)} · ${date(valuation.valuationDate || valuation.createdAt)}` : coverageLabel(data.coverage.valuations)}</p>
        {valuation && data.permissions.canReadValuations ? <Link href={`/dashboard/valuations/${valuation.id}`} className="mt-3 inline-flex text-xs text-[var(--n3-teal-soft)]">Abrir expediente →</Link> : null}
      </div>
      <div className="bg-[var(--n3-deep)] p-4">
        <p className="text-xs text-[var(--n3-text-muted)]">Lead Property Partners</p>
        <p className="mt-2 text-lg font-semibold text-[var(--n3-text-light)]">{prospect ? prospectStatus(prospect.status) : 'No informado'}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">
          {prospect
            ? [prospect.directorName, prospect.officeName, prospect.nextFollowUpAt ? `próximo ${date(prospect.nextFollowUpAt)}` : null].filter(Boolean).join(' · ')
            : 'La propiedad aún no ha sido convertida en lead de prospección.'}
        </p>
        {prospect ? <Link href="/dashboard/properties/prospects" className="mt-3 inline-flex text-xs text-[var(--n3-teal-soft)]">Abrir seguimiento →</Link> : null}
      </div>
    </div>

    <div className="mt-4 grid gap-px bg-[var(--n3-line)] sm:grid-cols-3">
      {coverageItems.map((item) => <div key={item.label} className="bg-[var(--n3-deep)] px-4 py-3">
        <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{item.label}</span>
        <strong className="mt-1 block text-sm">{item.value}</strong>
      </div>)}
    </div>
    <div className="mt-3 border-l-2 border-[#d7332b] pl-3 text-xs leading-5 text-[var(--n3-text-muted)]">
      <span className="font-medium text-[var(--n3-text-light)]">Próxima acción:</span> {nextAction}
    </div>

    {prospect ? <div className="mt-5 border-t border-[var(--n3-line)] pt-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Seguimiento comercial</p>
          <h3 className="mt-1 text-sm font-semibold">Trazabilidad del lead</h3>
        </div>
        <span className="text-xs text-[var(--n3-text-muted)]">Actualizado {date(prospect.updatedAt)}</span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <div><span className="block text-xs text-[var(--n3-text-muted)]">Director/a</span><strong>{prospect.directorName || '—'}</strong></div>
        <div><span className="block text-xs text-[var(--n3-text-muted)]">Asignado</span><strong>{date(prospect.assignedAt)}</strong></div>
        <div><span className="block text-xs text-[var(--n3-text-muted)]">1er contacto</span><strong>{date(prospect.firstContactAt)}</strong></div>
        <div><span className="block text-xs text-[var(--n3-text-muted)]">Próximo seguimiento</span><strong>{date(prospect.nextFollowUpAt)}</strong></div>
      </div>
      {prospect.latestNote ? <p className="mt-3 text-xs leading-5 text-[var(--n3-text-muted)]">{prospect.latestNote}</p> : null}
      {prospect.events.length ? <div className="mt-3 divide-y divide-[var(--n3-line)]">
        {prospect.events.slice(0, 4).map((event) => <div key={event.id} className="grid gap-1 py-2 text-xs sm:grid-cols-[120px_160px_1fr]">
          <span className="text-[var(--n3-text-muted)]">{date(event.occurred_at)}</span>
          <span className="font-medium">{event.event_type.replaceAll('_', ' ')}</span>
          <span className="text-[var(--n3-text-muted)]">{event.note || (event.to_status ? `→ ${prospectStatus(event.to_status)}` : 'Evento auditado')}</span>
        </div>)}
      </div> : null}
    </div> : null}

    {valuation ? <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <div className="border-t border-[var(--n3-line)] pt-3">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Estado del expediente</p>
        <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
          <div><span className="block text-xs text-[var(--n3-text-muted)]">Metodología</span><strong>{valuation.methodologyVersion || '—'}</strong></div>
          <div><span className="block text-xs text-[var(--n3-text-muted)]">Versión</span><strong>{valuation.versionNumber ?? '—'}</strong></div>
          <div><span className="block text-xs text-[var(--n3-text-muted)]">Revisada</span><strong>{date(valuation.reviewedAt)}</strong></div>
          <div><span className="block text-xs text-[var(--n3-text-muted)]">Emitida</span><strong>{date(valuation.issuedAt)}</strong></div>
        </div>
      </div>
      <div className="border-t border-[var(--n3-line)] pt-3">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Historial de valorización</p>
        <div className="mt-2 divide-y divide-[var(--n3-line)]">
          {data.valuations.slice(0, 4).map((item) => <div key={item.id} className="flex items-center justify-between gap-4 py-2 text-sm">
            <div><span className="font-medium">{valuationStatus(item.status)}</span><span className="ml-2 text-xs text-[var(--n3-text-muted)]">{date(item.valuationDate || item.createdAt)}</span></div>
            <span className="tabular-nums text-[var(--n3-text-muted)]">{uf(item.estimatedValueUf)}</span>
          </div>)}
        </div>
      </div>
    </div> : null}

    <div className="mt-4 border-t border-[var(--n3-line)] pt-3 text-xs leading-5 text-[var(--n3-text-muted)]">
      {data.limitation}
    </div>
  </section>
}
