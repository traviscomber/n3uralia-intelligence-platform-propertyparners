'use client'

export default function PrintReportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print-hidden inline-flex min-h-10 items-center justify-center border border-[var(--n3-line)] px-4 py-2 text-xs font-semibold text-[var(--n3-text-light)] transition-colors hover:border-[var(--n3-teal)] hover:text-[#ff766f]"
    >
      Imprimir o guardar PDF
    </button>
  )
}
