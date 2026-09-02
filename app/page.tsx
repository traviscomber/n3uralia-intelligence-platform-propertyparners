import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BarChart3, CheckCircle2, ShieldCheck } from 'lucide-react'
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
              Property Partners Intelligence · Sólo Vitacura
            </p>
            <h1 className="max-w-[12ch] text-[clamp(2.65rem,11vw,4.5rem)] font-semibold leading-[0.98] tracking-[-0.045em]">
              Conoce un rango referencial para tu casa.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[var(--n3-text-muted)] sm:mt-7 sm:text-lg">
              Estimación rápida con oferta activa de casas y barrios KML de Vitacura. Sin registro, sin dirección y sin entregar datos personales.
            </p>

            <div className="mt-8 grid max-w-xl grid-cols-1 gap-4 min-[430px]:grid-cols-3 sm:mt-9">
              <div className="border-l border-[var(--n3-teal)] pl-4">
                <BarChart3 className="mb-2.5 size-5 text-[var(--n3-teal-soft)]" aria-hidden="true" />
                <span className="text-sm leading-5 text-[var(--n3-text-muted)]">Oferta activa de Vitacura</span>
              </div>
              <div className="border-l border-[var(--n3-teal)] pl-4">
                <CheckCircle2 className="mb-2.5 size-5 text-[var(--n3-teal-soft)]" aria-hidden="true" />
                <span className="text-sm leading-5 text-[var(--n3-text-muted)]">Piso mínimo de evidencia</span>
              </div>
              <div className="border-l border-[var(--n3-teal)] pl-4">
                <ShieldCheck className="mb-2.5 size-5 text-[var(--n3-teal-soft)]" aria-hidden="true" />
                <span className="text-sm leading-5 text-[var(--n3-text-muted)]">Sin capturar datos personales</span>
              </div>
            </div>
          </div>

          <PublicValuationEstimator />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-px border-x border-[var(--n3-line)] bg-[var(--n3-line)] sm:grid-cols-3">
        <div className="bg-[var(--n3-black)] p-5 sm:p-7 lg:p-8">
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--n3-teal-soft)]">01 · Ubicación</span>
          <h2 className="mt-4 text-xl font-medium">Selecciona tu sector</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--n3-text-muted)]">Si el sector alcanza 5 observaciones utilizables, el rango es sectorial. Si no, usamos una referencia general de Vitacura y lo indicamos explícitamente.</p>
        </div>
        <div className="bg-[var(--n3-black)] p-5 sm:p-7 lg:p-8">
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--n3-teal-soft)]">02 · Características</span>
          <h2 className="mt-4 text-xl font-medium">Describe tu casa</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--n3-text-muted)]">La superficie construida es obligatoria. Dormitorios y baños sólo refinan la muestra cuando existe evidencia suficiente.</p>
        </div>
        <div className="bg-[var(--n3-black)] p-5 sm:p-7 lg:p-8">
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--n3-teal-soft)]">03 · Resultado</span>
          <h2 className="mt-4 text-xl font-medium">Recibe un rango, no falsa precisión</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--n3-text-muted)]">El cotizador orienta. La valorización profesional mantiene comparables, revisión, aprobación y trazabilidad separadas.</p>
        </div>
      </section>

      <footer className="border-t border-[var(--n3-line)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-7 text-xs leading-5 text-[var(--n3-text-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <span>Property Partners Vitacura · Estimación referencial de mercado</span>
          <span>Inteligencia y trazabilidad tecnológica por N3uralia</span>
        </div>
      </footer>
    </main>
  )
}
