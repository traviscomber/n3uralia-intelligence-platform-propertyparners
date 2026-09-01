import Link from 'next/link'
import { AlertTriangle, CheckCircle2, ExternalLink, MapPinned, ShieldCheck } from 'lucide-react'
import { MetricStrip, WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { requireAnyPageCapability } from '@/lib/access-guards'
import { createClient } from '@/lib/supabase/server'

type QueueRow = {
  review_id: string | null
  source_listing_id: string
  raw_address: string | null
  title: string | null
  url: string | null
  classification: string | null
  proposed_neighborhood_name: string | null
  resolution_kind: string
  reason: string
  can_decide: boolean
  observed_at: string | null
}

type TerritoryProgress = {
  portal_current_houses: number | null
  exact_kml_houses: number | null
  pending_unique_suggestions: number | null
  ambiguous_suggestions: number | null
  unmatched_houses: number | null
}

const RESOLUTION_LABELS: Record<string, string> = {
  accepted_memory: 'Memoria territorial',
  point_in_kml: 'Coordenada KML',
  direct_kml: 'Coincidencia KML',
  unique_kml_candidate: 'Candidato KML único',
  validated_rule: 'Regla territorial validada',
  cbrs_street_consensus: 'Consenso histórico CBRS',
  territorial_evidence: 'Evidencia territorial cruzada',
  manual: 'Sin resolución automática',
}

function evidenceLabel(kind: string) {
  return RESOLUTION_LABELS[kind] ?? 'Evidencia territorial'
}

function ExceptionCard({ row }: { row: QueueRow }) {
  return (
    <article className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(210px,0.5fr)] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ff8d87]"><AlertTriangle size={12} /> Excepción territorial</span>
          <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{evidenceLabel(row.resolution_kind)}</span>
        </div>
        <p className="mt-2 text-sm font-medium leading-6 text-[var(--n3-text-light)]">{row.raw_address || row.title || 'Dirección no disponible'}</p>
        {row.title && row.raw_address ? <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{row.title}</p> : null}
        <p className="mt-2 max-w-3xl text-xs leading-5 text-[var(--n3-text-muted)]">{row.reason}</p>
        <p className="mt-2 text-xs leading-5 text-[#f0c96a]">El sistema no publica un barrio mientras la evidencia no sea suficientemente consistente. No requiere una aprobación ejecutiva; requiere mejor evidencia.</p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--n3-text-muted)]">
          <span>MLC-{row.source_listing_id}</span>
          {row.url ? <Link href={row.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-[var(--n3-accent)] hover:underline">Ver aviso <ExternalLink size={12} /></Link> : null}
        </div>
      </div>

      <div className="border-l border-[var(--n3-line)] pl-4">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Estado</p>
        <p className="mt-1 text-lg font-semibold text-[var(--n3-text-light)]">Pendiente de evidencia</p>
        {row.proposed_neighborhood_name ? <p className="mt-2 flex items-start gap-1 text-[11px] leading-4 text-[var(--n3-text-muted)]"><MapPinned size={12} className="mt-0.5 shrink-0" /> Señal actual: {row.proposed_neighborhood_name}. No se publica hasta despejar el conflicto.</p> : null}
      </div>
    </article>
  )
}

export default async function NeighborhoodReviewPage() {
  await requireAnyPageCapability(['market.manage_sources', 'management.global.read'])
  const supabase = await createClient()
  const [queueResult, territoryResult] = await Promise.all([
    supabase.rpc('get_ceo_market_neighborhood_queue_v1'),
    supabase.rpc('get_market_house_territory_progress_v1').maybeSingle(),
  ])

  const rows = (queueResult.data ?? []) as QueueRow[]
  const territory = territoryResult.data as TerritoryProgress | null
  const active = Number(territory?.portal_current_houses ?? 0)
  const resolved = Number(territory?.exact_kml_houses ?? 0)
  const exceptions = rows.length
  const errors = [queueResult.error, territoryResult.error].filter(Boolean)

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Mercado · Territorio"
        title="Resolución territorial"
        meta={`${resolved} de ${active} resueltas · ${exceptions} excepciones`}
        actions={[{ label: 'Volver a Mercado', href: '/dashboard/market' }]}
      />

      {errors.length ? <div className="mt-5 border border-[#d7332b] bg-[#0c1111] p-4 text-sm text-[#ff766f]">No fue posible consultar todo el estado territorial.</div> : null}

      <MetricStrip items={[
        { label: 'Casas activas', value: active.toLocaleString('es-CL') },
        { label: 'Resueltas', value: resolved.toLocaleString('es-CL'), tone: resolved === active && active > 0 ? 'success' : 'default' },
        { label: 'Excepciones', value: exceptions.toLocaleString('es-CL'), tone: exceptions ? 'warning' : 'success' },
        { label: 'Decisiones CEO', value: '0' },
      ]} />

      {exceptions === 0 ? (
        <section className="mt-8 max-w-4xl border-y border-[var(--n3-line)] py-7">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[var(--n3-accent)]" />
            <div>
              <p className="text-lg font-medium text-[var(--n3-text-light)]">Territorio al día</p>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">Resolver v3 ya determinó y registró el barrio de todas las casas activas. No existe ninguna aprobación territorial pendiente para el CEO.</p>
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-8">
          <div className="border-b border-[var(--n3-line)] pb-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#ff8d87]">Excepciones reales</p>
            <h2 className="mt-1 text-lg font-medium text-[var(--n3-text-light)]">{exceptions} casos que el resolver no debe forzar</h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--n3-text-muted)]">Estos registros permanecen abiertos hasta que aparezca nueva evidencia. No se transforman en una tarea de aprobación ejecutiva.</p>
          </div>
          <div className="divide-y divide-[var(--n3-line)]">{rows.map((row) => <ExceptionCard key={row.source_listing_id} row={row} />)}</div>
        </section>
      )}

      <section className="mt-8 border-t border-[var(--n3-line)] pt-4">
        <div className="flex items-start gap-2 text-xs leading-5 text-[var(--n3-text-muted)]">
          <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[var(--n3-accent)]" />
          <p><span className="font-medium text-[var(--n3-text-light)]">Resolver v3.</span> Prioriza memoria territorial validada, evidencia cruzada, coordenadas KML, nombres KML canónicos, reglas territoriales verificadas y consenso CBRS. Las resoluciones automáticas quedan auditadas como sistema; identidad de propiedad se mantiene separada y nunca se crea sólo para asignar un barrio.</p>
        </div>
      </section>
    </WorkspaceShell>
  )
}
