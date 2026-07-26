import { buildExecutiveForecast } from '@/lib/forecast-engine'

export default function BoardPresentationPage() {
  const forecast = buildExecutiveForecast({
    portfolioHealth: 82,
    salesVelocity: 76,
    inventoryPressure: 34,
  })

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-[#ff766f]">
          N3uralia Executive Board Mode
        </p>
        <h1 className="mt-3 text-4xl font-semibold">
          Strategic Portfolio Review
        </h1>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {forecast.map((item) => (
          <article key={item.window} className="border p-5">
            <p className="text-sm font-semibold">{item.window}</p>
            <p className="mt-2 text-3xl">{item.confidence}%</p>
            <p className="mt-4 text-sm">Confidence</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <article>
          <h2 className="font-semibold">Opportunities</h2>
          <p className="mt-2 text-sm">Strategic growth signals and priority actions.</p>
        </article>
        <article>
          <h2 className="font-semibold">Risks</h2>
          <p className="mt-2 text-sm">Portfolio risks requiring executive attention.</p>
        </article>
        <article>
          <h2 className="font-semibold">Decisions Required</h2>
          <p className="mt-2 text-sm">Actions prepared for board review.</p>
        </article>
      </section>
    </main>
  )
}
