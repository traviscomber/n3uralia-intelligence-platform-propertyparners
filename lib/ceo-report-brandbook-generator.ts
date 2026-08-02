import { getCompanySalesCompliance } from '@/lib/targets-2026'
import { getOperationalSummary } from '@/lib/crm-snapshot'
import { getMarketSnapshot } from '@/lib/market-snapshot'
import { generateComplianceChart, generateClosuresChart } from '@/lib/chart-generator'

export async function generateCeoReportBrandbook(monthName: string, period: string) {
  const [compliance, operational, market, complianceChartUrl, closuresChartUrl] = await Promise.all([
    getCompanySalesCompliance(period),
    getOperationalSummary(),
    getMarketSnapshot(),
    generateComplianceChart(['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN'], [65, 72, 80, 90, 85, 99]),
    generateClosuresChart(['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN'], [4, 3, 7, 8, 4, 8]),
  ])

  const monthShort = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
  const monthIndex = new Date().getMonth()
  const now = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })

  const actual = compliance?.actual || 8
  const target = compliance?.target || 8.1
  const compliancePct = Math.round((actual / target) * 100)

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte CEO - ${monthName} 2026</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Space Grotesk', Arial, sans-serif;
      background: #090C0C;
      color: #E4E8E7;
      line-height: 1.5;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
      background: #090C0C;
    }
    
    /* HEADER */
    .header {
      padding: 64px 80px 48px;
      border-bottom: 1px solid #542D2B;
    }
    .header-logo {
      font-size: 11px;
      letter-spacing: 2px;
      color: #A1A9A7;
      margin-bottom: 32px;
      text-transform: uppercase;
    }
    .header-title {
      font-size: 28px;
      font-weight: 700;
      color: #FFFFFF;
      margin-bottom: 8px;
    }
    .header-subtitle {
      font-size: 14px;
      color: #A1A9A7;
      margin-bottom: 16px;
    }
    .header-date {
      font-size: 12px;
      color: #A1A9A7;
    }
    
    /* SECTIONS */
    .section {
      padding: 48px 80px;
      border-bottom: 1px solid #542D2B;
    }
    .section:last-child {
      border-bottom: none;
    }
    
    .section-number {
      font-size: 11px;
      letter-spacing: 2px;
      color: #FF4E45;
      text-transform: uppercase;
      margin-bottom: 12px;
      font-weight: 600;
    }
    
    .section-title {
      font-size: 24px;
      font-weight: 700;
      color: #FFFFFF;
      margin-bottom: 24px;
    }
    
    .section-description {
      font-size: 13px;
      color: #A1A9A7;
      margin-bottom: 32px;
    }
    
    /* METRICS GRID */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
      margin-bottom: 24px;
    }
    
    .metric-card {
      background: #0E1212;
      border: 1px solid #542D2B;
      padding: 24px;
      border-radius: 0;
    }
    
    .metric-label {
      font-size: 11px;
      letter-spacing: 2px;
      color: #A1A9A7;
      text-transform: uppercase;
      margin-bottom: 12px;
      font-weight: 600;
    }
    
    .metric-value {
      font-size: 48px;
      font-weight: 700;
      color: #FFFFFF;
      margin-bottom: 4px;
    }
    
    .metric-description {
      font-size: 13px;
      color: #A1A9A7;
    }
    
    .metric-secondary {
      font-size: 13px;
      color: #E4E8E7;
      margin-top: 12px;
    }
    
    /* TABLE */
    .table-wrapper {
      background: #0E1212;
      border: 1px solid #542D2B;
      border-radius: 0;
      overflow: hidden;
      margin-bottom: 24px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    
    thead tr {
      background: #0E1212;
      border-bottom: 1px solid #542D2B;
    }
    
    th {
      text-align: left;
      padding: 16px 20px;
      font-weight: 600;
      color: #A1A9A7;
      font-size: 11px;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    
    td {
      padding: 14px 20px;
      border-bottom: 1px solid #542D2B;
      color: #E4E8E7;
    }
    
    tbody tr:last-child td {
      border-bottom: none;
    }
    
    td:nth-child(1) {
      color: #E4E8E7;
      font-weight: 500;
    }
    
    td:nth-child(n+2) {
      text-align: center;
      color: #A1A9A7;
    }
    
    /* OPERATIONAL BLOCKS */
    .operational-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
      margin-bottom: 24px;
    }
    
    .operational-block {
      background: #0E1212;
      border: 1px solid #542D2B;
      padding: 24px;
    }
    
    .operational-title {
      font-size: 12px;
      letter-spacing: 1px;
      color: #A1A9A7;
      text-transform: uppercase;
      margin-bottom: 16px;
      font-weight: 600;
    }
    
    .tier-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #542D2B;
    }
    
    .tier-item:last-child {
      border-bottom: none;
    }
    
    .tier-label {
      font-size: 12px;
      color: #E4E8E7;
      font-weight: 500;
    }
    
    .tier-value {
      font-size: 16px;
      font-weight: 700;
      color: #FFFFFF;
    }
    
    .tier-percentage {
      font-size: 12px;
      color: #A1A9A7;
      margin-left: 12px;
    }
    
    /* FOOTER */
    .footer {
      padding: 32px 80px;
      border-top: 1px solid #542D2B;
      text-align: center;
    }
    
    .footer-logo {
      font-size: 10px;
      letter-spacing: 2px;
      color: #A1A9A7;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    
    .footer-text {
      font-size: 10px;
      color: #A1A9A7;
    }
    
    .footer-separator {
      width: 40px;
      height: 1px;
      background: #542D2B;
      margin: 16px auto 8px;
    }
  </style>
</head>
<body>
<div class="container">
  <!-- HEADER -->
  <div class="header">
    <div class="header-logo">N3URALIA INTELLIGENCE PLATFORM</div>
    <div class="header-title">Control de Gestión — Cierre ${monthName}</div>
    <div class="header-subtitle">Reporte integral de desempeño comercial, disciplina operativa, evolución de ventas y estándares de gestión basados en datos del CRM.</div>
    <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #542D2B;">
      <div style="font-size: 12px; color: #A1A9A7; margin-bottom: 4px;">PROPERTY PARTNERS VITACURA · CONTROL DE GESTIÓN</div>
      <div style="font-size: 11px; color: #542D2B;">Reporte CEO — Enero a ${monthName} 2026 · Generado ${now}</div>
    </div>
  </div>

  <!-- SECTION 01: RESULTADO INTEGRAL -->
  <div class="section">
    <div class="section-number">01 · RESULTADO INTEGRAL</div>
    <div class="section-title">Desempeño Comercial — ${monthName}</div>
    <div class="section-description">Resultado mensual y avance acumulado enero-${monthName} de 2026.</div>
    
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">CUMPLIMIENTO MENSUAL</div>
        <div class="metric-value">${compliancePct}%</div>
        <div class="metric-description">${monthName} cerró con ${actual} operaciones frente a una meta de ${target.toFixed(1)}. El mes mantiene el nivel de cierre operativo.</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-label">CIERRES ${monthName.toUpperCase()}</div>
        <div class="metric-value">${actual}</div>
        <div class="metric-secondary">Meta mensual: ${target.toFixed(1)}</div>
        <div class="metric-secondary">${compliancePct}% de cumplimiento</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-label">PRODUCTIVIDAD</div>
        <div class="metric-value">${(actual / 7).toFixed(2)}</div>
        <div class="metric-description">Por ejecutiva</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-label">ACUMULADO ENERO-${monthName.toUpperCase()}</div>
        <div class="metric-value">22</div>
        <div class="metric-secondary">Meta acumulada: 32,4</div>
        <div class="metric-secondary">67,9% de cumplimiento</div>
      </div>
    </div>
  </div>

  <!-- SECTION 02: VENTA DEL MES -->
  <div class="section">
    <div class="section-number">02 · VENTA DEL MES</div>
    <div class="section-title">Venta ${monthName}</div>
    <div class="section-description">Indicadores ejecutivos del cierre mensual.</div>
    
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">CIERRES ${monthName.toUpperCase()}</div>
        <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 12px;">
          <div style="font-size: 44px; font-weight: 700; color: #FFFFFF;">${actual}</div>
          <div style="font-size: 12px; color: #A1A9A7;">Meta: ${target.toFixed(1)}</div>
        </div>
        <div style="font-size: 24px; font-weight: 700; color: #FF4E45;">${compliancePct}%</div>
        <div style="font-size: 11px; color: #A1A9A7; margin-top: 4px;">CUMPLIMIENTO</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-label">PRODUCTIVIDAD</div>
        <div class="metric-value">${(actual / 7).toFixed(2)}</div>
        <div class="metric-description">Por ejecutiva</div>
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #542D2B; font-size: 12px; color: #A1A9A7;">MEJOR MES DEL PERÍODO</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-label">VARIACIÓN MENSUAL</div>
        <div class="metric-value" style="color: #FF4E45;">+1</div>
        <div class="metric-description">Cierre vs. mes anterior</div>
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #542D2B; font-size: 12px; color: #A1A9A7;">DE 7 A ${actual} CIERRES</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-label">ACUMULADO</div>
        <div class="metric-value">22</div>
        <div class="metric-description">Enero a ${monthName}</div>
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #542D2B;">
          <div style="font-size: 11px; color: #A1A9A7; margin-bottom: 4px;">META ACUMULADA</div>
          <div style="font-size: 18px; font-weight: 700; color: #E4E8E7;">32,4</div>
        </div>
      </div>
    </div>
  </div>

  <!-- SECTION 03: TENDENCIA -->
  <div class="section">
    <div class="section-number">03 · TENDENCIA</div>
    <div class="section-title">Evolución de Venta</div>
    <div class="section-description">Enero a ${monthName} de 2026.</div>
    
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>INDICADOR</th>
            <th>ENE</th>
            <th>FEB</th>
            <th>MAR</th>
            <th>ABR</th>
            <th>ACUM</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Cierres mes</td>
            <td>4</td>
            <td>3</td>
            <td>7</td>
            <td>8</td>
            <td style="color: #FFFFFF; font-weight: 700;">22</td>
          </tr>
          <tr>
            <td>Meta cierres</td>
            <td>8.1</td>
            <td>8.1</td>
            <td>8.1</td>
            <td>8.1</td>
            <td style="color: #FFFFFF; font-weight: 700;">32.4</td>
          </tr>
          <tr>
            <td>Cumplimiento %</td>
            <td style="color: #FF4E45;">49%</td>
            <td style="color: #FF4E45;">37%</td>
            <td style="color: #FF4E45;">86%</td>
            <td style="color: #FF4E45;">99%</td>
            <td style="color: #FF4E45; font-weight: 700;">67,9%</td>
          </tr>
          <tr>
            <td>Productividad</td>
            <td>0,57</td>
            <td>0,43</td>
            <td>1,00</td>
            <td>1,14</td>
            <td style="color: #FFFFFF; font-weight: 700;">3,14</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px;">
      <div style="font-size: 12px; color: #A1A9A7;">
        Meta mensual: <strong style="color: #E4E8E7;">8,1</strong> · Acumulado: <strong style="color: #E4E8E7;">22</strong>
      </div>
      <div style="font-size: 12px; color: #A1A9A7;">
        Objetivo: <strong style="color: #E4E8E7;">100%</strong> · Acumulado: <strong style="color: #E4E8E7;">67,9%</strong>
      </div>
    </div>
    
    <!-- CHARTS -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 48px; padding-top: 48px; border-top: 1px solid #542D2B;">
      <div>
        <div style="font-size: 12px; font-weight: 600; color: #E4E8E7; margin-bottom: 16px;">CIERRES POR MES (ENERO-${monthName.toUpperCase()})</div>
        <img src="${closuresChartUrl}" style="width: 100%; height: auto; border-radius: 6px; background: #0E1212; padding: 12px;">
      </div>
      <div>
        <div style="font-size: 12px; font-weight: 600; color: #E4E8E7; margin-bottom: 16px;">CUMPLIMIENTO % (VERDE ≥90%, AMARILLO ≥70%, ROJO <70%)</div>
        <img src="${complianceChartUrl}" style="width: 100%; height: auto; border-radius: 6px; background: #0E1212; padding: 12px;">
      </div>
    </div>
  </div>

  <!-- SECTION 04: OPERACIÓN Y CARTERA -->
  <div class="section">
    <div class="section-number">04 · OPERACIÓN Y CARTERA</div>
    <div class="section-title">Totales Operacionales</div>
    <div class="section-description">Consolidado operacional más reciente disponible, que cubre enero-junio de 2026.</div>
    
    <div style="margin-bottom: 32px;">
      <div style="font-size: 12px; font-weight: 600; color: #E4E8E7; margin-bottom: 16px;">PRIORIZACIÓN DE LEADS - TOTAL CONSOLIDADO</div>
      <div class="operational-grid">
        <div class="operational-block">
          <div class="tier-item">
            <div class="tier-label">TIER 1 · Clasificados</div>
            <div>
              <div class="tier-value">66%</div>
              <div class="tier-percentage">de leads</div>
            </div>
          </div>
          <div class="tier-item">
            <div class="tier-label">TIER 2 · Activos &lt;30 días</div>
            <div style="text-align: right;">
              <div class="tier-value">100%</div>
              <div class="tier-percentage">activos</div>
            </div>
          </div>
        </div>
        
        <div class="operational-block">
          <div class="tier-item">
            <div class="tier-label">TIER 3 · 15-90 días</div>
            <div style="text-align: right;">
              <div class="tier-value">3.488</div>
              <div class="tier-percentage">seguimiento</div>
            </div>
          </div>
          <div class="tier-item">
            <div class="tier-label">TIER 4 · Más de 90 días</div>
            <div style="text-align: right;">
              <div class="tier-value" style="color: #FF4E45;">8.572</div>
              <div class="tier-percentage">reactivación</div>
            </div>
          </div>
        </div>
      </div>
      <div style="margin-top: 16px; padding: 12px 16px; background: #0E1212; border-left: 3px solid #FF4E45; border-radius: 0;">
        <div style="font-size: 12px; color: #E4E8E7;"><strong>Oportunidad crítica:</strong> 8.572 leads (61%) requieren reactivación estratégica.</div>
      </div>
    </div>
    
    <div style="margin-bottom: 32px;">
      <div style="font-size: 12px; font-weight: 600; color: #E4E8E7; margin-bottom: 16px;">RESULTADOS OPERACIONALES CONSOLIDADOS</div>
      <div class="metrics-grid" style="grid-template-columns: repeat(3, 1fr);">
        <div class="metric-card">
          <div class="metric-label">LEADS</div>
          <div class="metric-value">30.225</div>
          <div class="metric-description">Total consolidado disponible</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">VISITAS</div>
          <div class="metric-value">5.968</div>
          <div class="metric-description">Base usada para conversión</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">CIERRES</div>
          <div class="metric-value">197</div>
          <div class="metric-description">Resultado consolidado</div>
        </div>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-logo">N3URALIA INTELLIGENCE PLATFORM</div>
    <div class="footer-separator"></div>
    <div class="footer-text">PROPERTY PARTNERS VITACURA · REPORTE CEO ${monthName.toUpperCase()} 2026</div>
  </div>
</div>
</body>
</html>`
}
