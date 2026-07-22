'use client'

import { useState } from 'react'

type LiveSample = {
  listingId: string
  sourceUrl: string
  propertyType: string
  title: string | null
  priceUf: number | null
  attributesRaw: string | null
  areaM2: null
  bedrooms: number | null
  bathrooms: number | null
  location: string | null
}

export default function SourcesPage() {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [records, setRecords] = useState<LiveSample[]>([])

  async function capture() {
    setLoading(true)
    setMessage(null)
    try {
      const response = await fetch('/api/scrape/portal-inmobiliario', { method: 'POST', headers: { 'x-live-source-confirmed': 'true' } })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No fue posible capturar la fuente.')
      setRecords(Array.isArray(payload.records) ? payload.records : [])
      setMessage(`${payload.captured} observados · ${payload.validForReconciliation} válidos para revisión · ${payload.rejected} rechazados · cero escrituras`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible capturar la fuente.')
    } finally {
      setLoading(false)
    }
  }

  function download() {
    const blob = new Blob([JSON.stringify({ provenance: 'live_unreconciled', eligibleForAuditedViews: false, writesPerformed: 0, records }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `portal_muestra_validacion_${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return <div className="mx-auto max-w-6xl space-y-6 pb-16">
    <header className="border border-[var(--n3-line)] bg-[#0c1111] p-8">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6aa9ff]">Fuente viva · separada</p>
      <h1 className="mt-4 text-4xl font-semibold">Portal Inmobiliario en validación</h1>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">Captura manual para observar cambios de mercado. Nunca modifica el snapshot auditado, los KPI, la valorización ni los reportes.</p>
    </header>

    <section className="border border-[#6aa9ff] bg-[#0c1111] p-6">
      <label className="flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} /><span><strong>Confirmo captura de fuente viva no conciliada</strong><span className="mt-1 block text-xs text-[var(--n3-text-muted)]">Acción disponible sólo para CEO/admin. Los ausentes quedan n/d y se realizan cero escrituras.</span></span></label>
      <div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" onClick={capture} disabled={!enabled || loading} className="bg-[#d7332b] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">{loading ? 'Capturando…' : 'Capturar nueva muestra'}</button>{records.length > 0 && <button type="button" onClick={download} className="border border-[#6aa9ff] px-4 py-2 text-xs font-semibold text-[#6aa9ff]">Descargar JSON</button>}{message && <span className="text-xs text-[var(--n3-text-muted)]">{message}</span>}</div>
    </section>

    {records.length > 0 && <section className="border border-[var(--n3-line)] bg-[#0c1111]">
      <div className="border-b border-[var(--n3-line)] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6aa9ff]">No conciliado · no oficial</p><h2 className="mt-2 text-xl font-semibold">Registros observados</h2><p className="mt-2 text-xs text-[var(--n3-text-muted)]">La superficie queda n/d hasta distinguir de forma inequívoca superficie útil, total o terreno. Se conserva el texto original.</p></div>
      <div className="overflow-x-auto"><table className="min-w-full text-xs"><thead><tr className="border-b border-[var(--n3-line)] text-left text-[var(--n3-text-muted)]"><th className="p-3">ID</th><th className="p-3">Tipo</th><th className="p-3">Precio</th><th className="p-3">Atributos originales</th><th className="p-3">Fuente</th></tr></thead><tbody>{records.map((record) => <tr key={record.sourceUrl} className="border-b border-[var(--n3-line)]"><td className="p-3">{record.listingId}</td><td className="p-3">{record.propertyType}</td><td className="p-3">{record.priceUf === null ? 'n/d' : `UF ${record.priceUf.toLocaleString('es-CL')}`}</td><td className="p-3 text-[var(--n3-text-muted)]">{record.attributesRaw || 'n/d'}</td><td className="p-3"><a href={record.sourceUrl} target="_blank" rel="noreferrer" className="text-[#6aa9ff] underline">Abrir</a></td></tr>)}</tbody></table></div>
    </section>}
  </div>
}
