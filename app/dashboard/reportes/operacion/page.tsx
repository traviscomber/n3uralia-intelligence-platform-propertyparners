import { redirect } from 'next/navigation'
import { CeoIntelligenceReportGenerator } from '@/components/management/ceo-intelligence-report-generator'
import { CanonicalLatestReportGenerator } from '@/components/management/canonical-latest-report-generator'
import { ReportDeliveryConsole } from '@/components/management/report-delivery-console'
import { IntelligenceHeader, IntelligencePage } from '@/components/intelligence/design-system'
import { getUserScope } from '@/lib/user-scope'
import { lastClosedMonth, lastClosedWeek } from '@/lib/reporting/closed-period-policy'

export default async function ReportOperationsPage() {
  const scope = await getUserScope()
  if (!['admin', 'ceo', 'director', 'subdirector'].includes(scope.role)) redirect('/dashboard/reportes/autonomos')
  const canOperate = scope.role === 'admin' || scope.role === 'ceo'
  const week = lastClosedWeek()
  const month = lastClosedMonth()

  return <IntelligencePage>
    <IntelligenceHeader
      eyebrow="Informes"
      title="Generar y revisar"
      description="Consulta cómo va el negocio y descarga el último informe disponible."
      actions={[{ label: 'Ver último informe disponible', href: '/dashboard/reportes/canonicos', primary: true }]}
    />
    <section className="mt-6 grid gap-3 md:grid-cols-2" aria-label="Cortes de reportes">
      {[week, month].map((period) => <article key={period.cadence} className="border border-[var(--n3-line)] p-5">
        <p className="text-xs uppercase tracking-wider text-[var(--n3-text-muted)]">{period.cadence === 'weekly' ? 'Semanal' : 'Mensual'}</p>
        <h2 className="mt-2 text-lg font-semibold">{period.label}</h2>
        <p className="mt-1 text-sm">{period.start} — {period.end}</p>
        <p className="mt-3 text-sm text-[var(--n3-text-muted)]">Para descargar, elige un informe aprobado. Si faltan datos, consulta el último cerrado.</p>
        <a className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline" href="/dashboard/reportes/canonicos">Consultar informes</a>
      </article>)}
    </section>
    {canOperate ? <CeoIntelligenceReportGenerator /> : null}
    {canOperate ? <details className="mt-6"><summary className="cursor-pointer text-sm">Otras opciones</summary><CanonicalLatestReportGenerator /></details> : null}
    <details className="mt-6"><summary className="cursor-pointer text-sm">Administrar envíos</summary><ReportDeliveryConsole canOperate={canOperate} /></details>
  </IntelligencePage>
}
