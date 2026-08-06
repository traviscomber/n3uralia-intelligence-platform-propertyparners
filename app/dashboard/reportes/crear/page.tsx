import { requirePageCapability } from '@/lib/access-guards'
import { createAdminClient } from '@/lib/supabase/admin'
import { ReportCreateForm } from '@/components/report-create-form'
import {
  IntelligenceHeader,
  IntelligencePage,
} from '@/components/intelligence/design-system'

export default async function CreateReportPage() {
  await requirePageCapability('reports.global.read')

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('knowledge_documents')
    .select('id,title,content,created_at,tags')
    .contains('tags', ['canonical'])
    .neq('doc_type', 'report')
    .order('created_at', { ascending: false })
    .limit(40)

  const sources = error ? [] : (data || []).map((document) => ({
    id: String(document.id),
    title: String(document.title),
    excerpt: String(document.content || '').replace(/\s+/g, ' ').trim().slice(0, 1_800),
    createdAt: String(document.created_at),
  }))

  return (
    <IntelligencePage>
      <IntelligenceHeader
        eyebrow="Reportin · Creación canónica"
        title="Crear reporte"
        description="Seleccione el período y las fuentes verificadas. N3uralia valida la evidencia, genera la narrativa, compone el PDF y lo deja disponible para revisión."
        actions={[
          { label: 'Informes generados', href: '/dashboard/reportes/canonicos' },
          { label: 'Reportes ejecutivos', href: '/dashboard/reportes/autonomos' },
        ]}
        meta={<div className="bg-[#0c1111] px-4 py-3 text-xs text-[var(--n3-text-muted)] ring-1 ring-[var(--n3-line)]">Una tarea principal · fuentes canónicas · revisión humana obligatoria</div>}
      />

      <ReportCreateForm sources={sources} />
    </IntelligencePage>
  )
}
