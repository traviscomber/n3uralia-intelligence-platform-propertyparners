import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAudienceData } from '@/lib/report-audiences'
import { createClient } from '@/lib/supabase/server'
import PrintReportButton from '@/components/reports/print-report-button'
import { getLatestCanonicalManagementPeriod } from '@/lib/management-canonical-periods'

function n(value: number | null | undefined, digits = 0) { return value == null ? 'n/d' : value.toLocaleString('es-CL', { maximumFractionDigits: digits }) }
function normalize(value: string | null | undefined) { return (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() }

type PartnerItem = NonNullable<ReturnType<typeof getAudienceData>> extends infer Audience
  ? Audience extends { partners: Array<infer Partner> } ? Partner : never
  : never

function Scores({ item }: { item: PartnerItem }) {
  return <div className="mt-4"><div className="flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-widest text-[var(--n3-text-muted)]">Calidad gestión</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">{item.scores.classification}</p></div><strong className="text-4xl text-[var(--n3-teal)]">{n(item.scores.management, 1)}</strong></div><div className="mt-4 grid grid-cols-1 gap-px bg-[var(--n3-line)] text-center sm:grid-cols-3"><div className="bg-black p-3 print:bg-white"><small>Cartera · 40%</small><p>{n(item.scores.portfolio, 1)}</p></div><div className="bg-black p-3 print:bg-white"><small>Seguim. · 30%</small><p>{n(item.scores.followUp, 1)}</p></div><div className="bg-black p-3 print:bg-white"><small>Conversión · 30%</small><p>{n(item.scores.conversion, 1)}</p></div></div><p className="mt-3 break-words text-[10px] text-[var(--n3-text-muted)]">{item.scores.source.deck} · lámina {item.scores.source.slide}</p></div>
}

function Card({ item }: { item: PartnerItem }) {
  return <article className="break-inside-avoid border border-[var(--n3-line)] bg-[var(--n3-card)] p-5 print:border-gray-300 print:bg-white"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] uppercase tracking-widest text-[var(--n3-text-muted)]">{item.branch}</p><h2 className="mt-1 text-xl font-semibold text-[var(--n3-text-light)]">{item.name}</h2></div><div className="text-right"><p className="text-2xl font-semibold text-[var(--n3-text-light)]">{n(item.salesSummary.currentSalesCount)}</p><p className="text-[10px] text-[var(--n3-text-muted)]">cierres junio</p></div></div><div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2"><div className="border border-[var(--n3-line)] p-3 print:border-gray-300"><small className="text-[var(--n3-text-muted)]">UF junio</small><p className="mt-1 font-semibold">{n(item.salesSummary.currentSalesUf)} UF</p></div><div className="border border-[var(--n3-line)] p-3 print:border-gray-300"><small className="text-[var(--n3-text-muted)]">UF acumulada</small><p className="mt-1 font-semibold">{n(item.salesSummary.cumulativeSalesUf)} UF</p></div></div><Scores item={item} /></article>
}

