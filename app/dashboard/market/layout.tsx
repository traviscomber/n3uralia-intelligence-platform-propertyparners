import Link from 'next/link'
import './market-responsive.css'

/**
 * The dashboard shell has an independently scrollable content pane.
 * Contain wide descendants here, without suppressing vertical scrolling
 * or clipping the printable report.
 */
export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return <div data-testid="market-responsive-shell" className="market-responsive-shell w-full min-w-0 max-w-full overflow-x-clip print:overflow-visible">
    <nav aria-label="Navegación del módulo de mercado" className="print-hidden mb-4 grid min-w-0 grid-cols-2 gap-2 px-0 pt-4 min-[520px]:flex min-[520px]:flex-wrap sm:px-4 lg:px-8">
      <Link href="/dashboard/market" className="inline-flex min-h-11 min-w-0 items-center justify-center break-words border border-[var(--n3-line)] px-2 py-2 text-center text-xs sm:px-4">Resumen</Link>
      <Link href="/dashboard/market/oferta" className="inline-flex min-h-11 min-w-0 items-center justify-center break-words border border-[var(--n3-line)] px-2 py-2 text-center text-xs sm:px-4">Casas y departamentos</Link>
      <Link href="/dashboard/market/mapa" className="inline-flex min-h-11 min-w-0 items-center justify-center break-words border border-[var(--n3-line)] px-2 py-2 text-center text-xs sm:px-4">Mapa de barrios</Link>
      <Link href="/dashboard/market/comparables" className="inline-flex min-h-11 min-w-0 items-center justify-center break-words border border-[var(--n3-line)] px-2 py-2 text-center text-xs sm:px-4">Comparables</Link>
    </nav>
    <div className="w-full min-w-0 max-w-full">{children}</div>
  </div>
}
