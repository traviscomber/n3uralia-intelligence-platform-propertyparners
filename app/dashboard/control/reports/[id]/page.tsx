'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'

type Report = { id:string; report_type:string; period_start:string; period_end:string; status:string; generated_at:string; snapshot:any }

export default function PrintableManagementReportPage() {
  const params = useParams<{ id:string }>()
  const [report,setReport] = useState<Report|null>(null)
  const [error,setError] = useState('')

  useEffect(() => {
    fetch(`/api/management/reports/${params.id}`, { cache:'no-store' }).then(async response => {
      const data = await response.json()
      if (!response.ok) throw new Error('No fue posible cargar el reporte.')
      setReport(data.report)
    }).catch(() => setError('No fue posible cargar el reporte. Reintenta más tarde o consulta con un administrador.'))
  }, [params.id])

  const entities = useMemo(() => report?.snapshot?.entities ?? [], [report])
  const alerts = useMemo(() => report?.snapshot?.alerts ?? [], [report])

  if (error) return <div className="p-8 text-sm text-red-400">No fue posible cargar el reporte. Reintenta más tarde o consulta con un administrador.</div>
  if (!report) return <div className="p-8 text-sm text-[var(--n3-text-muted)]">Cargando reporte…</div>

  return <main className="mx-auto max-w-6xl bg-white p-8 text-black print:max-w-none print:p-0">
    <div className="mb-8 flex items-start justify-between gap-6 border-b border-black pb-5 print:hidden"><div><p className="text-xs uppercase tracking-[0.18em]">Módulo III · Reporte contractual</p><h1 className="mt-2 text-3xl font-semibold">{report.report_type}</h1></div><button onClick={() => window.print()} className="border border-black px-4 py-2 text-sm">Imprimir / guardar PDF</button></div>
    <header className="mb-8 border-b-2 border-black pb-6"><p className="text-xs uppercase tracking-[0.18em]">Property Partners · N3uralia Intelligence Platform</p><h1 className="mt-3 text-4xl font-semibold capitalize">Reporte {report.report_type}</h1><div className="mt-4 grid gap-2 text-sm sm:grid-cols-3"><p><strong>Período:</strong> {report.period_start} — {report.period_end}</p><p><strong>Estado:</strong> {report.status}</p><p><strong>Generado:</strong> {new Date(report.generated_at).toLocaleString('es-CL')}</p></div></header>

    <section className="mb-8"><h2 className="mb-4 text-xl font-semibold">Resumen ejecutivo</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="border border-black p-4"><p className="text-xs uppercase">Entidades</p><p className="mt-2 text-3xl font-semibold">{entities.length}</p></div><div className="border border-black p-4"><p className="text-xs uppercase">Alertas abiertas</p><p className="mt-2 text-3xl font-semibold">{alerts.length}</p></div><div className="border border-black p-4"><p className="text-xs uppercase">Período</p><p className="mt-2 text-lg font-semibold">{report.snapshot?.period ?? report.period_start.slice(0,7)}</p></div><div className="border border-black p-4"><p className="text-xs uppercase">Rol de generación</p><p className="mt-2 text-lg font-semibold capitalize">{report.snapshot?.profile?.role ?? 'n/d'}</p></div></div></section>

    <section className="mb-8"><h2 className="mb-4 text-xl font-semibold">Resultados por entidad</h2><div className="overflow-x-auto"><table className="w-full border-collapse text-sm"><thead><tr>{['Entidad','Tipo','Métrica','Valor','Fuente','Calidad'].map(item => <th key={item} className="border border-black p-2 text-left">{item}</th>)}</tr></thead><tbody>{entities.flatMap((entity:any) => (entity.metrics ?? []).map((metric:any) => <tr key={`${entity.id}-${metric.code}`}><td className="border border-black p-2">{entity.name}</td><td className="border border-black p-2">{entity.entityType ?? entity.entity_type}</td><td className="border border-black p-2">{metric.label ?? metric.code}</td><td className="border border-black p-2">{metric.value ?? 'n/d'}</td><td className="border border-black p-2">{metric.sourceName ?? metric.source_name ?? 'Pendiente'}</td><td className="border border-black p-2">{metric.qualityStatus ?? metric.quality_status ?? 'sin datos'}</td></tr>))}</tbody></table></div></section>

    <section className="mb-8"><h2 className="mb-4 text-xl font-semibold">Alertas y excepciones</h2>{alerts.length ? <div className="space-y-3">{alerts.map((alert:any) => <article key={alert.id} className="border border-black p-4"><div className="flex justify-between gap-4"><strong>{alert.title}</strong><span className="uppercase">{alert.severity}</span></div><p className="mt-2 text-sm">{alert.detail}</p></article>)}</div> : <p className="border border-black p-4 text-sm">No hay alertas abiertas registradas para este snapshot.</p>}</section>

    <footer className="mt-12 border-t border-black pt-4 text-xs"><p>Documento generado desde un snapshot inmutable. Los valores sin fuente o calidad validada se muestran como pendientes y no se completan con datos de demostración.</p><p className="mt-2">Identificador: {report.id}</p></footer>
  </main>
}
