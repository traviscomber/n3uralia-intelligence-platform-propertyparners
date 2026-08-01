import { requirePageCapability } from '@/lib/access-guards'
import { getManagementEntities } from '@/lib/presentations-2026'
import { parseCanonicalSalesComparison } from '@/lib/canonical-commercial-comparisons'

function normalize(value: string | null | undefined) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function number(value: number | null | undefined, suffix = '') {
  if (value === null || value === undefined) return 'n/d'
  return `${value.toLocaleString('es-CL', { maximumFractionDigits: 1 })}${suffix}`
}

function variation(value: number | null | undefined) {
  if (value === null || value === undefined) return 'n/d'
  return `${value > 0 ? '+' : ''}${value.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%`
}

type PartnerMetricView = {
  salesSummary: {
    source: { deck: string; slide: number; title: string }
    currentSalesCount: number | null
    currentSalesUf: number | null
    cumulativeSalesCount: number | null
    cumulativeSalesUf: number | null
    currentTargetSalesCount?: number | null
  }
  scores: { followUp: number | null; conversion: number | null }
}

export async function PartnerPerformanceSummary() {
  const scope = await requirePageCapability('management.self.read')
  const canonical = getManagementEntities()
  const profileName = normalize(scope.profile.full_name)
  const team = normalize(scope.profile.team)
  const rawPartner = canonical.partners.find((item) => {
    const sameName = normalize(item.name) === profileName
    const sameBranch = !team || normalize(item.branch) === team
    return sameName && sameBranch
  })

  if (!rawPartner) {
    return <section className="mx-auto mt-8 max-w-7xl border border-dashed border-[var(--n3-line)] p-6 text-sm text-[var(--n3-text-muted)]">No existe una ficha canónica vinculada de forma inequívoca a este perfil. No se presentan métricas inferidas.</section>
  }

  const partner = rawPartner as unknown as PartnerMetricView
  const annual = parseCanonicalSalesComparison(rawPartner as unknown as Parameters<typeof parseCanonicalSalesComparison>[0])
  const source = partner.salesSummary.source
  const sales = partner.salesSummary.currentSalesCount
  const salesTarget = partner.salesSummary.currentTargetSalesCount ?? null
  const salesCompliance = sales !== null && salesTarget ? (sales / salesTarget) * 100 : null
  const cards = [
    ['Cierres junio', number(sales), `Meta: ${number(salesTarget)} · cumplimiento ${variation(salesCompliance)}`],
    ['Venta junio', number(partner.salesSummary.currentSalesUf, ' UF'), `YoY ${variation(annual?.salesUfYoy)}`],
    ['Cierres acumulados', number(partner.salesSummary.cumulativeSalesCount), `YoY ${variation(annual?.cumulativeSalesCountYoy)}`],
    ['Venta acumulada', number(partner.salesSummary.cumulativeSalesUf, ' UF'), `YoY ${variation(annual?.cumulativeSalesUfYoy)}`],
    ['Seguimiento', number(partner.scores.followUp), 'Score reproducido desde fuente canónica'],
    ['Conversión', number(partner.scores.conversion), 'Score reproducido desde fuente canónica'],
  ]

  return <section className="mx-auto mt-8 max-w-7xl space-y-5">
    <div className="border-b border-[var(--n3-line)] pb-4"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ff766f]">Lectura contractual personal</p><h2 className="mt-2 text-2xl font-semibold">Metas, evolución y calidad comercial</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">Una sola lectura personal con valores, metas, comparaciones y procedencia visibles. No mezcla métricas de otras ejecutivas.</p></div>
    <div className="grid gap-px bg-[var(--n3-line)] sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label, value, detail]) => <article key={label} className="bg-[#0c1111] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">{label}</p><p className="mt-3 text-2xl font-semibold">{value}</p><p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">{detail}</p></article>)}</div>
    <div className="border-l-2 border-[#d7332b] pl-4 text-xs leading-5 text-[var(--n3-text-muted)]">Fuente: {source.deck} · lámina {source.slide} · {source.title}. Período principal: junio de 2026; acumulado enero–junio de 2026. Comparación YoY contra 2025 cuando la tabla canónica contiene base explícita.</div>
  </section>
}
