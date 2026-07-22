import Link from 'next/link'
import { getMlLabSnapshot, type MlLabStatus } from '@/lib/ml-lab'

function number(value: number, maximumFractionDigits = 0) {
  return value.toLocaleString('es-CL', { maximumFractionDigits })
}

function statusLabel(status: MlLabStatus) {
  return status === 'ready' ? 'Disponible' : status === 'partial' ? 'Parcial' : 'Bloqueado'
}

function statusStyle(status: MlLabStatus) {
  return status === 'ready'
    ? 'border-[var(--n3-line)] bg-[var(--n3-deep)] text-[var(--success)]'
    : status === 'partial'
      ? 'border-[var(--n3-line)] bg-[var(--n3-black)] text-[var(--warning)]'
      : 'border-[var(--n3-line)] bg-[#160d0c] text-[var(--destructive)]'
}

export default function MlLabPage() {
  const lab = getMlLabSnapshot()
  const sourceCase = lab.historicalCase
  const fivePercentScenario = sourceCase.sourceCalculation.scenarios.find((scenario) => scenario.margin === 0.05)
  const laterSale = sourceCase.laterRegisteredEvent

  return (
    <div className="mx-auto max-w-[1600px] space-y-7 pb-16 text-[var(--n3-text-light)]">
      <header className="overflow-hidden border border-white/10 bg-black text-white">
        <div className="grid gap-8 p-7 lg:grid-cols-[minmax(0,1fr)_390px] lg:p-10">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--n3-teal)]">ML Lab · uso interno</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight lg:text-4xl">Estado de preparación del modelo</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--n3-text-muted)]">Control de datasets, requisitos y validaciones para modelos de valorización. La data auditada es inmutable y las reglas Excel son el baseline.</p>
          </div>
          <div className="grid grid-cols-2 gap-px self-end bg-[var(--n3-deep)]/15">
            {[
              ['Entrenamiento precio', lab.canTrainPriceModel ? 'Habilitado' : 'Bloqueado'],
              ['Modelos entrenados', lab.modelVersions],
              ['Modelos aprobados', lab.approvedVersions],
              ['Uso comercial', 'Desactivado'],
            ].map(([label, value]) => <div key={label} className="bg-[var(--n3-text-light)] p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-[var(--n3-text-muted)]">{label}</p><p className="mt-2 text-xl font-semibold">{typeof value === 'number' ? number(value) : value}</p></div>)}
          </div>
        </div>
        <div className="h-1 bg-[#d7332b]" />
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ['Publicaciones únicas', lab.validOffers, 'IDs Portal; no propiedades canónicas'],
          ['Eventos registrales', lab.cbrsEvents, `${number(lab.cbrsRows)} activos CBRS`],
          ['Activos residenciales', lab.residentialCbrsRows, 'Departamento o casa-habitación'],
          ['Gates disponibles', lab.readyChecks, `${lab.blockingChecks} gates bloquean entrenamiento`],
          ['Pares confirmados', 0, 'Portal ↔ CBRS'],
        ].map(([label, value, detail]) => <article key={label} className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--n3-text-muted)]">{label}</p><p className="mt-2 text-3xl font-semibold text-[var(--n3-text-light)]">{number(Number(value))}</p><p className="mt-2 text-[11px] text-[var(--n3-text-muted)]">{detail}</p></article>)}
      </section>

      <section className="border border-[var(--n3-line)] bg-[var(--n3-deep)]">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--n3-line)] p-5">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#d7332b]">Preparación real</p><h2 className="mt-2 text-xl font-semibold">Condiciones antes de entrenar</h2></div>
          <p className="text-xs text-[var(--n3-text-muted)]">Estados calculados desde la inteligencia auditada</p>
        </div>
        <div className="grid gap-px bg-[var(--n3-line)] md:grid-cols-2 xl:grid-cols-3">
          {lab.checks.map((check) => <article key={check.label} className="bg-[var(--n3-deep)] p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--n3-text-muted)]">{check.label}</p><p className="mt-2 text-xl font-semibold">{check.value}</p></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${statusStyle(check.status)}`}>{statusLabel(check.status)}</span></div><p className="mt-4 text-xs font-semibold text-[var(--n3-deep)]">Requisito: {check.requirement}</p><p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">{check.evidence}</p></article>)}
        </div>
      </section>

      <section className="border border-[var(--n3-line)] bg-[var(--n3-deep)]">
        <div className="border-b border-[var(--n3-line)] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#d7332b]">Separación obligatoria</p><h2 className="mt-2 text-xl font-semibold">Preparación por tipo de propiedad</h2></div>
        <div className="grid gap-px bg-[var(--n3-line)] md:grid-cols-2">
          <article className="bg-[var(--n3-deep)] p-5"><div className="flex items-center justify-between"><h3 className="font-semibold">Departamentos</h3><span className={`${statusStyle('partial')} rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase`}>Parcial</span></div><p className="mt-4 text-3xl font-semibold">{number(lab.apartmentRows)}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">filas Portal auditadas</p><p className="mt-4 text-xs leading-5 text-[var(--n3-text-muted)]">{number(lab.apartmentGeoAssigned)} tienen asignación geográfica única. Los {number(lab.projectRows)} registros de proyectos permanecen identificados como universo separado.</p></article>
          <article className="bg-[var(--n3-deep)] p-5"><div className="flex items-center justify-between"><h3 className="font-semibold">Casas</h3><span className={`${statusStyle('blocked')} rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase`}>Bloqueado</span></div><p className="mt-4 text-3xl font-semibold">{number(lab.houseRows)}</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">filas Portal auditadas</p><p className="mt-4 text-xs leading-5 text-[var(--n3-text-muted)]">{number(lab.houseGeoAssigned)} tienen asignación geográfica por coordenadas. La fuente no habilita todavía las áreas construida y de terreno separadas exigidas por el baseline.</p></article>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <article className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5 lg:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#d7332b]">Contrato de entrenamiento v0</p>
          <h2 className="mt-2 text-xl font-semibold">Lo que el futuro pipeline debe respetar</h2>
          <div className="mt-5 grid gap-px bg-[var(--n3-line)] sm:grid-cols-2">
            {[
              ['Separación', 'Un modelo para casas y otro para departamentos.'],
              ['Dataset', 'Derivado, versionado y enlazado a hashes de fuentes.'],
              ['Validación', 'Split temporal; nunca mezclar futuro dentro del entrenamiento.'],
              ['Baseline', 'Comparación obligatoria contra reglas Property Partners.'],
              ['Privacidad', 'Sin nombres, RUT, compradores ni vendedores.'],
              ['Activación', 'Aprobación responsable previa a cualquier uso asistido.'],
            ].map(([title, detail]) => <div key={title} className="bg-[var(--n3-deep)] p-4"><p className="text-xs font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-[var(--n3-text-muted)]">{detail}</p></div>)}
          </div>
        </article>

        <article className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5 lg:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--n3-text-muted)]">Métricas requeridas</p>
          <h2 className="mt-2 text-xl font-semibold">Criterios de evaluación</h2>
          <div className="mt-5 space-y-3">
            {[
              ['MAE en UF', 'Error absoluto promedio fuera de muestra.'],
              ['Mediana del error %', 'Robusta frente a operaciones extremas.'],
              ['Sesgo', 'Detecta sobrevaloración o subvaloración sistemática.'],
              ['Error por barrio', 'Solo donde la cobertura geográfica sea suficiente.'],
              ['Error por tipo', 'Casas y departamentos evaluados por separado.'],
            ].map(([metric, detail]) => <div key={metric} className="flex items-start justify-between gap-4 border-b border-[var(--n3-line)] pb-3"><p className="text-sm font-semibold">{metric}</p><p className="max-w-[260px] text-right text-xs leading-5 text-[var(--n3-text-muted)]">{detail}</p></div>)}
          </div>
          <p className="mt-4 border-l-2 border-[#d7332b] pl-3 text-xs leading-5 text-[var(--n3-text-muted)]">Estas métricas no tienen valores todavía porque no existe un modelo entrenado ni un test set versionado.</p>
        </article>
      </section>

      <section className="border border-[var(--n3-line)] bg-[var(--n3-deep)]">
        <div className="border-b border-[var(--n3-line)] bg-black p-5 text-white"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--n3-teal)]">Baseline histórico disponible</p><h2 className="mt-2 text-xl font-semibold">Un caso trazable; no un benchmark estadístico</h2></div>
        <div className="grid gap-px bg-[var(--n3-line)] lg:grid-cols-4">
          {[
            ['Propiedad', `${sourceCase.subject.propertyType} · ${sourceCase.subject.neighborhood}`],
            ['Valor comercial', `${number(sourceCase.sourceCalculation.commercialValueUf)} UF`],
            ['Escenario 5%', fivePercentScenario ? `${number(fivePercentScenario.publicationUf)} UF` : 'n/d'],
            ['Evento CBRS posterior', laterSale ? `${number(laterSale.priceUf)} UF` : 'n/d'],
          ].map(([label, value]) => <div key={label} className="bg-[var(--n3-deep)] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{label}</p><p className="mt-2 text-lg font-semibold">{value}</p></div>)}
        </div>
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          <div><p className="text-sm font-semibold">Evidencia disponible</p><p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">{sourceCase.offerComparables.rawCount} comparables de oferta en la plantilla, {sourceCase.offerComparables.canonicalCount} después del duplicado explícito y {sourceCase.registeredComparables.exactInCurrentCbrs} de {sourceCase.registeredComparables.sourceCount} comparables CBRS reproducibles exactamente.</p></div>
          <div className="border-l-2 border-[#d7332b] pl-4"><p className="text-sm font-semibold">Límite temporal</p><p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">La plantilla fue modificada en 2020 y el evento registrado ocurrió en 2024. La cercanía entre valores no prueba capacidad predictiva.</p></div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          ['01', 'Canonizar propiedades y eventos', 'Derivar snapshots Portal y eventos residenciales CBRS sin modificar las fuentes.', 'Pendiente'],
          ['02', 'Construir pares y versionar', 'Relacionar oferta y cierre con reglas auditables; registrar hashes, período, exclusiones y cobertura.', 'Bloqueado'],
          ['03', 'Entrenar challenger temporal', 'Separar casas y departamentos y compararlos fuera de muestra con el baseline Excel.', 'Pendiente'],
        ].map(([step, title, detail, state]) => <article key={step} className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5"><div className="flex items-center justify-between"><span className="text-xs font-bold text-[#d7332b]">{step}</span><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--n3-text-muted)]">{state}</span></div><h3 className="mt-4 text-lg font-semibold">{title}</h3><p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">{detail}</p></article>)}
      </section>

      <section className="border border-[var(--n3-line)] bg-[var(--n3-deep)] p-5 lg:p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#d7332b]">Guardrails del modelo</p>
        <h2 className="mt-2 text-xl font-semibold">Variables que no se inventarán</h2>
        <p className="mt-2 text-xs leading-5 text-[var(--n3-text-muted)]">La metodología fuente prohíbe ajustes automáticos que no estén respaldados por sus Excel.</p>
        <div className="mt-4 flex flex-wrap gap-2">{lab.prohibitedAdjustments.map((item) => <span key={item} className="border border-[var(--n3-line)] bg-[var(--n3-deep)] px-3 py-2 text-xs">{item}</span>)}</div>
      </section>

      <section className="border border-[var(--n3-line)] bg-black p-5 text-white lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--n3-teal)]">Contrato verificable · v{lab.experimentContract.version}</p><h2 className="mt-2 text-xl font-semibold">Linaje y activación del experimento</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-[var(--n3-text-muted)]">Este contrato es leído por la aplicación y por la verificación automática; un cambio de metodología debe modificar ambos de forma explícita.</p></div>
          <span className="border border-[#d7332b] bg-[#160d0c] px-3 py-2 text-xs font-semibold text-[#ff766f]">Aprobación responsable requerida</span>
        </div>
        <div className="mt-5 grid gap-px bg-[var(--n3-deep)]/15 sm:grid-cols-2 lg:grid-cols-4">{[
          ['Objetivo', 'Precio de cierre registrado en UF'],
          ['Segmentos', 'Departamento · Casa'],
          ['Validación', 'Separación temporal'],
          ['Fuentes con hash', `${lab.experimentContract.sourceHashes.length}`],
        ].map(([label, value]) => <div key={label} className="bg-[var(--n3-deep)] p-4"><p className="text-[10px] uppercase tracking-[0.14em] text-[var(--n3-text-muted)]">{label}</p><p className="mt-2 text-sm font-semibold">{value}</p></div>)}</div>
      </section>

      <footer className="border border-[var(--n3-line)] bg-black p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-semibold">Restricción de uso</p><p className="mt-1 text-xs text-[var(--n3-text-muted)]">Un modelo experimental no modifica la data, las reglas de valorización ni una estimación comercial aprobada.</p></div><div className="flex gap-2"><Link href="/dashboard/inteligencia" className="border border-white/20 px-3 py-2 text-xs font-semibold hover:bg-[var(--n3-deep)]/10">Observatorio</Link><Link href="/dashboard/valorizador" className="border border-white/20 px-3 py-2 text-xs font-semibold hover:bg-[var(--n3-deep)]/10">Baseline</Link><Link href="/dashboard/market/fuentes" className="border border-white/20 px-3 py-2 text-xs font-semibold hover:bg-[var(--n3-deep)]/10">Fuentes</Link></div></div>
      </footer>
    </div>
  )
}
