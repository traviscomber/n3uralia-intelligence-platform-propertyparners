'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import { IntelligenceHeader, IntelligencePage, IntelligencePanel, MethodologyNote } from '@/components/intelligence/design-system'

const EXPECTED_SHA = 'dd934b080dac2d9555c3dc9654c1226e525377a30f36f1368c52f4d49719cee3'
const BATCH_SIZE = 500

type RawRow = Record<string, unknown>
type Tx = {
  event_key: string; property_type: 'Casa' | 'Departamento'; transaction_date: string
  foja: string | null; numero: string | null; tomo: string | null; address: string | null; rol: string | null
  price_uf: number | null; built_area_m2: number | null; land_area_m2: number | null; bedrooms_bathrooms: string | null
  construction_year: number | null; latitude: number | null; longitude: number | null; neighborhood: string | null
  source_row_number: number; component_count: number
}

function text(value: unknown) { const s = String(value ?? '').trim(); return s || null }
function num(value: unknown) { const n = Number(value); return Number.isFinite(n) ? n : null }
function isoDate(value: unknown) {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString().slice(0, 10)
  const parsed = new Date(String(value ?? ''))
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : ''
}

async function sha256(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function consolidate(rows: RawRow[]): Tx[] {
  const events = new Map<string, Array<{ row: RawRow; rowNumber: number }>>()
  rows.forEach((row, index) => {
    if (String(row['TIPO DE INSCRIPCION'] ?? '').trim().toUpperCase() !== 'COMPRAVENTA') return
    const date = isoDate(row.FECHA)
    const key = `${text(row.FOJA) ?? ''}|${text(row.NUMERO) ?? ''}|${date}|${text(row.TOMO) ?? ''}`
    const bucket = events.get(key) ?? []
    bucket.push({ row, rowNumber: index + 2 })
    events.set(key, bucket)
  })

  const result: Tx[] = []
  for (const [eventKey, components] of events) {
    const primary = components.filter(({ row }) => ['DEPARTAMENTO', 'CASA-HABITACION'].includes(String(row.DESCRIPCION ?? '').trim().toUpperCase()))
    if (primary.length !== 1) continue
    const { row, rowNumber } = primary[0]
    const propertyType = String(row.DESCRIPCION ?? '').trim().toUpperCase() === 'DEPARTAMENTO' ? 'Departamento' : 'Casa'
    const componentPrices = components.map(({ row: component }) => num(component.UF)).filter((v): v is number => v != null && v > 0)
    result.push({
      event_key: eventKey,
      property_type: propertyType,
      transaction_date: isoDate(row.FECHA),
      foja: text(row.FOJA), numero: text(row.NUMERO), tomo: text(row.TOMO), address: text(row.DIRECCION), rol: text(row.ROL),
      price_uf: componentPrices.length ? Number(componentPrices.reduce((a, b) => a + b, 0).toFixed(4)) : null,
      built_area_m2: num(row.SUP_CONSTRUIDA), land_area_m2: num(row.SUP_TERRENO), bedrooms_bathrooms: text(row.PROGRAMA),
      construction_year: num(row['AÑO_CONSTRUCCION']) == null ? null : Math.trunc(num(row['AÑO_CONSTRUCCION']) as number),
      latitude: num(row.LAT), longitude: num(row.LON), neighborhood: text(row.BARRIO), source_row_number: rowNumber, component_count: components.length,
    })
  }
  return result
}

export default function ImportCbrsPage() {
  const [status, setStatus] = useState('Selecciona el workbook CBRS canónico.')
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)

  async function importFile(file: File) {
    setBusy(true); setProgress(0)
    try {
      const buffer = await file.arrayBuffer()
      const hash = await sha256(buffer)
      if (hash !== EXPECTED_SHA) throw new Error('El archivo no coincide con el workbook CBRS canónico aprobado.')
      setStatus('Hash validado. Consolidando inscripciones…')
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
      const sheet = workbook.Sheets.Sheet1
      if (!sheet) throw new Error('No existe la hoja canónica Sheet1.')
      const raw = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: null, raw: true })
      const transactions = consolidate(raw)
      if (raw.length !== 40843 || transactions.length !== 17581) throw new Error(`Control de integridad falló: ${raw.length} filas / ${transactions.length} operaciones.`)
      setStatus(`Integridad validada: 40.843 filas → 17.581 compraventas. Cargando…`)

      for (let offset = 0; offset < transactions.length; offset += BATCH_SIZE) {
        const batch = transactions.slice(offset, offset + BATCH_SIZE)
        const response = await fetch('/api/market/cbrs-canonical-import', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceSha256: hash, rows: batch }),
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'Falló la carga CBRS.')
        const done = Math.min(offset + batch.length, transactions.length)
        setProgress(Math.round(done / transactions.length * 100))
        setStatus(`Cargando CBRS: ${done.toLocaleString('es-CL')} / ${transactions.length.toLocaleString('es-CL')} operaciones.`)
      }
      setProgress(100); setStatus('CBRS canónico cargado: 17.581 compraventas residenciales disponibles para valorización.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible importar CBRS.')
    } finally { setBusy(false) }
  }

  return <IntelligencePage>
    <IntelligenceHeader eyebrow="Mercado · Fuente canónica" title="Importar CBRS Vitacura" description="Carga local, verificada por hash y consolidada por inscripción. El workbook completo no se sube al servidor." actions={[{ label: 'Volver a mercado', href: '/dashboard/market' }, { label: 'Valorizador', href: '/dashboard/valuation' }]} />
    <MethodologyNote>Regla canónica: una operación por FOJA + NUMERO + FECHA + TOMO; exactamente un activo residencial principal; UF suma los componentes de la inscripción; remates y permutas quedan fuera. Las operaciones sin precio, barrio o superficie se preservan, pero no se proponen como comparables económicos.</MethodologyNote>
    <IntelligencePanel eyebrow="Workbook aprobado" title="BASE_CBR_CON_BARRIO_ASIGNADO VITACURA.xlsx" description="El archivo se procesa en tu navegador. Solo se envían las operaciones residenciales consolidadas.">
      <div className="space-y-5 p-5">
        <input disabled={busy} type="file" accept=".xlsx" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file) }} className="block w-full text-sm" />
        <div className="h-2 overflow-hidden bg-[#111818]"><div className="h-full bg-[#d7332b] transition-all" style={{ width: `${progress}%` }} /></div>
        <p className="text-sm text-[var(--n3-text-muted)]">{status}</p>
      </div>
    </IntelligencePanel>
  </IntelligencePage>
}
