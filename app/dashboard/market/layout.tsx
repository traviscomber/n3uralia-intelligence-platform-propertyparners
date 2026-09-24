import Link from 'next/link'

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return <>
    <nav aria-label="Navegación del módulo de mercado" className="print-hidden mb-4 flex flex-wrap gap-2 px-4 pt-4 lg:px-8">
      <Link href="/dashboard/market" className="border border-[var(--n3-line)] px-4 py-2 text-xs">Hoy</Link>
      <Link href="/dashboard/market/oferta" className="border border-[var(--n3-line)] px-4 py-2 text-xs">Oferta</Link>
      <Link href="/dashboard/market/mapa" className="border border-[var(--n3-line)] px-4 py-2 text-xs">Mapa de barrios</Link>
      <Link href="/dashboard/market/comparables" className="border border-[var(--n3-line)] px-4 py-2 text-xs">Conectar comparables</Link>
    </nav>
    {children}
  </>
}
