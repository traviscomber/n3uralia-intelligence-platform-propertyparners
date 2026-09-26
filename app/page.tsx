import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BarChart3, Building2, Map, Search } from 'lucide-react'
import VitacuraTerritoryLanding from '@/components/public/vitacura-territory-landing'
import { VITACURA_PUBLIC_TERRITORY } from '@/lib/vitacura-public-territory'

const shortcuts = [
  {
    label: 'Mercado',
    description: 'Oferta, evidencia y señales del mercado de Vitacura.',
    href: '/dashboard/market',
    icon: BarChart3,
  },
  {
    label: 'Mapa',
    description: 'Barrios KML canónicos de Vitacura.',
    href: '/dashboard/market/mapa',
    icon: Map,
  },
  {
    label: 'Propiedades',
    description: 'Property 360, seguimiento y trazabilidad.',
    href: '/dashboard/properties',
    icon: Building2,
  },
  {
    label: 'Valorizaciones',
    description: 'Expedientes, comparables y revisión profesional.',
    href: '/dashboard/valuations',
    icon: Search,
  },
] as const

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050807] text-[var(--n3-text-light)]">
      <header className="border-b border-white/10">
        <div className="mx-auto flex min-h-16 max-w-[1500px] items-center justify-between gap-4 px-4 sm:min-h-20 sm:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-4">
            <Image
              src="/brand/property-partners-vitacura.png"
              alt="Property Partners Vitacura"
              width={230}
              height={64}
              className="h-8 w-auto max-w-[54vw] object-contain sm:h-10 sm:max-w-none"
              priority
            />
            <span className="hidden border-l border-white/10 pl-4 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40 md:inline">
              Intelligence · Portal interno
            </span>
          </div>

          <Link
            href="/auth/login"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 border border-[#d7332b] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#d7332b]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff766f]"
          >
            Ingresar
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section className="border-b border-white/10">
        <div className="mx-auto grid max-w-[1500px] gap-8 px-4 py-7 sm:px-8 sm:py-10 lg:grid-cols-[minmax(320px,0.62fr)_minmax(0,1.38fr)] lg:gap-12 lg:px-10 lg:py-12">
          <div className="flex max-w-xl flex-col justify-between py-3 lg:py-8">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#ff766f]">
                Property Partners Intelligence · Vitacura
              </p>
              <h1 className="mt-5 max-w-[9ch] text-[clamp(3rem,8vw,6.4rem)] font-medium leading-[0.92] tracking-[-0.055em] text-white">
                Vitacura como territorio de trabajo.
              </h1>
              <p className="mt-7 max-w-lg text-base leading-7 text-white/58 sm:text-lg">
                Barrios, mercado, propiedades y valorizaciones conectados en un solo sistema. La portada parte por el territorio, no por un cotizador.
              </p>
            </div>

            <div className="mt-10 border-t border-white/10 pt-5">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] uppercase tracking-[0.14em] text-white/38">
                <span>KML canónico</span>
                <span>{VITACURA_PUBLIC_TERRITORY.length} barrios</span>
                <span>Vitacura</span>
              </div>
              <Link
                href="/auth/login"
                className="mt-5 inline-flex min-h-11 items-center gap-2 bg-[#d7332b] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#bf2c25] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff766f]"
              >
                Entrar al portal
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <VitacuraTerritoryLanding features={VITACURA_PUBLIC_TERRITORY} />
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-4 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#ff766f]">Acceso rápido</p>
            <h2 className="mt-2 text-2xl font-medium text-white">Ir directo al trabajo.</h2>
          </div>
          <p className="text-xs text-white/35">Las áreas operacionales requieren sesión activa.</p>
        </div>

        <div className="grid border-l border-t border-white/10 sm:grid-cols-2 xl:grid-cols-4">
          {shortcuts.map((item, index) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className="group min-h-44 border-b border-r border-white/10 p-5 transition-colors hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ff766f]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/28">{String(index + 1).padStart(2, '0')}</span>
                  <Icon className="size-4 text-[#ff766f]" aria-hidden="true" />
                </div>
                <h3 className="mt-7 text-lg font-medium text-white">{item.label}</h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-white/45">{item.description}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-white/68 transition-colors group-hover:text-white">
                  Abrir <ArrowRight className="size-3.5" aria-hidden="true" />
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-2 px-4 py-6 text-[10px] uppercase tracking-[0.12em] text-white/28 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <span>Property Partners Vitacura · Intelligence Platform</span>
          <span>Desarrollado por N3uralia</span>
        </div>
      </footer>
    </main>
  )
}
