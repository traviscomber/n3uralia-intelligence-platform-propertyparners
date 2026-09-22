import Link from 'next/link'
import { PPLogo } from '@/components/brand/pp-logo'

// Auditoría 2026-09-21 (Semana 2): reemplaza la 404 genérica de Next.js
// (en inglés y sin marca) por una página con identidad Property Partners.
// Es server component: cero JavaScript de cliente.
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--n3-black)] px-4 py-10">
      <div className="w-full max-w-sm text-center">
        <header>
          <PPLogo className="mx-auto w-56" priority />
          <p className="mt-4 text-sm text-[var(--n3-text-muted)]">Inteligencia de mercado Vitacura</p>
        </header>

        <section className="mt-8 border border-[var(--n3-line)] bg-[var(--n3-deep)] p-6" aria-labelledby="not-found-title">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--n3-teal)]">Error 404</p>
          <h1 id="not-found-title" className="mt-2 text-2xl font-semibold text-[var(--n3-text-light)]">Página no encontrada</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--n3-text-muted)]">
            La ruta que buscas no existe o no está disponible para tu perfil.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              Volver al inicio
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex min-h-11 items-center justify-center border border-[var(--n3-line)] px-4 text-sm font-semibold text-[var(--n3-text-muted)] transition-colors hover:border-[var(--n3-text-muted)] hover:text-[var(--n3-text-light)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              Iniciar sesión
            </Link>
          </div>
        </section>

        <div className="mt-5 border-t border-[var(--n3-line)] pt-3 text-center text-[11px] text-[var(--n3-text-muted)]">
          Powered by{' '}
          <a href="https://n3uralia.com" target="_blank" rel="noreferrer" className="font-medium text-[var(--n3-teal-soft)] hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]">
            N3uralia
          </a>
        </div>
      </div>
    </main>
  )
}
