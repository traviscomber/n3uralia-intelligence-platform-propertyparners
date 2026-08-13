import Link from 'next/link'
import { ArrowLeft, Upload } from 'lucide-react'
import { WorkspaceHeader, WorkspaceShell } from '@/components/ui/workspace'
import { PublicErrorNotice } from '@/components/feedback/public-error-notice'
import { getCbrsReferenceSnapshot } from '@/lib/cbrs-reference-intelligence'

function number(value: number | null, digits = 0) {
  if (value == null) return '—'
  return value.toLocaleString('es-CL', { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

export default async function CbrsMarketPage() {
  const snapshot = await getCbrsReferenceSnapshot()
  const years = [...new Set(snapshot.yearly.map((row) => row.year).filter((value): value is number => value !== null))].sort((a, b) => b - a)

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        eyebrow="Mercado · CBRS"
        title="Ventas registradas Vitacura"
        meta="Fuente canónica Property Partners · 2014–2026"
        actions={[
          { label: 'Cargar ventas detalladas', href: '/dashboard/market/import-cbrs', icon: <Upload size={15} /> },
          { label: 'Volver', href: '/dashboard/market', icon: <ArrowLeft size={15} /> },
        ]}
      />

      {snapshot.error ? <div className="mt-4"><PublicErrorNotice compact message="No fue posible consultar la referencia CBRS." /></div> : null}

      <section className="mt-7">
        <div className="border-b border-[var(--n3-line)] pb-2">
          <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Histórico consolidado</h2>
          <p className="mt-1 text-xs text-[var(--n3-text-muted)]">Una transacción por inscripción FOJA + NÚMERO + FECHA + TOMO; anexos se consolidan y remates/permutas quedan fuera del comparable residencial.</p>
        </div>
        <div className="divide-y divide-[var(--n3-line)]">
          {snapshot.global.map((row) => (
            <div key={row.propertyType} className="grid gap-4 py-4 sm:grid-cols-2 lg:grid-cols-5">
              <div><p className="text-sm font-semibold">{row.propertyType}</p><p className="text-xs text-[var(--n3-text-muted)]">{number(row.transactions)} compraventas</p></div>
              <div><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Mediana UF</p><p className="mt-1 text-lg font-semibold tabular-nums">{number(row.medianPriceUf)}</p></div>
              <div><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">UF/m²</p><p className="mt-1 text-lg font-semibold tabular-nums">{number(row.medianUfM2, 2)}</p></div>
              <div><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Superficie mediana</p><p className="mt-1 text-lg font-semibold tabular-nums">{number(row.medianAreaM2)} m²</p></div>
              <div><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">Nuevo / usado</p><p className="mt-1 text-lg font-semibold tabular-nums">{number(row.newTransactions)} / {number(row.usedTransactions)}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="border-b border-[var(--n3-line)] pb-2">
          <h2 className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">Evolución anual</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-[var(--n3-line)] text-left text-[10px] uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">
              <tr><th className="py-3 pr-4">Año</th><th className="py-3 pr-4">Tipo</th><th className="py-3 pr-4 text-right">Ventas</th><th className="py-3 pr-4 text-right">Mediana UF</th><th className="py-3 pr-4 text-right">UF/m²</th><th className="py-3 text-right">Área m²</th></tr>
            </thead>
            <tbody className="divide-y divide-[var(--n3-line)]">
              {years.flatMap((year) => snapshot.yearly.filter((row) => row.year === year).map((row) => (
                <tr key={`${year}-${row.propertyType}`}>
                  <td className="py-3 pr-4 tabular-nums">{year}</td><td className="py-3 pr-4">{row.propertyType}</td><td className="py-3 pr-4 text-right tabular-nums">{number(row.transactions)}</td><td className="py-3 pr-4 text-right tabular-nums">{number(row.medianPriceUf)}</td><td className="py-3 pr-4 text-right tabular-nums">{number(row.medianUfM2, 2)}</td><td className="py-3 text-right tabular-nums">{number(row.medianAreaM2)}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-6 text-xs text-[var(--n3-text-muted)]">
        <Link className="text-[var(--n3-accent)]" href="/dashboard/market/import-cbrs">Cargar workbook CBRS canónico</Link>
        <Link className="text-[var(--n3-accent)]" href="/dashboard/market">Volver a Inteligencia de Mercado</Link>
      </div>
    </WorkspaceShell>
  )
}