import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import VitacuraTerritoryLanding from '@/components/public/vitacura-territory-landing'
import { VITACURA_PUBLIC_TERRITORY } from '@/lib/vitacura-public-territory'

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
                Property Partners · Vitacura
              </p>
              <h1 className="mt-5 max-w-[9ch] text-[clamp(3rem,8vw,6.4rem)] font-medium leading-[0.92] tracking-[-0.055em] text-white">
                El territorio primero.
              </h1>
              <p className="mt-7 max-w-lg text-base leading-7 text-white/58 sm:text-lg">
                Una portada simple para entrar al sistema desde la geografía real de Vitacura. Sin mezclar mercado, gestión, valorizaciones ni operación comercial.
              </p>
            </div>

            <div className="mt-10 border-t border-white/10 pt-5">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] uppercase tracking-[0.14em] text-white/38">
                <span>KML Property Partners</span>
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

      <section className="mx-auto max-w-[1500px] px-4 py-7 sm:px-8 lg:px-10">
        <div className="grid gap-5 border-t border-white/10 pt-5 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/30">Portada interna</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/42">
              Después de iniciar sesión, cada área mantiene su propia pregunta y su propia vista. Mercado no se mezcla con control ejecutivo ni con Property 360.
            </p>
          </div>
          <Link href="/auth/login" className="inline-flex items-center gap-2 text-xs font-medium text-white/64 hover:text-white">
            Abrir sistema <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-2 px-4 py-6 text-[10px] uppercase tracking-[0.12em] text-white/28 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <span>Property Partners Vitacura</span>
          <span>Desarrollado por N3uralia</span>
        </div>
      </footer>
    </main>
  )
}
