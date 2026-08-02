import { generateCeoReportAprilLayoutV2 } from '@/lib/ceo-report-april-layout-v2'

/**
 * January uses the canonical monthly data already loaded by the shared report
 * generator, but removes month-over-month language because there is no prior
 * 2026 period to compare against.
 */
export async function generateCeoReportJanuaryLayout() {
  const html = await generateCeoReportAprilLayoutV2('Enero', '2026-01')

  return html
    .replace('Meta 8,1 · Variación vs mes anterior +4', 'Meta 8,1 · Primer cierre mensual del año')
    .replace('Lectura inmediata del mes y del avance acumulado al corte.', 'Lectura del primer cierre mensual y línea base comercial de 2026.')
    .replace('Comparación visual mensual siguiendo la lógica de las presentaciones canónicas.', 'Resultado de enero frente a la meta mensual, siguiendo la presentación canónica.')
    .replace('Tendencia del cumplimiento mensual con referencia explícita de 100%.', 'Línea base de cumplimiento para iniciar la evolución comercial de 2026.')
}
