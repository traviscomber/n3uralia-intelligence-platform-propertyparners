import Link from 'next/link'
import { ArrowRight, FileText, Users } from 'lucide-react'
import { ReportQuickGenerator } from '@/components/management/report-quick-generator'
import { reportAudiences, reportBranches, reportPartners } from '@/lib/report-audiences'
import { IntelligenceHeader, IntelligencePage } from '@/components/intelligence/design-system'

export default function AutonomousReportsPage() {
  return (
    <IntelligencePage>
      <IntelligenceHeader
        eyebrow="Pedro Pablo · Informes"
        title="Reportes"
        description="Tres reportes, según quién los necesita: PL Real Estate, oficina o Partner."
        actions={[{ label: 'Informes canónicos', href: '/dashboard/reportes/canonicos', primary: true }]}
      />

      <ReportQuickGenerator branches={reportBranches} partners={reportPartners} />

      <section className="mt-8">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">Acceso directo</p>
        <div className="grid gap-3 md:grid-cols-3">
          {reportAudiences.map((item) => (
            <Link key={item.id} href={item.href} className="group flex min-h-28 items-center justify-between gap-5 border border-[var(--n3-line)] bg-[#0c1111] p-5 transition hover:border-[#d7332b]">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[var(--n3-line)] bg-[#080d0d] text-[#ff766f]">
                  {item.id === 'ceo' ? <FileText size={18} /> : <Users size={18} />}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--n3-text-light)]">{item.label}</h2>
                  <p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">{item.purpose}</p>
                </div>
              </div>
              <ArrowRight size={18} className="shrink-0 text-[#ff766f] transition group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href="/dashboard/reportes/canonicos" className="border border-[var(--n3-line)] bg-[#0c1111] p-5 hover:border-[#d7332b]">
          <p className="text-sm font-semibold">Historial</p>
          <p className="mt-2 text-xs text-[var(--n3-text-muted)]">Ver el informe vigente y reportes anteriores.</p>
        </Link>
        <Link href="/dashboard/reportes/operacion" className="border border-[var(--n3-line)] bg-[#0c1111] p-5 hover:border-[#d7332b]">
          <p className="text-sm font-semibold">Entrega</p>
          <p className="mt-2 text-xs text-[var(--n3-text-muted)]">Gestionar PDFs y envíos autorizados.</p>
        </Link>
      </section>
    </IntelligencePage>
  )
}
