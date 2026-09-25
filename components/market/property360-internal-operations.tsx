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
    crmActivity: 'not_linked'
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
        <p className="text-xs text-[var(--n3-text-muted)]">Actividad CRM por propiedad</p>
        <p className="mt-2 text-lg font-semibold text-[var(--n3-text-light)]">Aún no enlazada</p>
        <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">No se muestran leads, visitas, ofertas ni cierres sin un vínculo canónico verificable.</p>
      </div>
    </div>

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
