import { getCompanySalesCompliance, getBranchTargetPerformance } from './targets-2026'
import { getMarketSnapshot } from './market-snapshot'
import { getValuationSnapshot } from './valuation-snapshot'
import { getOperationalSummary } from './crm-snapshot'

export interface CeoReportData {
  period: string
  company: {
    sales: number | null
    salesUf: number | null
    cumulativeSales: number | null
    targets: { salesMonthly: number | null; cumulativeTarget: number | null }
    productivity: number | null
    compliance: number | null
  }
  market: {
    zones: Array<{ name: string; signal: string; trend: string; confidence: string }>
    portfolio: string
  }
  valuation: {
    methodology: string
    propertyTypes: string[]
    models: string
  }
  indicators: {
    compliance: number | null
    productivity: number | null
    marketSaturation: string
    conversion: string
    leadQuality: string
  }
  risks: Array<{ title: string; severity: string; impact: string; mitigation: string }>
  opportunities: Array<{ title: string; priority: string; action: string }>
}

export function generateCeoReportData(periodOverride?: string): CeoReportData {
  const now = new Date()
  const period = periodOverride || `2026-${String(now.getMonth() + 1).padStart(2, '0')}`

  const compliance = getCompanySalesCompliance(period)
  const branchPerformance = getBranchTargetPerformance(period)
  const marketSnapshot = getMarketSnapshot()
  const valuationSnapshot = getValuationSnapshot()
  const operationalSummary = getOperationalSummary()

  const compliance_percent =
    compliance.target && compliance.actual !== null
      ? (compliance.actual / compliance.target) * 100
      : null
  const totalSales = operationalSummary?.sales || null
  const totalPartners = operationalSummary?.topAgents.length || 10
  const productivity = totalSales && totalPartners ? totalSales / totalPartners : null

  return {
    period,
    company: {
      sales: compliance.actual,
      salesUf: operationalSummary?.salesUf || null,
      cumulativeSales: operationalSummary?.sales || null,
      targets: {
        salesMonthly: compliance.target || null,
        cumulativeTarget: null,
      },
      productivity: productivity,
      compliance: compliance_percent,
    },
    market: {
      zones: marketSnapshot
        .filter((m) => m.type === 'market_signal')
        .slice(0, 4)
        .map((signal) => ({
          name: signal.domain,
          signal: signal.title,
          trend: signal.summary,
          confidence: signal.confidence === 'high' ? '85' : signal.confidence === 'medium' ? '65' : '45',
        })),
      portfolio: `Portfolio de ${marketSnapshot.length} señales monitoreadas`,
    },
    valuation: {
      methodology: valuationSnapshot.length > 0 ? 'Deterministic with comparable analysis' : 'n/d',
      propertyTypes: ['Departamento', 'Casa', 'Terreno', 'Comercial'],
      models: valuationSnapshot.filter((v) => v.type === 'valuation_model').length + ' modelos disponibles',
    },
    indicators: {
      compliance: compliance_percent,
      productivity: productivity ? parseFloat(productivity.toFixed(2)) : null,
      marketSaturation: `${branchPerformance.length} oficinas activas`,
      conversion: operationalSummary ? `${(100 / operationalSummary.leadToSaleProxy).toFixed(1)}%` : 'n/d',
      leadQuality: `${operationalSummary?.topAgents.length || 0} ejecutivas`,
    },
    risks: [
      {
        title: 'Cumplimiento de Ventas',
        severity: (compliance_percent || 0) < 80 ? 'critical' : 'medium',
        impact: `Actual vs Target: ${compliance.actual}/${compliance.target}`,
        mitigation: 'Intensificar seguimiento a ejecutivas con bajo desempeño',
      },
      {
        title: 'Cobertura de Mercado',
        severity: marketSnapshot.length < 5 ? 'high' : 'low',
        impact: `${marketSnapshot.length} zonas monitoreadas`,
        mitigation: 'Expandir presencia en nuevas comunas estratégicas',
      },
    ],
    opportunities: [
      {
        title: 'Optimización de Conversión',
        priority: 'high',
        action: 'Implementar coaching para mejorar tasa lead-to-sale de 1:' + (operationalSummary?.leadToSaleProxy.toFixed(1) || 'n/d'),
      },
      {
        title: 'Penetración de Mercado',
        priority: 'high',
        action: 'Lanzar campaña en zonas de alto potencial identificadas',
      },
    ],
  }
}

