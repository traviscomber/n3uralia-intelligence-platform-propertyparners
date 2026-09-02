import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BarChart3, CheckCircle2, ShieldCheck } from 'lucide-react'
import PublicValuationEstimator from '@/components/public/public-valuation-estimator'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--n3-black)] text-[var(--n3-text-light)]">
      <header className="border-b border-[var(--n3-line)]">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <Image
            src="/brand/property-partners-vitacura.png"
            alt="Property Partners Vitacura"
            width={230}
            height={64}
            className="h-10 w-auto object-contain"
            priority
          />
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 border border-[var(--n3-line)] px-4 py-2.5 text-sm font-medium text-[var(--n3-text-light)] hover:border-[var(--n3-teal-soft)]"
          >
            Iniciar sesión <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-[var(--n3-line)]">
        <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
          <div className="absolute left-1/2 top-[-14rem] h-[34rem] w-px bg-[var(--n3-line)]" />
          <div className="absolute left-[12%] top-0 h-full w-px bg-[var(--n3-line)]" />
          <div className="absolute right-[12%] top-0 h-full w-px bg-[var(--n3-line)]" />
          <div className="absolute left-0 top-[38%] h-px w-full bg-[var(--n3-line)]" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-10 lg:py-24">
          <div className="flex max-w-2xl flex-col justify-center">
            <p className="mb-5 text-xs font-medium uppercase tracking-[0.24em] text-[var(--n3-teal-soft)]">
              Property Partners Intelligence · Vitacura
            </p>
            <h1 className="text-5xl font-semibold leading-[0.98] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Conoce un rango referencial para tu casa.
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-[var(--n3-text-muted)] sm:text-lg">
              Estimación rápida basada en oferta activa y resolución territorial de mercado. Sin registro y sin entregar datos personales.
            </p>

            <div className="mt-9 grid max-w-xl gap-4 sm:grid-cols-3">
              <div className="border-l border-[var(--n3-teal)] pl-4">
                <BarChart3 className="mb-3 size-5 text-[var(--n3-teal-soft)]" aria-hidden="true" />
                <span className="text-sm leading-5 text-[var(--n3-text-muted)]">Datos de mercado activos</span>
              </div>
              <div className="border-l border-[var(--n3-teal)] pl-4">
                <CheckCircle2 className="mb-3 size-5 text-[var(--n3-teal-soft)]" aria-hidden="true" />
                <span className="text-sm leading-5 text-[var(--n3-text-muted)]">Muestra mínima verificable</span>
              </div>
              <div className="border-l border-[var(--n3-teal)] pl-4">
                <ShieldCheck className="mb-3 size-5 text-[var(--n3-teal-soft)]" aria-hidden="true" />
                <span className="text-sm leading-5 text-[var(--n3-text-muted)]">Sin capturar datos personales</span>
              </div>
            </div>
          </div>

          <PublicValuationEstimator />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-px border-x border-[var(--n3-line)] bg-[var(--n3-line)] sm:grid-cols-3">
        <div className="bg-[var(--n3-black)] p-6 sm:p-8">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--n3-teal-soft)]">01 · Ubicación</span>
          <h2 className="mt-4 text-xl font-medium">Selecciona el sector</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--n3-text-muted)]">Sólo mostramos sectores donde existe cobertura suficiente para estimar de forma responsable.</p>
        </div>
        <div className="bg-[var(--n3-black)] p-6 sm:p-8">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--n3-teal-soft)]">02 · Características</span>
          <h2 className="mt-4 text-xl font-medium">Describe tu casa</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--n3-text-muted)]">Superficie construida, dormitorios y baños ayudan a seleccionar evidencia más comparable.</p>
        </div>
        <div className="bg-[var(--n3-black)] p-6 sm:p-8">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--n3-teal-soft)]">03 · Resultado</span>
          <h2 className="mt-4 text-xl font-medium">Recibe un rango, no una falsa precisión</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--n3-text-muted)]">La estimación pública orienta. La valorización profesional interna mantiene comparables, revisión y aprobación trazables.</p>
        </div>
      </section>

      <footer className="border-t border-[var(--n3-line)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-xs text-[var(--n3-text-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <span>Property Partners Vitacura · Estimación referencial de mercado</span>
          <span>Inteligencia y trazabilidad tecnológica por N3uralia</span>
        </div>
      </footer>
    </main>
  )
}
