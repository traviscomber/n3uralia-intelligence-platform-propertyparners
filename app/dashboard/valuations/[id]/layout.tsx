import Link from 'next/link'

export default async function ValuationCaseLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params
  return <>
    <nav aria-label="Acciones del expediente" className="mb-5 flex flex-wrap gap-2 print:hidden">
      <Link href={`/dashboard/valuations/${id}`} className="inline-flex min-h-11 items-center border border-[var(--n3-line)] px-4 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--n3-teal)]">Expediente</Link>
      <Link href={`/dashboard/valuations/${id}/report`} className="inline-flex min-h-11 items-center border border-[var(--n3-teal)] px-4 py-2 text-sm font-medium text-[var(--n3-teal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--n3-teal)]">Reporte imprimible</Link>
    </nav>
    {children}
  </>
}
