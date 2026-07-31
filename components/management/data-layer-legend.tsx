type DataLayerLegendProps = {
  showProvisionalRules?: boolean
}

export function DataLayerLegend({ showProvisionalRules = false }: DataLayerLegendProps) {
  return (
    <aside aria-label="Procedencia y vigencia de datos" className="mx-4 mb-5 grid gap-3 border border-[var(--n3-line)] bg-[#080d0d] p-4 text-xs lg:mx-8 lg:grid-cols-2">
      <div>
        <p className="font-semibold uppercase tracking-[0.14em] text-[#ff766f]">Datos canónicos · junio 2026</p>
        <p className="mt-2 leading-5 text-[var(--n3-text-muted)]">Resultados, metas, scores, evolución y comparaciones interanuales reproducidos desde las presentaciones canónicas. No se actualizan con cada operación diaria.</p>
      </div>
      <div>
        <p className="font-semibold uppercase tracking-[0.14em] text-[#65c780]">Operación viva · Supabase</p>
        <p className="mt-2 leading-5 text-[var(--n3-text-muted)]">Propiedades, asignaciones, valorizaciones, tareas, decisiones y mercado consultados al momento, limitados por el perfil autenticado y RLS.</p>
      </div>
      {showProvisionalRules ? (
        <div className="lg:col-span-2 border-t border-[var(--n3-line)] pt-3 text-[var(--n3-text-muted)]">
          Rankings, alertas y prioridades usan reglas provisionales del sistema hasta que Property Partners apruebe criterios y umbrales oficiales. No deben interpretarse como política corporativa definitiva.
        </div>
      ) : null}
    </aside>
  )
}
