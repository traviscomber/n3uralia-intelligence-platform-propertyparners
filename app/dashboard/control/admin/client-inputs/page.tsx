import Link from 'next/link'
import { ArrowLeft, DatabaseZap, ShieldCheck } from 'lucide-react'
import { DataStatusBar, MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import dependencyStatus from '@/config/client-dependencies-status.json'
import requestSpec from '@/config/client-dependency-requests.json'

type Dependency = {
  id: string
  label: string
  owner: string
  status: string
  requiredFor: string[]
  evidence: string[]
}

type Request = {
  id: string
  request: string
  acceptedFormats: string[]
  minimumFields: string[]
  validation: string[]
  deliveryHandling: string
}

const ownerLabel = (owner: string) => owner === 'Client' ? 'Cliente' : owner === 'Shared' ? 'Compartido' : 'N3uralia'
const statusLabel = (status: string) => status === 'pending' ? 'Pendiente' : status === 'received' ? 'Recibido' : status === 'approved' ? 'Aprobado' : 'Eximido'

export default function ClientInputsPage() {
  const dependencies = dependencyStatus.dependencies as Dependency[]
  const requests = new Map((requestSpec.requests as Request[]).map((item) => [item.id, item]))
  const pending = dependencies.filter((item) => item.status === 'pending')
  const clientOwned = pending.filter((item) => item.owner === 'Client').length
  const shared = pending.filter((item) => item.owner === 'Shared').length

  return <WorkspaceShell>
    <div className="mb-3">
      <Link href="/dashboard/control/admin" className="inline-flex min-h-11 items-center gap-2 text-xs text-[var(--n3-text-muted)]">
        <ArrowLeft size={14}/>Volver a administración
      </Link>
    </div>

    <WorkspaceHeader
      eyebrow="Control de gestión · Insumos externos"
      title="Datos y aprobaciones pendientes del cliente"
      meta={`Corte ${requestSpec.asOf} · ${pending.length} pendientes`}
    />

    <section className="mt-5 border border-[#78d59a]/25 bg-[#78d59a]/5 p-5">
      <div className="flex items-start gap-3">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#78d59a]"/>
        <div>
          <h2 className="text-sm font-semibold text-[#78d59a]">Frontera de información activa</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--n3-text-muted)]">Esta vista contiene únicamente requisitos, formatos esperados, criterios de validación y estado. No almacena registros, exportaciones, credenciales ni valores del cliente. Los insumos recibidos deben entrar por el flujo canónico aprobado.</p>
        </div>
      </div>
    </section>

    <MetricStrip items={[
      { label: 'Pendientes', value: pending.length, tone: pending.length ? 'warning' : 'success' },
      { label: 'Responsabilidad cliente', value: clientOwned },
      { label: 'Responsabilidad compartida', value: shared },
      { label: 'Payloads en repositorio', value: '0', tone: 'success' },
    ]}/>

    <section className="mt-7">
      <div className="flex items-end justify-between border-b border-[var(--n3-line)] pb-2">
        <div>
          <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Solicitudes pendientes</h2>
          <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Pedir sólo lo necesario para desbloquear módulos contractuales.</p>
        </div>
        <span className="text-xs text-[var(--n3-text-muted)]">{pending.length} solicitudes</span>
      </div>

      <div className="divide-y divide-[var(--n3-line)]">
        {pending.map((dependency) => {
          const request = requests.get(dependency.id)
          return <article key={dependency.id} className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(260px,.8fr)]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">{dependency.label}</h3>
                <span className="text-[10px] uppercase tracking-[0.12em] text-[#f0c96a]">{statusLabel(dependency.status)}</span>
              </div>
              <p className="mt-2 text-xs text-[var(--n3-text-muted)]">Owner: {ownerLabel(dependency.owner)}</p>
              <p className="mt-3 text-sm leading-6 text-[var(--n3-text-light)]">{request?.request ?? 'Solicitud pendiente de especificación.'}</p>
              <div className="mt-3 flex flex-wrap gap-2">{dependency.requiredFor.map((item) => <span key={item} className="bg-white/[0.04] px-2 py-1 text-[10px] text-[var(--n3-text-muted)]">{item}</span>)}</div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Contenido mínimo solicitado</p>
              <div className="mt-2 flex flex-wrap gap-2">{request?.minimumFields.map((item) => <span key={item} className="border border-[var(--n3-line)] px-2 py-1 text-xs text-[var(--n3-text-muted)]">{item}</span>)}</div>
              <p className="mt-4 text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Validación</p>
              <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">{request?.validation.join(' · ') ?? '—'}</p>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">Formatos aceptados</p>
              <p className="mt-2 text-sm font-medium">{request?.acceptedFormats.join(' / ') ?? '—'}</p>
              <div className="mt-4 flex gap-2 text-xs text-[var(--n3-text-muted)]"><DatabaseZap size={14} className="mt-0.5 shrink-0"/><span>{request?.deliveryHandling ?? 'Ingresar sólo por flujo canónico aprobado.'}</span></div>
            </div>
          </article>
        })}
      </div>
    </section>

    <DataStatusBar cutoff={requestSpec.asOf} coverage={`${dependencies.length - pending.length}/${dependencies.length} dependencias cerradas`} issues={pending.length} status={pending.length ? 'partial' : 'ready'} />
  </WorkspaceShell>
}