export default async function AudiencePage({ params, searchParams }: { params: Promise<{ audience: string }>; searchParams: Promise<{ branch?: string; partner?: string }> }) {
  const { audience } = await params
  const { branch, partner } = await searchParams
  const data = getAudienceData(audience)
  if (!data) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: canonicalEntity }] = await Promise.all([
    supabase.from('profiles').select('role,full_name,team').eq('id', user.id).maybeSingle(),
    supabase.from('management_entities').select('name,parent_id').eq('profile_id', user.id).eq('entity_type', 'partner').eq('active', true).maybeSingle(),
  ])
  const role = String(profile?.role ?? '').toLowerCase()
  const isExecutive = role === 'admin' || role === 'ceo'
  const isDirector = role === 'director' || role === 'subdirector'
  const isSeller = role === 'seller'

  if (isSeller && audience !== 'ejecutivo') redirect('/auth/error')
  if (isDirector && audience === 'ceo') redirect('/auth/error')
  if (!isExecutive && !isDirector && !isSeller) redirect('/auth/error')

  if (data.kind === 'ceo' && isExecutive) {
    const current = getLatestCanonicalManagementPeriod()
    if (!current) notFound()
    const company = current.company
    const notes = Array.isArray((current.historicalIssuedSnapshot as { notes?: string[] } | undefined)?.notes)
      ? ((current.historicalIssuedSnapshot as { notes?: string[] }).notes ?? [])
      : []
    return <div className="mx-auto max-w-7xl space-y-6 pb-16 print:fixed print:inset-0 print:z-[100] print:m-0 print:max-w-none print:overflow-visible print:bg-white print:p-8 print:text-black print:[--n3-card:#ffffff] print:[--n3-line:#d1d5db] print:[--n3-teal:#b42318] print:[--n3-text-light:#111827] print:[--n3-text-muted:#4b5563]">
      <header className="border-b border-[var(--n3-line)] pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href="/dashboard/pedro-pablo" className="text-xs font-semibold text-[var(--n3-teal)]">← Pedro Pablo</Link>
          <PrintReportButton />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">Property Partners Vitacura · Informe ejecutivo</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--n3-text-light)] sm:text-4xl">PL Real Estate · Septiembre 2026</h1>
        <div className="mt-3 grid gap-1 text-sm text-[var(--n3-text-muted)] sm:grid-cols-2">
          <p>Período: septiembre 2026</p>
          <p className="sm:text-right">Corte comercial: 30-09-2026</p>
          <p>Fuente: {current.authority.file}</p>
          <p className="sm:text-right">Estado: canónico</p>
        </div>
      </header>

      <section className="grid gap-px bg-[var(--n3-line)] sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Cierres netos', company.creditedClosings],
          ['UF netas', company.creditedSalesUf],
          ['Cartera publicada', company.stock ?? null],
          ['Captaciones', company.captures ?? null],
          ['Leads activos', company.activeLeads ?? null],
          ['Leads clasificados', company.classifiedLeads ?? null],
          ['Visitas agendadas', company.scheduledVisits ?? null],
          ['Visitas realizadas', company.realizedVisits ?? null],
        ].map(([label,value]) => <div key={String(label)} className="bg-[var(--n3-card)] p-5">
          <p className="text-[10px] uppercase tracking-widest text-[var(--n3-text-muted)]">{String(label)}</p>
          <p className="mt-2 text-3xl font-semibold">{typeof value === 'number' ? value.toLocaleString('es-CL') : 'n/d'}</p>
        </div>)}
      </section>

      <section>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Oficinas</p>
        <div className="overflow-x-auto border border-[var(--n3-line)]">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-[#080d0d] text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)] print:bg-white">
              <tr>
                <th className="px-4 py-3 text-left">Oficina</th>
                <th className="px-4 py-3 text-right">Cierres</th>
                <th className="px-4 py-3 text-right">UF</th>
                <th className="px-4 py-3 text-right">Cartera</th>
                <th className="px-4 py-3 text-right">Captaciones</th>
                <th className="px-4 py-3 text-right">Leads activos</th>
                <th className="px-4 py-3 text-right">Visitas ag.</th>
                <th className="px-4 py-3 text-right">Realizadas</th>
              </tr>
            </thead>
            <tbody>{current.offices.map((office) => <tr key={office.name} className="border-t border-[var(--n3-line)]">
              <td className="px-4 py-3 font-semibold">{office.name}</td>
              <td className="px-4 py-3 text-right">{office.creditedClosings.toLocaleString('es-CL')}</td>
              <td className="px-4 py-3 text-right">{office.creditedSalesUf.toLocaleString('es-CL')} UF</td>
              <td className="px-4 py-3 text-right">{office.stock?.toLocaleString('es-CL') ?? 'n/d'}</td>
              <td className="px-4 py-3 text-right">{office.captures?.toLocaleString('es-CL') ?? 'n/d'}</td>
              <td className="px-4 py-3 text-right">{office.activeLeads?.toLocaleString('es-CL') ?? 'n/d'}</td>
              <td className="px-4 py-3 text-right">{office.scheduledVisits?.toLocaleString('es-CL') ?? 'n/d'}</td>
              <td className="px-4 py-3 text-right">{office.realizedVisits?.toLocaleString('es-CL') ?? 'n/d'}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="border-l-2 border-[var(--n3-teal)] pl-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Ajuste canónico</p>
        <p className="mt-2 text-sm leading-6 text-[var(--n3-text-light)]">Septiembre registra 6 operaciones activas por 71.560 UF y una suspensión histórica de julio por -1 cierre / -22.000 UF. Resultado neto: 5 cierres / 49.560 UF.</p>
        {notes.length ? <ul className="mt-3 space-y-1 text-xs leading-5 text-[var(--n3-text-muted)]">{notes.map((note) => <li key={note}>• {note}</li>)}</ul> : null}
      </section>

      <footer className="border-t border-[var(--n3-line)] pt-4 text-xs leading-5 text-[var(--n3-text-muted)]">
        Informe generado desde la fuente canónica vigente. Métricas no publicadas para septiembre se mantienen como n/d y no se reconstruyen por inferencia.
      </footer>
    </div>
  }

  const title = data.kind === 'ceo' ? 'PL Real Estate' : data.kind === 'director-cuenta' ? (branch || profile?.team || 'Reporte de oficina') : isSeller ? 'Mi reporte de desempeño' : (partner || 'Reporte Partner')

  let items: PartnerItem[] | typeof data.branches = []
  let officeSummary: PartnerItem | null = null
  if (data.kind === 'ceo') {
    items = data.branches
  } else if (data.kind === 'director-cuenta') {
    const allowedBranch = isDirector && profile?.team ? profile.team : branch
    const selectedOffice = allowedBranch
      ? data.branches.find((item) => normalize(item.name) === normalize(allowedBranch))
      : null
    officeSummary = (selectedOffice ?? null) as PartnerItem | null
    items = allowedBranch
      ? data.partners.filter((item) => normalize(item.branch) === normalize(allowedBranch))
      : data.partners
  } else if (isSeller) {
    const canonicalName = canonicalEntity?.name || profile?.full_name
    items = data.partners.filter((item) => normalize(item.name) === normalize(canonicalName))
  } else if (isDirector && profile?.team) {
    items = data.partners.filter((item) => normalize(item.branch) === normalize(profile.team))
  } else {
    items = data.partners.filter((item) => {
      if (partner) return normalize(item.name) === normalize(partner)
      if (branch) return normalize(item.branch) === normalize(branch)
      return true
    })
  }

  const backHref = isSeller ? '/dashboard/partner' : '/dashboard/reportes/autonomos'
  const backLabel = isSeller ? 'Volver a mi desempeño' : 'Todos los reportes'
  const showBranchNavigation = data.kind === 'ejecutivo' && !isSeller && !isDirector

  return <div className="mx-auto max-w-7xl space-y-6 pb-16 print:fixed print:inset-0 print:z-[100] print:m-0 print:max-w-none print:overflow-visible print:bg-white print:p-8 print:text-black print:[--n3-card:#ffffff] print:[--n3-line:#d1d5db] print:[--n3-teal:#b42318] print:[--n3-text-light:#111827] print:[--n3-text-muted:#4b5563]"><header className="border-b border-[var(--n3-line)] pb-6"><div className="flex flex-wrap items-center justify-between gap-3 print:hidden"><Link href={backHref} className="text-xs font-semibold text-[var(--n3-teal)]">← {backLabel}</Link><PrintReportButton /></div><p className="hidden text-xs font-semibold uppercase tracking-[0.18em] print:block">Property Partners Vitacura</p><h1 className="mt-4 text-3xl font-semibold text-[var(--n3-text-light)] sm:text-4xl">{title}</h1><div className="mt-3 grid gap-1 text-sm text-[var(--n3-text-muted)] sm:grid-cols-2"><p>Período: enero–junio 2026</p><p className="sm:text-right">Corte comercial: junio 2026</p><p>Operación: venta · Vitacura</p><p className="sm:text-right">Fuente: presentaciones auditadas 2026</p></div></header>
    {data.kind === 'director-cuenta' && officeSummary ? <section><p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Consolidado oficina</p><Card item={officeSummary} /></section> : null}
    {data.kind === 'director-cuenta' ? <div className="border-b border-[var(--n3-line)] pb-3"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Bajada por Partner</p><p className="mt-1 text-sm text-[var(--n3-text-muted)]">Cada ficha corresponde a un Partner de la oficina seleccionada.</p></div> : null}
    {data.kind === 'ceo' ? <section className="grid gap-px bg-[var(--n3-line)] sm:grid-cols-2 md:grid-cols-4">{[['Cierres junio', data.company.salesSummary.currentSalesCount], ['UF junio', data.company.salesSummary.currentSalesUf], ['Cierres acumulados', data.company.salesSummary.cumulativeSalesCount], ['UF acumulada', data.company.salesSummary.cumulativeSalesUf]].map(([label,value]) => <div key={label as string} className="bg-[var(--n3-card)] p-5"><p className="text-[10px] uppercase tracking-widest text-[var(--n3-text-muted)]">{label as string}</p><p className="mt-2 text-3xl font-semibold">{n(value as number)}</p></div>)}</section> : null}
    {showBranchNavigation && data.kind === 'ejecutivo' ? <nav className="flex flex-wrap gap-2 print:hidden">{Array.from(new Set(data.partners.map((item) => item.branch))).map((name) => <Link key={name} href={`/dashboard/reportes/audiencias/ejecutivo?branch=${encodeURIComponent(name)}`} className="border border-[var(--n3-line)] px-3 py-2 text-xs text-[var(--n3-text-muted)] hover:border-[var(--n3-teal)]">{name}</Link>)}</nav> : null}
    <section className="grid gap-4 xl:grid-cols-3 print:grid-cols-1">{items.map((item) => <Card key={`${item.name}`} item={item as PartnerItem} />)}</section>
    {!items.length ? <div className="border border-dashed border-[var(--n3-line)] p-8 text-sm text-[var(--n3-text-muted)]">{isSeller && !canonicalEntity ? 'La cuenta no tiene una entidad Partner activa vinculada. Debe completarse la asociación canónica por profile_id.' : 'No existe una ficha canónica disponible para el alcance autorizado.'}</div> : null}
    <footer className="border-l-2 border-[var(--n3-teal)] pl-4 text-xs leading-5 text-[var(--n3-text-muted)]">Valores y clasificaciones reproducidos desde las presentaciones auditadas. Los ceros fuente permanecen como cero; los ausentes se muestran como n/d. Este reporte refleja el corte indicado y no reemplaza la validación contable o contractual.</footer>
  </div>
}
