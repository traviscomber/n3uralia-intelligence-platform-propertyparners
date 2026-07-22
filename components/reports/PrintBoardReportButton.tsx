'use client'

export function PrintBoardReportButton() {
  return (
    <button type="button" onClick={() => window.print()} className="print:hidden border border-white/25 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10">
      Imprimir / guardar PDF
    </button>
  )
}
