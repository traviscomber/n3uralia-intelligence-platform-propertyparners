import Link from 'next/link'

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return <>
    <nav aria-label="Navegación del módulo de mercado" className="print-hidden mb-4 flex flex-wrap gap-2 px-4 pt-4 lg:px-8">
      <Link href="/dashboard/market" className="border border-[var(--n3-line)] px-4 py-2 text-xs">Resumen</Link>
      <Link href="/dashboard/market/oferta" className="border border-[var(--n3-line)] px-4 py-2 text-xs">Oferta actual</Link>
      <Link href="/dashboard/market/inteligencia" className="border border-[var(--n3-line)] px-4 py-2 text-xs">Oferta vs ventas</Link>
      <Link href="/dashboard/market/evolucion" className="border border-[var(--n3-line)] px-4 py-2 text-xs">4 años</Link>
      <Link href="/dashboard/market/mapa" className="border border-[var(--n3-line)] px-4 py-2 text-xs">Mapa KML</Link>
      <Link href="/dashboard/market/comparables" className="border border-[var(--n3-line)] px-4 py-2 text-xs">Comparables</Link>
    </nav>
    {children}
  </>
}
