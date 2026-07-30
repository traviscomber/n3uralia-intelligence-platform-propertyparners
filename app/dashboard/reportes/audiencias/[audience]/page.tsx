import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAudienceData } from '@/lib/report-audiences'
import { createClient } from '@/lib/supabase/server'
import PrintReportButton from '@/components/reports/print-report-button'

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

export default async function AudiencePage({ params, searchParams }: { params: Promise<{ audience: string }>; searchParams: Promise<{ branch?: string }> }) {
  const { audience } = await params
  const { branch } = await searchParams
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

  const title = data.kind === 'ceo' ? 'Reporte CEO' : data.kind === 'director-cuenta' ? 'Reportes Director de Cuenta' : isSeller ? 'Mi reporte de desempeño' : 'Reportes Ejecutivo / Partner'

  let items: PartnerItem[] | typeof data.branches = []
  if (data.kind === 'ceo') {
    items = data.branches
  } else if (data.kind === 'director-cuenta') {
    items = isDirector && profile?.team ? data.branches.filter((item) => normalize(item.name) === normalize(profile.team)) : data.branches
  } else if (isSeller) {
    const canonicalName = canonicalEntity?.name || profile?.full_name
    items = data.partners.filter((item) => normalize(item.name) === normalize(canonicalName))
  } else if (isDirector && profile?.team) {
    items = data.partners.filter((item) => normalize(item.branch) === normalize(profile.team))
  } else {
    items = data.partners.filter((item) => !branch || item.branch === branch)
  }

  const backHref = isSeller ? '/dashboard/partner' : '/dashboard/reportes/autonomos'
  const backLabel = isSeller ? 'Volver a mi desempeño' : 'Todos los reportes'
  const showBranchNavigation = data.kind === 'ejecutivo' && !isSeller && !isDirector

  return <div className="mx-auto max-w-7xl space-y-6 pb-16 print:fixed print:inset-0 print:z-[100] print:m-0 print:max-w-none print:overflow-visible print:bg-white print:p-8 print:text-black print:[--n3-card:#ffffff] print:[--n3-line:#d1d5db] print:[--n3-teal:#b42318] print:[--n3-text-light:#111827] print:[--n3-text-muted:#4b5563]"><header className="border-b border-[var(--n3-line)] pb-6"><div className="flex flex-wrap items-center justify-between gap-3 print:hidden"><Link href={backHref} className="text-xs font-semibold text-[var(--n3-teal)]">← {backLabel}</Link><PrintReportButton /></div><p className="hidden text-xs font-semibold uppercase tracking-[0.18em] print:block">Property Partners Vitacura</p><h1 className="mt-4 text-3xl font-semibold text-[var(--n3-text-light)] sm:text-4xl">{title}</h1><div className="mt-3 grid gap-1 text-sm text-[var(--n3-text-muted)] sm:grid-cols-2"><p>Período: enero–junio 2026</p><p className="sm:text-right">Corte comercial: junio 2026</p><p>Operación: venta · Vitacura</p><p className="sm:text-right">Fuente: presentaciones auditadas 2026</p></div></header>
    {data.kind === 'ceo' ? <section className="grid gap-px bg-[var(--n3-line)] sm:grid-cols-2 md:grid-cols-4">{[['Cierres junio', data.company.salesSummary.currentSalesCount], ['UF junio', data.company.salesSummary.currentSalesUf], ['Cierres acumulados', data.company.salesSummary.cumulativeSalesCount], ['UF acumulada', data.company.salesSummary.cumulativeSalesUf]].map(([label,value]) => <div key={label as string} className="bg-[var(--n3-card)] p-5"><p className="text-[10px] uppercase tracking-widest text-[var(--n3-text-muted)]">{label as string}</p><p className="mt-2 text-3xl font-semibold">{n(value as number)}</p></div>)}</section> : null}
    {showBranchNavigation && data.kind === 'ejecutivo' ? <nav className="flex flex-wrap gap-2 print:hidden">{Array.from(new Set(data.partners.map((item) => item.branch))).map((name) => <Link key={name} href={`/dashboard/reportes/audiencias/ejecutivo?branch=${encodeURIComponent(name)}`} className="border border-[var(--n3-line)] px-3 py-2 text-xs text-[var(--n3-text-muted)] hover:border-[var(--n3-teal)]">{name}</Link>)}</nav> : null}
    <section className="grid gap-4 xl:grid-cols-3 print:grid-cols-1">{items.map((item) => <Card key={`${item.name}`} item={item as PartnerItem} />)}</section>
    {!items.length ? <div className="border border-dashed border-[var(--n3-line)] p-8 text-sm text-[var(--n3-text-muted)]">{isSeller && !canonicalEntity ? 'La cuenta no tiene una entidad Partner activa vinculada. Debe completarse la asociación canónica por profile_id.' : 'No existe una ficha canónica disponible para el alcance autorizado.'}</div> : null}
    <footer className="border-l-2 border-[var(--n3-teal)] pl-4 text-xs leading-5 text-[var(--n3-text-muted)]">Valores y clasificaciones reproducidos desde las presentaciones auditadas. Los ceros fuente permanecen como cero; los ausentes se muestran como n/d. Este reporte refleja el corte indicado y no reemplaza la validación contable o contractual.</footer>
  </div>
}
