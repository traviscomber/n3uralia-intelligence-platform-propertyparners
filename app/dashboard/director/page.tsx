import Link from 'next/link'
import { DirectorDashboardV3 } from '@/components/management/director-dashboard-v3'

export default function DirectorDashboard() {
  return <>
    <nav aria-label="Accesos rápidos de dirección" className="print-hidden mb-4 flex flex-wrap gap-2 px-4 pt-4 lg:px-8">
      <Link href="/dashboard/director/tareas" className="border border-[var(--n3-line)] px-4 py-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Gestionar tareas</Link>
      <Link href="/dashboard/director/reporte" className="border border-[var(--n3-line)] px-4 py-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Reporte de oficina</Link>
    </nav>
    <DirectorDashboardV3 />
  </>
}
