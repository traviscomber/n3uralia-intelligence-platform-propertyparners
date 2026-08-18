import Link from 'next/link'
import { ArrowRight, FileText, Users } from 'lucide-react'
import { reportAudiences } from '@/lib/report-audiences'
import { IntelligenceHeader, IntelligencePage } from '@/components/intelligence/design-system'

export default function AutonomousReportsPage() {
  return (
    <IntelligencePage>
      <IntelligenceHeader
        eyebrow="Informes"
        title="Reportes"
        description="Elige quién necesita leer el informe. Los datos y comparaciones son los mismos; cambia sólo el nivel de detalle."
        actions={[{ label: 'Informes canónicos', href: '/dashboard/reportes/canonicos', primary: true }]}
      />

      <section className="grid gap-3 md:grid-cols-2">
        {reportAudiences.map((item) => (
          <Link key={item.id} href={item.href} className="group flex min-h-32 items-center justify-between gap-5 border border-[var(--n3-line)] bg-[#0c1111] p-5 transition hover:border-[#d7332b]">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[var(--n3-line)] bg-[#080d0d] text-[#ff766f]">
                {item.id === 'directorio' || item.id === 'ceo' ? <FileText size={18} /> : <Users size={18} />}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--n3-text-light)]">{item.label}</h2>
                <p className="mt-1 text-xs text-[var(--n3-text-muted)]">{item.units} {item.units === 1 ? 'vista' : 'vistas'}</p>
              </div>
            </div>
            <ArrowRight size={18} className="shrink-0 text-[#ff766f] transition group-hover:translate-x-1" />
          </Link>
        ))}
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <Link href="/dashboard/reportes/canonicos" className="border border-[var(--n3-line)] bg-[#0c1111] p-5 hover:border-[#d7332b]">
          <p className="text-sm font-semibold">Informes canónicos</p>
          <p className="mt-2 text-xs text-[var(--n3-text-muted)]">Ver el informe vigente y el historial.</p>
        </Link>
        <Link href="/dashboard/reportes/operacion" className="border border-[var(--n3-line)] bg-[#0c1111] p-5 hover:border-[#d7332b]">
          <p className="text-sm font-semibold">Generar y enviar</p>
          <p className="mt-2 text-xs text-[var(--n3-text-muted)]">Crear PDF y gestionar entrega.</p>
        </Link>
        <Link href="/dashboard/reportes/directorio" className="border border-[var(--n3-line)] bg-[#0c1111] p-5 hover:border-[#d7332b]">
          <p className="text-sm font-semibold">Resumen ejecutivo</p>
          <p className="mt-2 text-xs text-[var(--n3-text-muted)]">Lectura rápida para decisión.</p>
        </Link>
      </section>
    </IntelligencePage>
  )
}
