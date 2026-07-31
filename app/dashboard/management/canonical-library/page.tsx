import Link from 'next/link'
import { requirePageCapability } from '@/lib/access-guards'
import { getCanonicalDeck, getCanonicalDecks, getCanonicalLibrarySummary } from '@/lib/canonical-presentation-library'

const number = new Intl.NumberFormat('es-CL')

export default async function CanonicalLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ deck?: string; page?: string }>
}) {
  await requirePageCapability('management.global.read')
  const params = await searchParams
  const decks = getCanonicalDecks()
  const selectedDeckIndex = Number(params.deck ?? '1')
  const selectedDeck = getCanonicalDeck(selectedDeckIndex) ?? decks[0] ?? null
  const selectedPage = Math.max(1, Number(params.page ?? '1') || 1)
  const slide = selectedDeck?.slides.find((item) => item.page === selectedPage) ?? selectedDeck?.slides[0] ?? null
  const summary = getCanonicalLibrarySummary()

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="rounded-2xl border bg-background p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Biblioteca canónica · Control de gestión</p>
        <h1 className="mt-2 text-3xl font-semibold">Presentaciones completas</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Fuente oficial estructurada para el sitio. Conserva textos, tablas, gráficos, colores, notas y referencias por página.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">Presentaciones</p><p className="mt-1 text-2xl font-semibold">{summary.deckCount}</p></article>
          <article className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">Páginas</p><p className="mt-1 text-2xl font-semibold">{summary.slideCount}</p></article>
          <article className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">Tablas</p><p className="mt-1 text-2xl font-semibold">{summary.tableCount}</p></article>
          <article className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">Gráficos</p><p className="mt-1 text-2xl font-semibold">{summary.chartCount}</p></article>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-3 rounded-2xl border bg-background p-4 lg:sticky lg:top-4 lg:self-start">
          <h2 className="font-semibold">Documentos</h2>
          {decks.map((deck) => (
            <Link
              key={deck.index}
              href={`/dashboard/management/canonical-library?deck=${deck.index}&page=1`}
              className={`block rounded-xl border p-3 text-sm ${selectedDeck?.index === deck.index ? 'bg-muted' : 'hover:bg-muted/50'}`}
            >
              <span className="block font-medium">{deck.file}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{deck.slideCount} páginas · {deck.tableCount ?? 0} tablas · {deck.chartCount ?? 0} gráficos</span>
            </Link>
          ))}
        </aside>

        <div className="min-w-0 space-y-5">
          {selectedDeck && (
            <section className="rounded-2xl border bg-background p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Documento {selectedDeck.index}</p>
                  <h2 className="mt-1 text-2xl font-semibold">{selectedDeck.file}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{number.format(selectedDeck.slideCount)} páginas</p>
                </div>
                <div className="flex flex-wrap gap-1" aria-label="Colores predominantes">
                  {selectedDeck.colors.slice(0, 8).map((color) => (
                    <span key={color.hex} title={`${color.hex} · ${color.uses} usos`} className="h-7 w-7 rounded-full border" style={{ backgroundColor: color.hex }} />
                  ))}
                </div>
              </div>
              <nav className="mt-5 flex max-h-36 flex-wrap gap-2 overflow-y-auto" aria-label="Páginas del documento">
                {selectedDeck.slides.map((item) => (
                  <Link
                    key={item.page}
                    href={`/dashboard/management/canonical-library?deck=${selectedDeck.index}&page=${item.page}`}
                    className={`rounded-md border px-2.5 py-1 text-xs ${slide?.page === item.page ? 'bg-foreground text-background' : 'hover:bg-muted'}`}
                    title={item.title}
                  >
                    {item.page}
                  </Link>
                ))}
              </nav>
            </section>
          )}

          {slide && (
            <article className="space-y-5 rounded-2xl border bg-background p-6">
              <header>
                <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Página {slide.page} · fuente canónica</p>
                <h2 className="mt-2 text-2xl font-semibold">{slide.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{slide.sourceReference}</p>
                {slide.backgroundColor && <p className="mt-2 text-xs">Fondo registrado: <code>{slide.backgroundColor}</code></p>}
              </header>

              <section>
                <h3 className="font-semibold">Contenido textual</h3>
                {slide.texts.length ? (
                  <div className="mt-3 space-y-2">
                    {slide.texts.map((text, index) => <p key={`${index}-${text.slice(0, 20)}`} className="rounded-lg bg-muted/40 p-3 text-sm leading-6">{text}</p>)}
                  </div>
                ) : <p className="mt-2 text-sm text-muted-foreground">La página no contiene texto extraído.</p>}
              </section>

              {slide.tables.map((table, tableIndex) => (
                <section key={`${table.name}-${tableIndex}`}>
                  <h3 className="font-semibold">{table.name}</h3>
                  <div className="mt-3 overflow-x-auto rounded-xl border">
                    <table className="w-full min-w-[720px] border-collapse text-sm">
                      <tbody>
                        {table.rows.map((row, rowIndex) => (
                          <tr key={rowIndex} className="border-b last:border-0">
                            {row.map((cell, cellIndex) => {
                              const Cell = rowIndex === 0 ? 'th' : 'td'
                              return <Cell key={cellIndex} className="border-r px-3 py-2 text-left last:border-r-0">{cell}</Cell>
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}

              {slide.charts.map((chart, chartIndex) => (
                <section key={`${chart.name}-${chartIndex}`} className="rounded-xl border p-4">
                  <h3 className="font-semibold">{chart.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Tipo: {chart.kinds.join(', ') || 'no especificado'}</p>
                  <div className="mt-3 space-y-3">
                    {chart.series.map((series, seriesIndex) => (
                      <div key={`${series.name}-${seriesIndex}`} className="rounded-lg bg-muted/40 p-3 text-sm">
                        <p className="font-medium">{series.name}</p>
                        <p className="mt-1 break-words text-xs text-muted-foreground">Categorías: {series.categories.join(' · ') || 'n/d'}</p>
                        <p className="mt-1 break-words text-xs text-muted-foreground">Valores: {series.values.join(' · ') || 'n/d'}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ))}

              {slide.notes.length > 0 && (
                <section>
                  <h3 className="font-semibold">Notas</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{slide.notes.filter(Boolean).join(' · ') || 'Sin notas descriptivas.'}</p>
                </section>
              )}
            </article>
          )}
        </div>
      </section>
    </main>
  )
}
