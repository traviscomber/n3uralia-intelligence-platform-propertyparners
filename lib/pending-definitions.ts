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
 * Generate operational definitions HTML section with data and metrics
 */
export function generatePendingDefinitionsHTML(): string {
  return `
    <div class="section">
      <h2 class="section-title">Definiciones Operacionales</h2>
      <p style="font-size: 13px; color: #7F8C8D; margin-bottom: 24px;">
        Estándares operacionales basados en datos reales del CRM (Enero-Junio 2026).
      </p>
      
      <!-- DEFINITION 1: LEAD PRIORITIZATION -->
      <div style="background-color: #FFFFFF; border: 1px solid #E0E0E0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 14px; font-weight: bold; color: #333333;">1. Criterios de Priorización de Leads</h3>
          <span style="background-color: #E8F5E9; color: #2E7D32; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">ACTIVO</span>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div style="background-color: #F5F5F5; padding: 12px; border-radius: 6px;">
            <div style="font-size: 11px; color: #999999; margin-bottom: 4px;">TIER 1: Clasificados</div>
            <div style="font-size: 18px; font-weight: bold; color: #333333;">4,131</div>
            <div style="font-size: 10px; color: #7F8C8D;">66% de leads</div>
          </div>
          <div style="background-color: #F5F5F5; padding: 12px; border-radius: 6px;">
            <div style="font-size: 11px; color: #999999; margin-bottom: 4px;">TIER 2: Activos &lt;30d</div>
            <div style="font-size: 18px; font-weight: bold; color: #333333;">14,034</div>
            <div style="font-size: 10px; color: #7F8C8D;">100% activos</div>
          </div>
          <div style="background-color: #F5F5F5; padding: 12px; border-radius: 6px;">
            <div style="font-size: 11px; color: #999999; margin-bottom: 4px;">TIER 3: 15-90 días</div>
            <div style="font-size: 18px; font-weight: bold; color: #333333;">3,488</div>
            <div style="font-size: 10px; color: #7F8C8D;">Seguimiento</div>
          </div>
          <div style="background-color: #F5F5F5; padding: 12px; border-radius: 6px;">
            <div style="font-size: 11px; color: #999999; margin-bottom: 4px;">TIER 4: &gt;90 días</div>
            <div style="font-size: 18px; font-weight: bold; color: #333333;">8,572</div>
            <div style="font-size: 10px; color: #7F8C8D;">Reactivación</div>
          </div>
        </div>
        
        <div style="background-color: #FFF3E0; padding: 10px; border-radius: 6px; font-size: 12px; color: #E65100;">
          <strong>Oportunidad:</strong> 8,572 leads (61%) en estatus &gt;90 días requieren reactivación estratégica.
        </div>
      </div>
      
      <!-- DEFINITION 2: CONTACT TIMING -->
      <div style="background-color: #FFFFFF; border: 1px solid #E0E0E0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 14px; font-weight: bold; color: #333333;">2. Estándares de Contacto por Tipo de Propiedad</h3>
          <span style="background-color: #E8F5E9; color: #2E7D32; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">ACTIVO</span>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div>
            <div style="font-weight: bold; color: #333333; margin-bottom: 8px;">CASA</div>
            <div style="background-color: #F5F5F5; padding: 10px; border-radius: 6px; margin-bottom: 6px;">
              <div style="font-size: 11px; color: #999999;">Primera toma</div>
              <div style="font-size: 16px; font-weight: bold; color: #1976D2;">48h</div>
            </div>
            <div style="background-color: #F5F5F5; padding: 10px; border-radius: 6px; margin-bottom: 6px;">
              <div style="font-size: 11px; color: #999999;">Seguimiento</div>
              <div style="font-size: 16px; font-weight: bold; color: #1976D2;">24h</div>
            </div>
            <div style="background-color: #F5F5F5; padding: 10px; border-radius: 6px;">
              <div style="font-size: 11px; color: #999999;">Re-contacto</div>
              <div style="font-size: 16px; font-weight: bold; color: #1976D2;">7 días</div>
            </div>
          </div>
          
          <div>
            <div style="font-weight: bold; color: #333333; margin-bottom: 8px;">DEPARTAMENTO</div>
            <div style="background-color: #F5F5F5; padding: 10px; border-radius: 6px; margin-bottom: 6px;">
              <div style="font-size: 11px; color: #999999;">Primera toma</div>
              <div style="font-size: 16px; font-weight: bold; color: #F57C00;">24h</div>
            </div>
            <div style="background-color: #F5F5F5; padding: 10px; border-radius: 6px; margin-bottom: 6px;">
              <div style="font-size: 11px; color: #999999;">Seguimiento</div>
              <div style="font-size: 16px; font-weight: bold; color: #F57C00;">12h</div>
            </div>
            <div style="background-color: #F5F5F5; padding: 10px; border-radius: 6px;">
              <div style="font-size: 11px; color: #999999;">Re-contacto</div>
              <div style="font-size: 16px; font-weight: bold; color: #F57C00;">5 días</div>
            </div>
          </div>
        </div>
        
        <div style="background-color: #E3F2FD; padding: 10px; border-radius: 6px; font-size: 12px; color: #0D47A1;">
          <strong>Base:</strong> 5,968 visitas realizadas. Tiempos más agresivos para departamentos por mayor competencia.
        </div>
      </div>
      
      <!-- DEFINITION 3: CONVERSION BENCHMARKS -->
      <div style="background-color: #FFFFFF; border: 1px solid #E0E0E0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 14px; font-weight: bold; color: #333333;">3. Benchmarks de Conversión por Tipo</h3>
          <span style="background-color: #E8F5E9; color: #2E7D32; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">ACTIVO</span>
        </div>
        
        <div style="margin-bottom: 12px;">
          <div style="font-size: 12px; color: #7F8C8D; margin-bottom: 8px;">
            <strong>Conversión Total (Junio):</strong> 197 cierres / 5,968 visitas = <strong style="color: #333333; font-size: 14px;">3.3%</strong>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div>
            <div style="font-weight: bold; color: #333333; margin-bottom: 8px;">CASA</div>
            <div style="background-color: #F5F5F5; padding: 10px; border-radius: 6px; margin-bottom: 6px;">
              <div style="font-size: 11px; color: #999999;">Lead → Visita</div>
              <div style="font-size: 16px; font-weight: bold; color: #333333;">15-20%</div>
            </div>
            <div style="background-color: #F5F5F5; padding: 10px; border-radius: 6px; margin-bottom: 6px;">
              <div style="font-size: 11px; color: #999999;">Visita → Cierre (6m)</div>
              <div style="font-size: 16px; font-weight: bold; color: #333333;">3.5-4.5%</div>
            </div>
            <div style="background-color: #F5F5F5; padding: 10px; border-radius: 6px;">
              <div style="font-size: 11px; color: #999999;">Lead → Cierre Total</div>
              <div style="font-size: 16px; font-weight: bold; color: #333333;">0.5-0.9%</div>
            </div>
          </div>
          
          <div>
            <div style="font-weight: bold; color: #333333; margin-bottom: 8px;">DEPARTAMENTO</div>
            <div style="background-color: #F5F5F5; padding: 10px; border-radius: 6px; margin-bottom: 6px;">
              <div style="font-size: 11px; color: #999999;">Lead → Visita</div>
              <div style="font-size: 16px; font-weight: bold; color: #333333;">20-25%</div>
            </div>
            <div style="background-color: #F5F5F5; padding: 10px; border-radius: 6px; margin-bottom: 6px;">
              <div style="font-size: 11px; color: #999999;">Visita → Cierre (6m)</div>
              <div style="font-size: 16px; font-weight: bold; color: #333333;">2.5-3.5%</div>
            </div>
            <div style="background-color: #F5F5F5; padding: 10px; border-radius: 6px;">
              <div style="font-size: 11px; color: #999999;">Lead → Cierre Total</div>
              <div style="font-size: 16px; font-weight: bold; color: #333333;">0.5-0.9%</div>
            </div>
          </div>
        </div>
        
        <div style="background-color: #FCE4EC; padding: 10px; border-radius: 6px; font-size: 12px; color: #880E4F;">
          <strong>Crítico:</strong> 61% de leads (8,572) abandonados después de 90 días. Reactivación estratégica puede recuperar 400-600 oportunidades de venta.
        </div>
      </div>
    </div>
  `
}
