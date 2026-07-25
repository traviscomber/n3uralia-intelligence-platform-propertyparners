type FeedItem = {
  title: string
  summary: string
  confidence: number
}

export function CEOIntelligenceFeed({
  priorities,
  risks,
  opportunities,
  decisions,
}: {
  priorities: FeedItem[]
  risks: FeedItem[]
  opportunities: FeedItem[]
  decisions: FeedItem[]
}) {
  const sections = [
    { title: 'Lo más importante hoy', items: priorities },
    { title: 'Riesgos', items: risks },
    { title: 'Oportunidades', items: opportunities },
    { title: 'Decisiones pendientes', items: decisions },
  ]

  return (
    <section>
      <header>
        <h1>Centro de Inteligencia CEO</h1>
        <p>Contexto ejecutivo basado en evidencia empresarial.</p>
      </header>

      {sections.map((section) => (
        <article key={section.title}>
          <h2>{section.title}</h2>
          {section.items.map((item) => (
            <div key={item.title}>
              <strong>{item.title}</strong>
              <p>{item.summary}</p>
              <small>Confianza: {item.confidence}%</small>
            </div>
          ))}
        </article>
      ))}
    </section>
  )
}
