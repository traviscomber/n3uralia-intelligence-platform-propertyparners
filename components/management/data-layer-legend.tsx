type DataLayerLegendProps = {
  showProvisionalRules?: boolean
}

export function DataLayerLegend({ showProvisionalRules = false }: DataLayerLegendProps) {
  return (
    <aside aria-label="Procedencia y vigencia de datos" className="mx-4 mb-5 grid gap-3 border border-[var(--n3-line)] bg-[var(--n3-deep)] p-4 text-xs lg:mx-8 lg:grid-cols-2">
      <div>
        <p className="font-semibold uppercase tracking-[0.14em] text-[var(--n3-teal-soft)]">Datos de gestión</p>
        <p className="mt-2 leading-5 text-[var(--n3-text-muted)]">Resultados, metas, evolución y comparaciones corresponden al último período aprobado disponible.</p>
      </div>
      <div>
        <p className="font-semibold uppercase tracking-[0.14em] text-[var(--chart-3)]">Operación actual</p>
        <p className="mt-2 leading-5 text-[var(--n3-text-muted)]">Propiedades, asignaciones, valorizaciones, tareas, decisiones y mercado se consultan al momento y respetan el acceso de cada usuario.</p>
      </div>
      {showProvisionalRules ? (
        <div className="border-t border-[var(--n3-line)] pt-3 text-[var(--n3-text-muted)] lg:col-span-2">
          <p className="font-medium text-[var(--chart-4)]">Reglas de análisis</p>
          <p className="mt-1 leading-5">Rankings, alertas y prioridades permanecen como apoyo operativo hasta que Property Partners apruebe criterios y umbrales definitivos.</p>
        </div>
      ) : null}
    </aside>
  )
}
