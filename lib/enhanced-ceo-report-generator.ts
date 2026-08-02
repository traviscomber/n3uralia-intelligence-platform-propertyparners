import { getCompanySalesCompliance } from '@/lib/targets-2026'
import { getOperationalSummary } from '@/lib/crm-snapshot'
import { getMarketSnapshot } from '@/lib/market-snapshot'
import { getValuationSnapshot } from '@/lib/valuation-snapshot'

export async function generateEnhancedCeoReportHTML(periodOverride?: string) {
  const now = new Date()
  const period = periodOverride || `2026-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthName = new Date(2026, parseInt(period.split('-')[1]) - 1).toLocaleString('es-ES', { month: 'long' })

  try {
    // Fetch all data
    const [compliance, operational, market, valuation] = await Promise.all([
      getCompanySalesCompliance(period),
      getOperationalSummary(),
      getMarketSnapshot(),
      getValuationSnapshot(),
    ])

    const actual = compliance?.actual || 0
    const target = compliance?.target || 8.1
    const cumulative = compliance?.cumulative || 0
    const cumulativeTarget = compliance?.cumulativeTarget || 32.4
    const compliancePct = Math.round((actual / target) * 100)
    const cumulativePct = Math.round((cumulative / cumulativeTarget) * 100)

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte CEO - ${monthName} 2026</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 1000px; margin: 0 auto; }
    .header { background: #fff; padding: 40px; border-bottom: 3px solid #d7332b; text-align: center; }
    .logo { font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px; }
    .header-title { font-size: 28px; font-weight: 700; color: #000; margin-bottom: 8px; }
    .header-subtitle { font-size: 14px; color: #666; }
    .section { padding: 40px; border-bottom: 1px solid #eee; }
    .section:last-child { border-bottom: none; }
    .section-number { font-size: 12px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 1px; }
    .section-title { font-size: 20px; font-weight: 700; color: #000; margin: 12px 0 24px 0; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 24px; }
    .metric-card { background: #f9f9f9; padding: 20px; border-radius: 4px; border-left: 4px solid #d7332b; }
    .metric-label { font-size: 12px; color: #999; text-transform: uppercase; font-weight: 600; margin-bottom: 8px; }
    .metric-value { font-size: 32px; font-weight: 700; color: #000; margin-bottom: 4px; }
    .metric-detail { font-size: 13px; color: #666; }
    .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .table th { background: #f5f5f5; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #ddd; }
    .table td { padding: 12px; border-bottom: 1px solid #eee; }
    .table tr:hover { background: #f9f9f9; }
    .risk-item { padding: 16px; margin-bottom: 12px; border-left: 4px solid #999; background: #f9f9f9; border-radius: 2px; }
    .risk-critical { border-left-color: #d7332b; }
    .risk-high { border-left-color: #f97316; }
    .risk-medium { border-left-color: #a77a22; }
    .risk-low { border-left-color: #2f8f4e; }
    .risk-title { font-weight: 600; margin-bottom: 4px; }
    .risk-severity { font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 8px; border-radius: 2px; display: inline-block; margin-bottom: 8px; }
    .severity-critical { background: #d7332b; color: white; }
    .severity-high { background: #f97316; color: white; }
    .severity-medium { background: #a77a22; color: white; }
    .severity-low { background: #2f8f4e; color: white; }
    .footer { padding: 20px 40px; background: #f9f9f9; font-size: 12px; color: #999; text-align: center; border-top: 1px solid #eee; }
    @media print { body { margin: 0; padding: 0; } }
  </style>
</head>
<body>
  <div class="container">
    <!-- HEADER -->
    <div class="header">
      <div class="logo">PROPERTY PARTNERS VITACURA · CONTROL DE GESTIÓN</div>
      <div class="header-title">Control de Gestión — Cierre ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}</div>
      <div class="header-subtitle">Reporte integral de desempeño comercial, disciplina operativa y estándares de gestión</div>
    </div>

    <!-- SECTION 01: RESULTADO INTEGRAL -->
    <div class="section">
      <div class="section-number">01 · RESULTADO INTEGRAL</div>
      <div class="section-title">Desempeño Comercial — ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}</div>
      
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Cumplimiento Mensual</div>
          <div class="metric-value">${compliancePct}%</div>
          <div class="metric-detail">${actual} operaciones vs meta de ${target.toFixed(1)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Cierres ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}</div>
          <div class="metric-value">${actual}</div>
          <div class="metric-detail">Meta mensual: ${target.toFixed(1)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Productividad</div>
          <div class="metric-value">${(actual / (operational?.partnerCount || 7)).toFixed(2)}</div>
          <div class="metric-detail">Por ejecutiva</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Acumulado Enero-${monthName.charAt(0).toUpperCase() + monthName.slice(1)}</div>
          <div class="metric-value">${cumulative}</div>
          <div class="metric-detail">Meta acumulada: ${cumulativeTarget.toFixed(1)} (${cumulativePct}%)</div>
        </div>
      </div>
    </div>

    <!-- SECTION 02: VENTA DEL MES -->
    <div class="section">
      <div class="section-number">02 · VENTA DEL MES</div>
      <div class="section-title">Venta ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}</div>
      
      <table class="table">
        <thead>
          <tr>
            <th>Indicador</th>
            <th>Valor</th>
            <th>Meta</th>
            <th>% Cumplimiento</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Cierres del mes</td>
            <td>${actual}</td>
            <td>${target.toFixed(1)}</td>
            <td>${compliancePct}%</td>
          </tr>
          <tr>
            <td>Productividad</td>
            <td>${(actual / (operational?.partnerCount || 7)).toFixed(2)}</td>
            <td>1.15</td>
            <td>${Math.round(((actual / (operational?.partnerCount || 7)) / 1.15) * 100)}%</td>
          </tr>
          <tr>
            <td>Leads procesados</td>
            <td>${operational?.totalLeads || '-'}</td>
            <td>N/A</td>
            <td>-</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- SECTION 03: MERCADO -->
    <div class="section">
      <div class="section-number">03 · MERCADO</div>
      <div class="section-title">Inteligencia de Mercado</div>
      
      <div style="margin-bottom: 20px;">
        <strong>Zonas de operación:</strong> ${market?.zones?.join(', ') || 'Vitacura, La Dehesa, El Bosque, Las Condes'}<br>
        <strong>Fuentes de datos:</strong> ${market?.dataSources?.join(', ') || 'Portal Inmobiliario, TOCTOC, iCasas, Yapo'}<br>
        <strong>Ciclo promedio:</strong> ${market?.avgCycleDays || 45} días<br>
        <strong>Ventaja competitiva:</strong> ${market?.competitiveAdvantage || 'Especialización + IA + Data Intelligence'}
      </div>

      <h4 style="margin: 20px 0 12px 0;">Señales de Mercado:</h4>
      ${market?.marketTrends?.map((trend: any) => `
        <div class="risk-item" style="margin-bottom: 12px;">
          <div class="risk-title">${trend.title}</div>
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">${trend.signal}</div>
          <span class="risk-severity severity-${trend.confidence === 'high' ? 'high' : trend.confidence === 'medium' ? 'medium' : 'low'}">
            ${trend.confidence?.toUpperCase()}
          </span>
        </div>
      `).join('') || '<p style="color: #999;">No hay señales disponibles</p>'}
    </div>

    <!-- SECTION 04: VALUACIÓN -->
    <div class="section">
      <div class="section-number">04 · VALUACIÓN</div>
      <div class="section-title">Análisis de Valuación</div>
      
      <p style="margin-bottom: 16px; color: #666;">
        ${valuation?.methodology || 'Metodología: Enfoque comparativo con análisis de mercado y ajustes por zona y tipo de propiedad.'}
      </p>
      
      <p style="margin-bottom: 16px; color: #666;">
        <strong>Tipos de propiedad analizados:</strong> ${valuation?.propertyTypesAnalyzed?.join(', ') || 'Departamento, Casa, Terreno, Comercial'}
      </p>

      <h4 style="margin: 16px 0 12px 0;">Estado de modelos:</h4>
      <table class="table">
        <thead>
          <tr>
            <th>Tipo de Modelo</th>
            <th>Cantidad</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${valuation?.valuationModels?.map((model: any) => `
            <tr>
              <td>${model.type}</td>
              <td>${model.count}</td>
              <td>${model.status}</td>
            </tr>
          `).join('') || '<tr><td colspan="3" style="text-align: center; color: #999;">No hay datos disponibles</td></tr>'}
        </tbody>
      </table>
    </div>

    <!-- SECTION 05: RIESGOS -->
    <div class="section">
      <div class="section-number">05 · RIESGOS</div>
      <div class="section-title">Análisis de Riesgos</div>
      
      ${market?.risks?.map((risk: any) => `
        <div class="risk-item risk-${risk.severity}">
          <div class="risk-title">${risk.type}</div>
          <span class="risk-severity severity-${risk.severity}">${risk.severity?.toUpperCase()}</span>
          <p style="margin: 8px 0; color: #666; font-size: 14px;">${risk.description}</p>
          <p style="margin: 8px 0; color: #666; font-size: 13px;"><strong>Mitigación:</strong> ${risk.mitigation}</p>
        </div>
      `).join('') || '<p style="color: #999;">No hay riesgos críticos identificados</p>'}
    </div>

    <!-- SECTION 06: OPORTUNIDADES -->
    <div class="section">
      <div class="section-number">06 · OPORTUNIDADES</div>
      <div class="section-title">Oportunidades de Crecimiento</div>
      
      ${market?.opportunities?.map((opp: any) => `
        <div class="risk-item risk-${opp.priority === 'high' ? 'high' : opp.priority === 'medium' ? 'medium' : 'low'}">
          <div class="risk-title">${opp.area}</div>
          <p style="margin: 8px 0; color: #666; font-size: 14px;">${opp.potential}</p>
          <p style="margin: 8px 0; color: #666; font-size: 13px;"><strong>Acción:</strong> ${opp.action}</p>
          <span class="risk-severity severity-${opp.priority === 'high' ? 'high' : opp.priority === 'medium' ? 'medium' : 'low'}">
            Prioridad: ${opp.priority?.toUpperCase()}
          </span>
        </div>
      `).join('') || '<p style="color: #999;">No hay oportunidades identificadas</p>'}
    </div>

    <!-- FOOTER -->
    <div class="footer">
      <p>N3URALIA INTELLIGENCE PLATFORM</p>
      <p>PROPERTY PARTNERS VITACURA · REPORTE CEO ${monthName.toUpperCase()} 2026</p>
      <p>Generado ${now.toLocaleDateString('es-ES')}</p>
    </div>
  </div>
</body>
</html>`

    return html
  } catch (error) {
    console.error('[Enhanced Report Generator] Error:', error)
    throw error
  }
}