export function generateCeoReportHTML(data: CeoReportData): string {
  const brandbook = {
    fontFamily: 'Calibri, sans-serif',
    backgroundColor: '#F0F0F0',
    textColor: '#333333',
    accentRed: '#E74C3C',
    accentGreen: '#27AE60',
    accentOrange: '#F39C12',
    accentBlue: '#1565C0',
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#C0392B'
      case 'high':
        return '#E74C3C'
      case 'medium':
        return '#F39C12'
      case 'low':
        return '#27AE60'
      default:
        return '#7F8C8D'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#E74C3C'
      case 'medium':
        return '#F39C12'
      case 'low':
        return '#27AE60'
      default:
        return '#7F8C8D'
    }
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CEO Reporte Integral - Property Partners ${data.period}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: ${brandbook.fontFamily};
      background-color: ${brandbook.backgroundColor};
      color: ${brandbook.textColor};
      line-height: 1.6;
      padding: 40px 20px;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
      background-color: white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    .header {
      background-color: #000000;
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 32px;
      margin-bottom: 10px;
      font-weight: 600;
    }
    
    .header p {
      font-size: 14px;
      opacity: 0.9;
    }
    
    .period-badge {
      display: inline-block;
      background-color: ${brandbook.accentRed};
      color: white;
      padding: 6px 12px;
      border-radius: 3px;
      font-size: 12px;
      margin-top: 10px;
    }
    
    .section {
      padding: 30px;
      border-bottom: 1px solid ${brandbook.backgroundColor};
    }
    
    .section:last-child {
      border-bottom: none;
    }
    
    .section-title {
      font-size: 20px;
      font-weight: 600;
      color: #000000;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
    }
    
    .section-title::before {
      content: '';
      width: 4px;
      height: 20px;
      background-color: ${brandbook.accentRed};
      margin-right: 12px;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }
    
    .metric-card {
      background-color: ${brandbook.backgroundColor};
      padding: 20px;
      border-left: 4px solid ${brandbook.accentBlue};
    }
    
    .metric-label {
      font-size: 12px;
      color: ${brandbook.textColor};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    
    .metric-value {
      font-size: 28px;
      font-weight: 600;
      color: #000000;
    }
    
    .metric-target {
      font-size: 12px;
      color: #7F8C8D;
      margin-top: 4px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    
    th {
      background-color: #000000;
      color: white;
      padding: 12px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    td {
      padding: 12px;
      border-bottom: 1px solid ${brandbook.backgroundColor};
    }
    
    tr:nth-child(even) {
      background-color: ${brandbook.backgroundColor};
    }
    
    .severity-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 600;
      color: white;
      text-transform: uppercase;
    }
    
    .zone-item {
      background-color: ${brandbook.backgroundColor};
      padding: 15px;
      margin-bottom: 12px;
      border-left: 4px solid ${brandbook.accentBlue};
    }
    
    .zone-name {
      font-weight: 600;
      font-size: 14px;
      color: #000000;
      margin-bottom: 6px;
    }
    
    .zone-detail {
      font-size: 12px;
      color: ${brandbook.textColor};
      margin: 3px 0;
    }
    
    .footer {
      background-color: ${brandbook.backgroundColor};
      padding: 20px 30px;
      text-align: center;
      font-size: 11px;
      color: #7F8C8D;
    }
    
    .highlight-green {
      color: ${brandbook.accentGreen};
      font-weight: 600;
    }
    
    .highlight-red {
      color: ${brandbook.accentRed};
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>REPORTE INTEGRAL EJECUTIVO</h1>
      <p>Property Partners - Inteligencia de Negocios</p>
      <div class="period-badge">PERÍODO: ${data.period}</div>
    </div>
    
    <!-- Indicadores Principales -->
    <div class="section">
      <div class="section-title">Indicadores Principales</div>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Cumplimiento</div>
          <div class="metric-value">${data.indicators.compliance ? Math.round(data.indicators.compliance) : 'n/d'}%</div>
          <div class="metric-target">Target: ${data.company.targets.salesMonthly || 'n/d'} operaciones</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Productividad</div>
          <div class="metric-value">${data.indicators.productivity ? data.indicators.productivity.toFixed(1) : 'n/d'}</div>
          <div class="metric-target">Por ejecutiva</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Conversión</div>
          <div class="metric-value">${data.indicators.conversion}</div>
          <div class="metric-target">Lead to Sale</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Cobertura</div>
          <div class="metric-value">${data.indicators.marketSaturation}</div>
          <div class="metric-target">Presencia geográfica</div>
        </div>
      </div>
    </div>
    
    <!-- Desempeño de la Compañía -->
    <div class="section">
      <div class="section-title">Desempeño Compañía</div>
      <table>
        <thead>
          <tr>
            <th>Métrica</th>
            <th>Actual</th>
            <th>Target</th>
            <th>% Cumplimiento</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Ventas Mensuales</td>
            <td>${data.company.sales || 'n/d'}</td>
            <td>${data.company.targets.salesMonthly || 'n/d'}</td>
            <td class="${data.company.compliance && data.company.compliance >= 80 ? 'highlight-green' : 'highlight-red'}">
              ${data.company.compliance ? Math.round(data.company.compliance) : 'n/d'}%
            </td>
          </tr>
          <tr>
            <td>Productividad</td>
            <td>${data.company.productivity ? data.company.productivity.toFixed(2) : 'n/d'}</td>
            <td>15.0</td>
            <td>${data.company.productivity ? (data.company.productivity >= 15 ? '✓ OK' : '✗ Bajo') : 'n/d'}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Inteligencia de Mercado -->
    <div class="section">
      <div class="section-title">Inteligencia de Mercado</div>
      <p style="margin-bottom: 20px; font-size: 13px; color: #7F8C8D;">${data.market.portfolio}</p>
      ${data.market.zones
        .map(
          (zone) => `
        <div class="zone-item">
          <div class="zone-name">${zone.name}</div>
          <div class="zone-detail"><strong>Señales:</strong> ${zone.signal}</div>
          <div class="zone-detail"><strong>Tendencia:</strong> ${zone.trend}</div>
          <div class="zone-detail"><strong>Confianza:</strong> ${zone.confidence}</div>
        </div>
      `
        )
        .join('')}
    </div>
    
    <!-- Riesgos -->
    <div class="section">
      <div class="section-title">Riesgos Identificados</div>
      <table>
        <thead>
          <tr>
            <th>Riesgo</th>
            <th>Severidad</th>
            <th>Impacto</th>
            <th>Mitigación</th>
          </tr>
        </thead>
        <tbody>
          ${data.risks
            .map(
              (risk) => `
          <tr>
            <td>${risk.title}</td>
            <td>
              <span class="severity-badge" style="background-color: ${getSeverityColor(risk.severity)};">
                ${risk.severity}
              </span>
            </td>
            <td>${risk.impact}</td>
            <td>${risk.mitigation}</td>
          </tr>
        `
            )
            .join('')}
        </tbody>
      </table>
    </div>
    
    <!-- Oportunidades -->
    <div class="section">
      <div class="section-title">Oportunidades Estratégicas</div>
      <table>
        <thead>
          <tr>
            <th>Oportunidad</th>
            <th>Prioridad</th>
            <th>Plan de Acción</th>
          </tr>
        </thead>
        <tbody>
          ${data.opportunities
            .map(
              (opp) => `
          <tr>
            <td>${opp.title}</td>
            <td>
              <span class="severity-badge" style="background-color: ${getPriorityColor(opp.priority)};">
                ${opp.priority}
              </span>
            </td>
            <td>${opp.action}</td>
          </tr>
        `
            )
            .join('')}
        </tbody>
      </table>
    </div>
    
    <!-- Validación de Datos -->
    <div class="section">
      <div class="section-title">Valuation & Methodology</div>
      <p style="margin-bottom: 15px; font-size: 13px;">
        <strong>Metodología:</strong> ${data.valuation.methodology}
      </p>
      <p style="margin-bottom: 15px; font-size: 13px;">
        <strong>Tipos de Propiedad:</strong> ${data.valuation.propertyTypes.join(', ')}
      </p>
      <p style="font-size: 13px;">
        <strong>Modelos de Valuación:</strong> ${data.valuation.models}
      </p>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p>Reporte generado automáticamente el ${new Date().toLocaleString('es-CL')}</p>
      <p style="margin-top: 10px;">Este documento contiene información confidencial de Property Partners</p>
    </div>
  </div>
</body>
</html>`
}
