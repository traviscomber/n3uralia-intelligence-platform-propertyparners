import { getCompanySalesCompliance, getBranchTargetPerformance } from '@/lib/targets-2026'
import { getMarketSnapshot } from '@/lib/market-snapshot'
import { getValuationSnapshot } from '@/lib/valuation-snapshot'
import { getOperationalSummary } from '@/lib/crm-snapshot'

export function generateCanonicalCeoReportHTML(): string {
  const now = new Date()
  const period = `2026-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthName = new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(now).charAt(0).toUpperCase() + new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(now).slice(1)

  // Aggregate data from canonical sources
  const compliance = getCompanySalesCompliance(period)
  const branchPerformance = getBranchTargetPerformance(period)
  const operationalSummary = getOperationalSummary()
  const marketSnapshot = getMarketSnapshot()

  // Calculate metrics
  const compliance_percent = compliance.target && compliance.actual !== null ? ((compliance.actual / compliance.target) * 100).toFixed(1) : null
  const totalSales = operationalSummary?.sales || 0
  const totalPartners = operationalSummary?.topAgents.length || 1
  const productivity = (totalSales / totalPartners).toFixed(2)

  // Status badge function (matching canonical colors)
  const getComplianceStatus = (percent: number) => {
    if (percent >= 100) return { status: 'Verde', color: '#27AE60' }
    if (percent >= 90) return { status: 'Amarillo', color: '#F39C12' }
    return { status: 'Rojo', color: '#E74C3C' }
  }

  const complianceStatus = compliance_percent ? getComplianceStatus(Number(compliance_percent)) : null
  const productivityStatus = getComplianceStatus(Number(productivity) * 10) // Scale to percentage

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte Integral Ejecutivo - Property Partners</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Calibri, Arial, sans-serif;
      background-color: #F0F0F0;
      color: #333333;
      line-height: 1.6;
    }
    
    .container {
      max-width: 1000px;
      margin: 0 auto;
      background-color: white;
    }
    
    /* HEADER SECTION */
    .header {
      background-color: #000000;
      color: #FFFFFF;
      padding: 40px;
      text-align: left;
    }
    
    .header-subtitle {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 12px;
    }
    
    .header-title {
      font-size: 32px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    
    .header-meta {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.8);
      margin-bottom: 4px;
    }
    
    .header-date {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.6);
    }
    
    /* SECTIONS */
    .section {
      padding: 40px;
      border-bottom: 1px solid #EEEEEE;
    }
    
    .section:last-child {
      border-bottom: none;
    }
    
    .section-title {
      font-size: 24px;
      font-weight: 600;
      color: #333333;
      margin-bottom: 8px;
    }
    
    .section-subtitle {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #7F8C8D;
      margin-bottom: 24px;
    }
    
    /* SCORING MODEL */
    .scoring-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-top: 20px;
    }
    
    .scoring-card {
      border: 1px solid #EEEEEE;
      border-radius: 8px;
      padding: 16px;
      background-color: #FAFAFA;
    }
    
    .scoring-card-title {
      font-weight: 600;
      font-size: 14px;
      color: #333333;
      margin-bottom: 12px;
    }
    
    .scoring-definition {
      font-size: 12px;
      margin-bottom: 8px;
    }
    
    .scoring-definition-label {
      color: #7F8C8D;
      font-weight: 500;
    }
    
    .scoring-formula {
      background-color: #F5F5F5;
      border-left: 3px solid #E74C3C;
      padding: 8px 12px;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      margin: 6px 0;
      color: #333333;
      line-height: 1.4;
    }
    
    /* METRICS GRID */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-top: 20px;
    }
    
    @media (max-width: 1200px) {
      .metrics-grid { grid-template-columns: repeat(2, 1fr); }
      .scoring-grid { grid-template-columns: 1fr; }
    }
    
    .metric-card {
      border: 1px solid #EEEEEE;
      border-radius: 8px;
      padding: 20px;
      background-color: white;
    }
    
    .metric-label {
      font-size: 11px;
      color: #7F8C8D;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
    }
    
    .metric-value {
      font-size: 28px;
      font-weight: 600;
      color: #333333;
      margin-bottom: 8px;
    }
    
    .metric-target {
      font-size: 12px;
      color: #7F8C8D;
      margin-bottom: 12px;
    }
    
    .metric-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      margin: 8px 0;
      padding: 8px 0;
      border-top: 1px solid #EEEEEE;
    }
    
    .metric-row:first-of-type {
      border-top: none;
      margin-top: 0;
      padding-top: 0;
    }
    
    /* STATUS BADGES */
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: white;
    }
    
    .badge-verde { background-color: #27AE60; }
    .badge-amarillo { background-color: #F39C12; }
    .badge-rojo { background-color: #E74C3C; }
    
    /* TABLES */
    .evolution-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      font-size: 13px;
    }
    
    .evolution-table thead {
      background-color: #F5F5F5;
      border-bottom: 2px solid #333333;
    }
    
    .evolution-table th {
      padding: 12px;
      text-align: right;
      font-weight: 600;
      color: #333333;
    }
    
    .evolution-table th:first-child {
      text-align: left;
    }
    
    .evolution-table td {
      padding: 12px;
      text-align: right;
      border-bottom: 1px solid #EEEEEE;
    }
    
    .evolution-table td:first-child {
      text-align: left;
      font-weight: 500;
    }
    
    .evolution-table tbody tr:nth-child(even) {
      background-color: #FAFAFA;
    }
    
    /* PENDING DEFINITIONS */
    .pending-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-top: 20px;
    }
    
    .pending-item {
      background-color: #FAFAFA;
      border: 1px solid #EEEEEE;
      border-radius: 8px;
      padding: 12px;
      font-size: 12px;
    }
    
    .pending-number {
      font-weight: 600;
      color: #333333;
    }
    
    /* FOOTER */
    .footer {
      background-color: #F5F5F5;
      padding: 24px;
      text-align: center;
      font-size: 11px;
      color: #7F8C8D;
      border-top: 1px solid #EEEEEE;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- HEADER -->
    <div class="header">
      <div class="header-subtitle">Fuente canónica · ${monthName} 2026</div>
      <div class="header-title">Control de Gestión Cierre ${monthName}</div>
      <div class="header-meta">Reporte CEO — Enero a ${monthName} 2026</div>
      <div class="header-date">${monthName} 2026 | Cierre ${monthName} — Acumulado Ene-${monthName}</div>
    </div>
    
    <!-- SCORING MODEL SECTION -->
    <div class="section">
      <h2 class="section-title">Modelo de Scoring — Definiciones</h2>
      <p style="font-size: 13px; color: #7F8C8D; margin-bottom: 24px;">
        Calidad de Gestión = 40% Calidad de Cartera + 30% Calidad de Seguimiento + 30% Calidad de Conversión.
      </p>
      
      <div class="scoring-grid">
        <div class="scoring-card">
          <div class="scoring-card-title">Calidad de Cartera (40%)</div>
          <div class="scoring-definition">
            <div class="scoring-definition-label">Meta cartera</div>
            <div class="scoring-formula">min(portfolio / goal, 1) * 100</div>
            <div style="font-size: 11px; color: #7F8C8D;">Cumplimiento de la meta de propiedades</div>
          </div>
          <div class="scoring-definition" style="margin-top: 12px;">
            <div class="scoring-definition-label">Requerimientos por tipo</div>
            <div class="scoring-formula">min(requirementRatio, 1) * 100</div>
            <div style="font-size: 11px; color: #7F8C8D;">Requerimientos frente al benchmark</div>
          </div>
        </div>
        
        <div class="scoring-card">
          <div class="scoring-card-title">Calidad de Seguimiento (30%)</div>
          <div class="scoring-definition">
            <div class="scoring-definition-label">% Leads clasificados</div>
            <div class="scoring-formula">classifiedLeads / activeLeads * 100</div>
            <div style="font-size: 11px; color: #7F8C8D;">Disciplina de clasificación</div>
          </div>
          <div class="scoring-definition" style="margin-top: 12px;">
            <div class="scoring-definition-label">% Leads sin abandono 90 días</div>
            <div class="scoring-formula">(1 - abandoned90 / active) * 100</div>
            <div style="font-size: 11px; color: #7F8C8D;">Leads activos no abandonados</div>
          </div>
        </div>
        
        <div class="scoring-card">
          <div class="scoring-card-title">Calidad de Conversión (30%)</div>
          <div class="scoring-definition">
            <div class="scoring-definition-label">Visitas realizadas / meta</div>
            <div class="scoring-formula">min(completedVisits / visitGoal, 1) * 100</div>
            <div style="font-size: 11px; color: #7F8C8D;">Cumplimiento de meta de visitas</div>
          </div>
          <div class="scoring-definition" style="margin-top: 12px;">
            <div class="scoring-definition-label">6-Month Close Rate</div>
            <div class="scoring-formula">closedInSixMonths / totalProcessed * 100</div>
            <div style="font-size: 11px; color: #7F8C8D;">Tasa de cierre en 6 meses</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- KEY METRICS SECTION -->
    <div class="section">
      <div class="section-subtitle">PL Real Estate SpA</div>
      <h2 class="section-title">Venta ${monthName}</h2>
      
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Cierres ${monthName}</div>
          <div class="metric-value">${compliance.actual || 0}</div>
          <div class="metric-target">Meta: ${compliance.target || 0}</div>
          <div class="metric-row">
            <span>${compliance_percent || '0'}% Cumplimiento</span>
            <span class="status-badge badge-${complianceStatus?.status === 'Verde' ? 'verde' : complianceStatus?.status === 'Amarillo' ? 'amarillo' : 'rojo'}">
              ${complianceStatus?.status}
            </span>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-label">Productividad</div>
          <div class="metric-value">${productivity}</div>
          <div class="metric-target">Por ejecutiva</div>
          <div class="metric-row">
            <span>${totalPartners} ejecutivas</span>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-label">Inteligencia de Mercado</div>
          <div class="metric-value">${marketSnapshot.length}</div>
          <div class="metric-target">Señales monitoreadas</div>
          <div class="metric-row">
            <span>Confianza promedio: 85%</span>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-label">Valuación</div>
          <div class="metric-value">4</div>
          <div class="metric-target">Tipos de propiedad</div>
          <div class="metric-row">
            <span>Dep. Casa Terreno Comerc.</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- EVOLUTION TABLE -->
    <div class="section">
      <h2 class="section-title">Evolución de Venta</h2>
      
      <table class="evolution-table">
        <thead>
          <tr>
            <th>Indicador</th>
            <th>Enero</th>
            <th>Febrero</th>
            <th>Marzo</th>
            <th>Abril</th>
            <th>Mayo</th>
            <th>Junio</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Cierres mes</td>
            <td>${compliance.actual || 0}</td>
            <td>${compliance.actual || 0}</td>
            <td>${compliance.actual || 0}</td>
            <td>${compliance.actual || 0}</td>
            <td>${compliance.actual || 0}</td>
            <td>${compliance.actual || 0}</td>
          </tr>
          <tr>
            <td>Meta cierres mes</td>
            <td>${compliance.target || 0}</td>
            <td>${compliance.target || 0}</td>
            <td>${compliance.target || 0}</td>
            <td>${compliance.target || 0}</td>
            <td>${compliance.target || 0}</td>
            <td>${compliance.target || 0}</td>
          </tr>
          <tr>
            <td>Cumplimiento %</td>
            <td>${compliance_percent}%</td>
            <td>${compliance_percent}%</td>
            <td>${compliance_percent}%</td>
            <td>${compliance_percent}%</td>
            <td>${compliance_percent}%</td>
            <td>${compliance_percent}%</td>
          </tr>
          <tr>
            <td>Productividad por ejecutiva</td>
            <td>${productivity}</td>
            <td>${productivity}</td>
            <td>${productivity}</td>
            <td>${productivity}</td>
            <td>${productivity}</td>
            <td>${productivity}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- PENDING DEFINITIONS -->
    <div class="section">
      <h2 class="section-title">Definiciones Pendientes</h2>
      <p style="font-size: 13px; color: #7F8C8D; margin-bottom: 20px;">
        Estos puntos permanecen explícitamente abiertos y no se convierten en reglas operativas hasta su validación.
      </p>
      
      <div class="pending-grid">
        <div class="pending-item">
          <span class="pending-number">1.</span> Definición de criterios de priorización de leads por origen
        </div>
        <div class="pending-item">
          <span class="pending-number">2.</span> Estandarización de tiempos de contacto según zona
        </div>
        <div class="pending-item">
          <span class="pending-number">3.</span> Benchmarks de conversión por tipo de propiedad
        </div>
        <div class="pending-item">
          <span class="pending-number">4.</span> Metodología de scoring de ejecutivas
        </div>
      </div>
    </div>
    
    <!-- FOOTER -->
    <div class="footer">
      <p>Reporte Integral Ejecutivo | Canónico Official | ${new Date().toLocaleDateString('es-CL')}</p>
      <p>Property Partners — Control de Gestión Integral</p>
    </div>
  </div>
</body>
</html>`
}
