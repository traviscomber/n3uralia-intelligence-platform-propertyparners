import { BrainCircuit, FileCheck2, Send, ShieldCheck } from 'lucide-react'
import { requirePageCapability } from '@/lib/access-guards'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCanonicalClientReportConfiguration } from '@/lib/n3uralia-canonical-client-report'
import {
  IntelligenceHeader,
  IntelligencePage,
  IntelligencePanel,
  MetricCard,
  MetricGrid,
  SectionHeading,
} from '@/components/intelligence/design-system'

type CanonicalDocumentRow = {
  id: string
  title: string
  content: string
  tags: string[] | null
  created_at: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function parseContent(content: string) {
  try {
    return asRecord(JSON.parse(content))
  } catch {
    return null
  }
}

function readRecord(record: Record<string, unknown> | null, key: string) {
  return record ? asRecord(record[key]) : null
}

function readString(record: Record<string, unknown> | null, key: string, fallback = 'n/d') {
  return record && typeof record[key] === 'string' && String(record[key]).trim()
    ? String(record[key])
    : fallback
}

function readNumber(record: Record<string, unknown> | null, key: string) {
  if (!record) return null
  const value = Number(record[key])
  return Number.isFinite(value) ? value : null
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'n/d'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export default async function CanonicalClientReportsPage() {
  await requirePageCapability('reports.global.read')
  const configuration = getCanonicalClientReportConfiguration()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('knowledge_documents')
    .select('id, title, content, tags, created_at')
    .contains('tags', ['n3uralia-client-report'])
    .order('created_at', { ascending: false })
    .limit(24)

  const documents = error ? [] : (data || []) as CanonicalDocumentRow[]

  return (
    <IntelligencePage>
      <IntelligenceHeader
        eyebrow="N3uralia Canonical Publishing"
        title="Informes canónicos hacia el Cliente"
        description="Registro oficial de informes ejecutivos construidos sólo con fuentes verificadas. El estándar separa hechos, avances del portal, estado contractual, dependencias, próximos hitos y estado de entrega."
        actions={[
          { label: 'Reportes ejecutivos', href: '/dashboard/reportes/autonomos', primary: true },
          { label: 'Operación de reportes', href: '/dashboard/reportes/operacion' },
        ]}
        meta={<div className="border border-[var(--n3-line)] bg-[#0c1111] px-4 py-3 text-xs text-[var(--n3-text-muted)]">Estándar activo · versión {configuration.standardVersion} · fuentes canónicas únicamente</div>}
      />

      <section>
        <SectionHeading eyebrow="01 · Canonical Standard" title="Configuración editorial y de inteligencia" />
        <MetricGrid>
          <MetricCard label="Tipo" value="Cliente" detail={configuration.name} />
          <MetricCard label="Modelo" value="GPT-5.6 Sol" detail={`${configuration.api} · ${configuration.reasoningMode} · esfuerzo ${configuration.reasoningEffort}`} />
          <MetricCard label="Retención API" value="No" detail="Las solicitudes se ejecutan con store=false." />
          <MetricCard label="Política de fuentes" value="Canónica" detail="No se permite completar vacíos con supuestos o datos externos." />
        </MetricGrid>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <IntelligencePanel eyebrow="Required Structure" title="Bloques obligatorios" description="Todos los informes mantienen la misma arquitectura para que el Cliente pueda comparar períodos y entregas.">
          <div className="grid gap-px bg-[var(--n3-line)] md:grid-cols-2">
            {configuration.requiredSections.map((section, index) => (
              <div key={section} className="bg-[#080d0d] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ff766f]">0{index + 1}</p>
                <p className="mt-2 text-sm text-[var(--n3-text-light)]">{section}</p>
              </div>
            ))}
          </div>
        </IntelligencePanel>

        <IntelligencePanel eyebrow="Governance" title="Controles no negociables" description="La IA organiza y redacta; no reemplaza la evidencia ni la aprobación humana." critical>
          <div className="space-y-4 p-5">
            {[
              ['Evidencia', 'Cada afirmación material conserva referencias hacia el paquete fuente.'],
              ['Estados', 'Se distingue completo, parcial, pendiente Cliente y pendiente N3uralia.'],
              ['Pago', 'Un informe reenviado para cobro no se registra como pagado hasta confirmación.'],
              ['Publicación', 'La versión distribuible requiere revisión humana antes del envío externo.'],
            ].map(([title, detail]) => (
              <div key={title} className="flex gap-3">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#ff766f]" />
                <div><p className="text-xs font-semibold text-[var(--n3-text-light)]">{title}</p><p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">{detail}</p></div>
              </div>
            ))}
          </div>
        </IntelligencePanel>
      </section>

      <section>
        <SectionHeading
          eyebrow="02 · Client Delivery Registry"
          title="Informes registrados"
          description="La copia canónica conserva estado, destinatario, hito comercial, período, fecha de corte y huellas de los archivos entregados."
        />

        {documents.length === 0 ? (
          <IntelligencePanel eyebrow="Registry" title="Sin informes registrados" description="No existe todavía un documento con la etiqueta canónica de cliente.">
            <div className="p-5 text-sm text-[var(--n3-text-muted)]">Genere el primer informe mediante el endpoint autorizado o registre una entrega ya validada.</div>
          </IntelligencePanel>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {documents.map((document) => {
              const parsed = parseContent(document.content)
              const period = readRecord(parsed, 'period')
              const delivery = readRecord(parsed, 'delivery')
              const artifacts = readRecord(parsed, 'artifacts')
              const milestone = readNumber(delivery, 'paymentMilestonePercent')
              const summary = readString(parsed, 'executive_summary', readString(parsed, 'summary', document.content.slice(0, 420)))
              const deliveryStatus = readString(delivery, 'status', document.tags?.includes('resent') ? 'resent' : 'registered')
              const paymentStatus = readString(delivery, 'paymentStatus', document.tags?.includes('payment-received') ? 'received' : 'pending')

              return (
                <article key={document.id} className="border border-[var(--n3-line)] bg-[#0c1111] p-6">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ff766f]">Informe canónico N3uralia</p>
                      <h2 className="mt-2 text-xl font-semibold text-[var(--n3-text-light)]">{document.title}</h2>
                    </div>
                    <FileCheck2 size={22} className="shrink-0 text-[#ff766f]" />
                  </div>

                  <p className="mt-4 text-sm leading-6 text-[var(--n3-text-muted)]">{summary}</p>

                  <div className="mt-5 grid gap-px bg-[var(--n3-line)] sm:grid-cols-2">
                    {[
                      ['Período', `${readString(period, 'start')} — ${readString(period, 'end')}`],
                      ['Corte de fuentes', readString(period, 'source_cutoff')],
                      ['Destinatario', readString(delivery, 'recipient')],
                      ['Entrega', deliveryStatus],
                      ['Hito de pago', milestone === null ? 'n/a' : `${milestone}%`],
                      ['Estado de pago', paymentStatus],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-[#080d0d] p-3">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{label}</p>
                        <p className="mt-1 text-xs font-medium text-[var(--n3-text-light)]">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 space-y-2 border-l-2 border-[#d7332b] pl-4 text-xs leading-5 text-[var(--n3-text-muted)]">
                    <p>Registrado: {formatDate(document.created_at)}</p>
                    <p>PDF: {artifacts ? readString(readRecord(artifacts, 'pdf'), 'sha256', 'huella registrada en la copia canónica') : 'huella registrada en la copia canónica'}</p>
                    <p>DOCX: {artifacts ? readString(readRecord(artifacts, 'docx'), 'sha256', 'huella registrada en la copia canónica') : 'huella registrada en la copia canónica'}</p>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 border border-[var(--n3-line)] bg-[#080d0d] px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]"><Send size={13} /> {deliveryStatus}</span>
                    <span className="inline-flex items-center gap-2 border border-[var(--n3-line)] bg-[#080d0d] px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]"><BrainCircuit size={13} /> {configuration.model}</span>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <footer className="flex items-center gap-2 border-t border-[var(--n3-line)] pt-5 text-xs text-[var(--n3-text-muted)]">
        <ShieldCheck size={15} /> N3uralia Canonical Client Reporting · revisión humana obligatoria antes de distribución
      </footer>
    </IntelligencePage>
  )
}
