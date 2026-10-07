import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import PublicValuationEstimator from '@/components/public/public-valuation-estimator'

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--n3-black)] text-[var(--n3-text-light)]">
      <header className="border-b border-[var(--n3-line)]">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:min-h-20 sm:px-8 lg:px-10">
          <Image
            src="/brand/property-partners-vitacura.png"
            alt="Property Partners Vitacura"
            width={230}
            height={64}
            className="h-8 w-auto max-w-[56vw] object-contain sm:h-10 sm:max-w-none"
            priority
          />
          <Link
            href="/auth/login"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 border border-[var(--n3-line)] px-3 text-xs font-medium text-[var(--n3-text-light)] transition-colors hover:border-[var(--n3-teal-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--n3-teal-soft)] sm:px-4 sm:text-sm"
          >
            <span className="hidden min-[360px]:inline">Iniciar sesión</span>
            <span className="min-[360px]:hidden">Ingresar</span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-[var(--n3-line)]">
        <div className="pointer-events-none absolute inset-0 opacity-35" aria-hidden="true">
          <div className="absolute left-1/2 top-[-14rem] h-[34rem] w-px bg-[var(--n3-line)]" />
          <div className="absolute left-[12%] top-0 h-full w-px bg-[var(--n3-line)]" />
          <div className="absolute right-[12%] top-0 h-full w-px bg-[var(--n3-line)]" />
          <div className="absolute left-0 top-[38%] h-px w-full bg-[var(--n3-line)]" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-8 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-10 lg:py-24">
          <div className="flex max-w-2xl flex-col justify-center">
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--n3-teal-soft)] sm:mb-5 sm:text-xs sm:tracking-[0.24em]">
              Property Partners Vitacura
            </p>
            <h1 className="max-w-[12ch] text-[clamp(2.65rem,11vw,4.5rem)] font-semibold leading-[0.98] tracking-[-0.045em]">
              Conoce un rango referencial para tu casa.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[var(--n3-text-muted)] sm:mt-7 sm:text-lg">
              Rango estimado con oferta activa de casas en Vitacura. Sin registro ni datos personales.
            </p>

          </div>

          <PublicValuationEstimator />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
        <details className="border-t border-[var(--n3-line)] pt-4">
          <summary className="min-h-11 cursor-pointer py-3 text-xs font-medium text-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)]">Cómo se calcula</summary>
          <div className="grid gap-5 border-t border-[var(--n3-line)] py-5 text-sm leading-6 text-[var(--n3-text-muted)] sm:grid-cols-3">
            <p>Usamos oferta activa de casas del sector cuando existe evidencia suficiente.</p>
            <p>Si el sector no alcanza el mínimo, usamos una referencia general de Vitacura y lo indicamos.</p>
            <p>El resultado es referencial y no reemplaza una valorización profesional.</p>
          </div>
        </details>
      </section>

      <footer className="border-t border-[var(--n3-line)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-7 text-xs leading-5 text-[var(--n3-text-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <span>Property Partners Vitacura</span>
          <span>Tecnología por N3uralia</span>
        </div>
      </footer>
    </main>
  )
}
