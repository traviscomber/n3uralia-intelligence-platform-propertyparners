import Link from 'next/link'
import { requirePageCapability } from '@/lib/access-guards'
import { getCanonicalDeck, getCanonicalDecks } from '@/lib/canonical-presentation-library'

export default async function CanonicalLibraryPage({ searchParams }: { searchParams: Promise<{ deck?: string; page?: string }> }) {
  await requirePageCapability('management.global.read')
  const params = await searchParams
  const decks = getCanonicalDecks()
  const selectedDeck = getCanonicalDeck(Number(params.deck ?? '1')) ?? decks[0] ?? null
  const selectedPage = Math.max(1, Number(params.page ?? '1') || 1)
  const slide = selectedDeck?.slides.find((item) => item.page === selectedPage) ?? selectedDeck?.slides[0] ?? null

  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b pb-5">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Datos de gestión</p>
        <h1 className="mt-2 text-3xl font-semibold">Fuentes canónicas</h1>
        <p className="mt-2 text-sm text-muted-foreground">Presentaciones originales y datos verificados.</p>
      </header>

      <section className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-2">
          {decks.map((deck) => (
            <Link key={deck.index} href={`/dashboard/management/canonical-library?deck=${deck.index}&page=1`} className={`block border p-3 text-sm ${selectedDeck?.index === deck.index ? 'bg-muted' : 'hover:bg-muted/50'}`}>
              <span className="block font-medium">{deck.file}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{deck.slideCount} páginas</span>
            </Link>
          ))}
        </aside>

        <div className="min-w-0 space-y-4">
          {selectedDeck && <nav className="flex flex-wrap gap-2" aria-label="Páginas">{selectedDeck.slides.map((item) => <Link key={item.page} href={`/dashboard/management/canonical-library?deck=${selectedDeck.index}&page=${item.page}`} className={`border px-2.5 py-1 text-xs ${slide?.page === item.page ? 'bg-foreground text-background' : 'hover:bg-muted'}`}>{item.page}</Link>)}</nav>}

          {slide && <article className="space-y-5 border p-5">
            <header><p className="text-xs text-muted-foreground">Página {slide.page}</p><h2 className="mt-1 text-2xl font-semibold">{slide.title}</h2></header>

            {slide.interpretation && <section className="border-l-2 border-green-700 pl-4"><h3 className="font-semibold">Lectura de gestión</h3><p className="mt-2 text-sm leading-6">{slide.interpretation.managementConclusion}</p></section>}

            {slide.tables.map((table, tableIndex) => <section key={`${table.name}-${tableIndex}`}><h3 className="mb-2 font-semibold">{table.name}</h3><div className="overflow-x-auto border"><table className="w-full min-w-[680px] text-sm"><tbody>{table.rows.map((row, rowIndex) => <tr key={rowIndex} className="border-b last:border-0">{row.map((cell, cellIndex) => { const Cell = rowIndex === 0 ? 'th' : 'td'; return <Cell key={cellIndex} className="border-r px-3 py-2 text-left last:border-r-0">{cell}</Cell> })}</tr>)}</tbody></table></div></section>)}

            {!slide.tables.length && slide.texts.length > 0 && <div className="space-y-2">{slide.texts.map((text, index) => <p key={`${index}-${text.slice(0, 20)}`} className="text-sm leading-6">{text}</p>)}</div>}
          </article>}
        </div>
      </section>
    </main>
  )
}
