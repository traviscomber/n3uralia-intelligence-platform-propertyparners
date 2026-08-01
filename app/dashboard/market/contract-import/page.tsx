'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const sourceOptions = ['portal_inmobiliario','cbrs','client','kml','manual_import']
const datasetOptions = ['portal_apartments','portal_houses','portal_projects','registered_sales','client_sales','kml_neighborhoods']

export default function ContractImportPage() {
  const [sourceSystem,setSourceSystem] = useState('portal_inmobiliario')
  const [datasetKind,setDatasetKind] = useState('portal_apartments')
  const [sourceName,setSourceName] = useState('')
  const [sourceFile,setSourceFile] = useState('payload.json')
  const [rows,setRows] = useState('[]')
  const [authorizationConfirmed,setAuthorizationConfirmed] = useState(false)
  const [runs,setRuns] = useState<any[]>([])
  const [message,setMessage] = useState('')
  const [busy,setBusy] = useState(false)

  async function refresh() {
    const response = await fetch('/api/market/contract-import',{ cache:'no-store' })
    if (response.ok) setRuns((await response.json()).runs ?? [])
  }

  useEffect(() => { void refresh() },[])

  async function submit() {
    setBusy(true)
    setMessage('')
    try {
      const parsed = JSON.parse(rows)
      const response = await fetch('/api/market/contract-import',{
        method:'POST',
        headers:{ 'content-type':'application/json' },
        body:JSON.stringify({ sourceSystem,datasetKind,sourceName,sourceFile,authorizationConfirmed,rows:parsed }),
      })
      const data = await response.json()
      setMessage(response.ok ? `Carga ${data.runId}: ${data.accepted} aceptadas, ${data.rejected} rechazadas.` : data.error)
      if (response.ok) await refresh()
    } catch {
      setMessage('JSON inválido.')
    }
    setBusy(false)
  }

  return <div className="space-y-6 pb-8">
    <header className="border-b border-[var(--n3-line)] pb-5">
      <Link href="/dashboard/market/import" className="text-sm text-[var(--n3-text-muted)]">← Volver a importación agregada</Link>
      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">Módulo I · Fuentes contractuales</p>
      <h1 className="mt-2 text-3xl font-semibold">Carga trazable de registros unitarios</h1>
      <p className="mt-2 max-w-3xl text-sm text-[var(--n3-text-muted)]">Registra origen, archivo, hash, autorización y resultado por fila. El contenido se conserva primero en la capa cruda para revisión y conciliación.</p>
    </header>

    <section className="grid gap-4 border border-[var(--n3-line)] p-5 lg:grid-cols-2">
      <label className="text-sm">Sistema de origen<select value={sourceSystem} onChange={(event)=>setSourceSystem(event.target.value)} className="mt-2 w-full border border-[var(--n3-line)] bg-transparent p-3">{sourceOptions.map((item)=><option key={item} value={item}>{item}</option>)}</select></label>
      <label className="text-sm">Tipo de dataset<select value={datasetKind} onChange={(event)=>setDatasetKind(event.target.value)} className="mt-2 w-full border border-[var(--n3-line)] bg-transparent p-3">{datasetOptions.map((item)=><option key={item} value={item}>{item}</option>)}</select></label>
      <label className="text-sm">Nombre de fuente<input value={sourceName} onChange={(event)=>setSourceName(event.target.value)} className="mt-2 w-full border border-[var(--n3-line)] bg-transparent p-3" placeholder="CBR Vitacura 2024" /></label>
      <label className="text-sm">Nombre del archivo<input value={sourceFile} onChange={(event)=>setSourceFile(event.target.value)} className="mt-2 w-full border border-[var(--n3-line)] bg-transparent p-3" /></label>
      <label className="lg:col-span-2 text-sm">Filas JSON<textarea value={rows} onChange={(event)=>setRows(event.target.value)} className="mt-2 min-h-72 w-full border border-[var(--n3-line)] bg-transparent p-3 font-mono text-xs" /></label>
      <label className="lg:col-span-2 flex items-center gap-3 text-sm"><input type="checkbox" checked={authorizationConfirmed} onChange={(event)=>setAuthorizationConfirmed(event.target.checked)} />Confirmo que Property Partners autorizó el uso de esta fuente y dataset.</label>
      <div className="lg:col-span-2"><button disabled={busy || !authorizationConfirmed} onClick={()=>void submit()} className="border border-[#d7332b] px-5 py-3 text-sm disabled:opacity-50">Registrar carga contractual</button></div>
    </section>

    {message ? <div className="border border-[var(--n3-line)] p-4 text-sm">{message}</div> : null}

    <section>
      <h2 className="mb-3 text-lg font-semibold">Historial de cargas</h2>
      <div className="overflow-x-auto border border-[var(--n3-line)]"><table className="min-w-[900px] w-full text-sm"><thead><tr>{['Fuente','Dataset','Archivo','Estado','Recibidas','Aceptadas','Rechazadas','Fecha'].map((item)=><th key={item} className="p-3 text-left text-xs uppercase text-[var(--n3-text-muted)]">{item}</th>)}</tr></thead><tbody>{runs.map((run)=><tr key={run.id} className="border-t border-[var(--n3-line)]"><td className="p-3">{run.source_system}</td><td className="p-3">{run.dataset_kind}</td><td className="p-3">{run.source_file ?? '—'}</td><td className="p-3">{run.status}</td><td className="p-3">{run.received_rows ?? 0}</td><td className="p-3">{run.accepted_rows}</td><td className="p-3">{run.rejected_rows}</td><td className="p-3">{new Date(run.created_at).toLocaleString('es-CL')}</td></tr>)}</tbody></table></div>
    </section>
  </div>
}
