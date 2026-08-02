/**
 * Pending Definitions - Data extracted from CRM Intelligence Excel files
 * These are the 3 key operational definitions that need to be formalized
 */

export interface PendingDefinition {
  number: number
  title: string
  description: string
  dataSource: string
  status: 'open' | 'in-progress' | 'resolved'
}

export const pendingDefinitions: PendingDefinition[] = [
  {
    number: 1,
    title: 'Definición de criterios de priorización de leads por origen',
    description: `
Basado en datos de lead_created (6,256 registros):
- Origen Principal: Propiedades en cartera (property_capture: 430 registros)
- Clasificación: lead_classified (4,131 registros) vs lead_unclassified (6,655)
- Ciclo de Vida: 
  • 15-90 días: lead_stale_15_90 (3,488 registros)
  • >90 días: lead_stale_over_90 (8,572 registros)
  • Activos: lead_active (14,034 registros)

Criterios de Priorización (propuesta):
1. Lead Clasificado (Tier 1): Clasificación confirmada en CRM
2. Lead Activo <30 días (Tier 2): Actividad reciente
3. Lead 15-90 días (Tier 3): Seguimiento requerido
4. Lead >90 días (Tier 4): Reactivación necesaria

Validación: lead_classified vs lead_unclassified ratio
    `,
    dataSource: 'lead_created, lead_classified, lead_active, lead_stale_*',
    status: 'open',
  },
  {
    number: 2,
    title: 'Estandarización de tiempos de contacto según zona',
    description: `
Basado en datos de visit_appointment (5,968 registros):
- Zona: Vitacura (única zona en scope actual)
- Visitas Realizadas: completed_visits data available
- Visitas Programadas: scheduled_visits data available

Benchmarks Propuestos (por tipo de propiedad):
Casa:
  - Primera toma de contacto: 48 horas
  - Seguimiento post-visita: 24 horas
  - Re-contacto sin respuesta: 7 días

Departamento:
  - Primera toma de contacto: 24 horas
  - Seguimiento post-visita: 12 horas
  - Re-contacto sin respuesta: 5 días

Validación: visit_appointment timestamps vs lead_created timestamps
    `,
    dataSource: 'visit_appointment, lead_created, property_capture',
    status: 'open',
  },
  {
    number: 3,
    title: 'Benchmarks de conversión por tipo de propiedad',
    description: `
Basado en datos de sale_closed (197 registros) vs visit_appointment (5,968):
- Conversión Total: 197 cierres / 5,968 visitas = 3.3%
- Período: Enero-Junio 2026

Benchmarks por Tipo (propuesta, basado en 6 meses):

Casa:
  - Lead a Visita: 15-20%
  - Visita a Cierre (6 meses): 3.5-4.5%
  - Conversión Total Lead-Cierre: 0.5-0.9%

Departamento:
  - Lead a Visita: 20-25%
  - Visita a Cierre (6 meses): 2.5-3.5%
  - Conversión Total Lead-Cierre: 0.5-0.9%

Métricas Críticas:
  - Abandoned después de 90 días (lead_stale_over_90): 8,572 / 14,034 leads activos = 61%
  - Esto sugiere oportunidad de reactivación de cartera histórica

Validación: sale_closed vs visit_appointment matching
    `,
    dataSource: 'sale_closed, visit_appointment, lead_created, property_capture',
    status: 'open',
  },
]

/**
 * Generate pending definitions HTML section
 */
export function generatePendingDefinitionsHTML(): string {
  return `
    <div class="section">
      <h2 class="section-title">Definiciones Pendientes</h2>
      <p style="font-size: 13px; color: #7F8C8D; margin-bottom: 24px;">
        Estos puntos permanecen explícitamente abiertos y no se convierten en reglas operativas hasta su validación.
      </p>
      
      <div class="pending-grid">
        ${pendingDefinitions
          .map(
            (def) => `
        <div class="pending-item" style="background-color: #FFFFFF; border: 1px solid #E0E0E0; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
          <div style="display: flex; align-items: flex-start; gap: 12px;">
            <span class="pending-number" style="background-color: #F0F0F0; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #333333; flex-shrink: 0;">${def.number}</span>
            <div style="flex: 1;">
              <div style="font-weight: bold; color: #333333; margin-bottom: 8px;">${def.title}</div>
              <pre style="font-size: 12px; color: #7F8C8D; white-space: pre-wrap; word-wrap: break-word; margin: 0; font-family: monospace;">${def.description}</pre>
              <div style="font-size: 11px; color: #999999; margin-top: 8px;">
                <strong>Fuente:</strong> ${def.dataSource}
              </div>
            </div>
          </div>
        </div>
        `
          )
          .join('')}
      </div>
    </div>
  `
}
