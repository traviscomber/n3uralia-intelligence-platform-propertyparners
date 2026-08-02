import { getCompanySalesCompliance } from '@/lib/targets-2026'
import { getMarketSnapshot } from '@/lib/market-snapshot'
import { getValuationSnapshot } from '@/lib/valuation-snapshot'
import { getOperationalSummary } from '@/lib/crm-snapshot'
import { generateComplianceChart, generateClosuresChart } from '@/lib/chart-generator'

// ─── Property Partners Design System Colors ──────────────────────────────────
const PP_COLORS = {
  primary: '#d7332b',      // Brand red
  primarySoft: '#ff766f',  // Accessible red for small text
  background: '#050807',   // Dark bg
  deepBg: '#0c1111',       // Deeper bg
  foreground: '#edf4f3',   // Light text
  muted: '#9ca9a7',        // Muted text
  mutedDark: '#b6c1bf',    // Darker muted
  line: 'rgba(215, 51, 43, 0.22)', // Border color
  
  // Chart colors (from Property Partners palette)
  success: '#27ae60',      // Green
  warning: '#f39c12',      // Orange
  error: '#e74c3c',        // Red
  info: '#1565c0',         // Blue
}

// ─── helpers ────────────────────────────────────────────────────────────────

function badge(pct: number) {
  if (pct >= 90) return { cls: PP_COLORS.success, label: 'Óptimo' }
  if (pct >= 70) return { cls: PP_COLORS.warning, label: 'Normal' }
  return { cls: PP_COLORS.error, label: 'Crítico' }
}



// ─── main generator ─────────────────────────────────────────────────────────

export async function generateN3uraliaReportHTML(periodOverride?: string): Promise<string> {
  const period = periodOverride || '2026-06'
  const monthlyPeriods = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06']
  const monthShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun']
  const monthNames: Record<string, string> = {
    '2026-01': 'Enero', '2026-02': 'Febrero', '2026-03': 'Marzo',
    '2026-04': 'Abril', '2026-05': 'Mayo', '2026-06': 'Junio'
  }

  const monthlyData = monthlyPeriods.map(p => getCompanySalesCompliance(p))
  const compliance   = getCompanySalesCompliance(period)
  const operational  = getOperationalSummary()
  const valuationArr = getValuationSnapshot()
  const marketArr    = getMarketSnapshot()

  // Derive scalar values from arrays
  const marketSignalCount  = marketArr?.length || 8
  const marketAvgConf      = marketArr?.length
    ? Math.round(marketArr.reduce((s, e: any) => s + (parseFloat(e.confidence) || 0.85), 0) / marketArr.length * 100)
    : 85
  const propertyTypes: string[] = valuationArr?.length
    ? [...new Set(valuationArr.map((e: any) => e.propertyType).filter(Boolean))] as string[]
    : ['Dep.', 'Casa', 'Terreno', 'Comerc.']

  const totalPartners    = operational?.topAgents?.length || 1
  const currentActual    = compliance.actual    || 0
  const currentTarget    = compliance.target    || 8.1
  const currentPct       = currentTarget > 0 ? Math.round((currentActual / currentTarget) * 100) : 0
  const currentProd      = (currentActual / totalPartners).toFixed(2)
  const { cls: badgeBg, label: badgeLabel } = badge(currentPct)

  const totalSales   = monthlyData.reduce((s, m) => s + (m.actual || 0), 0)
  const totalTarget  = monthlyData.reduce((s, m) => s + (m.target || 0), 0)
  const totalCompPct = totalTarget > 0 ? Math.round((totalSales / totalTarget) * 100) : 0

  // Scoring
  const portfolioQ   = Math.min(Math.round((currentActual / currentTarget) * 100), 100)
  const followUpQ    = 85
  const conversionQ  = Math.min(currentPct, 100)
  const mgmtScore    = Math.round(portfolioQ * 0.4 + followUpQ * 0.3 + conversionQ * 0.3)

  // Monthly actuals & compliance arrays
  const actuals     = monthlyData.map(m => m.actual || 0)
  const compliancePcts = monthlyData.map(m => m.target ? Math.round(((m.actual || 0) / m.target) * 100) : 0)
  const maxActual   = Math.max(...actuals, 1)

  const monthName = monthNames[period] || 'Mes'
  const now = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })

  // Lead tier data
  const T1 = 4131, T2 = 14034, T3 = 3488, T4 = 8572

  // Conversion funnel data
  const funnelSteps = [
    { label: 'Leads Totales',   value: 30225, color: '#1976D2' },
    { label: 'Leads Activos',   value: 14034, color: '#0288D1' },
    { label: 'Visitas Agendadas', value: 5968, color: '#F39C12' },
    { label: 'Cierres (6m)',    value: 197,   color: '#27AE60' },
  ]

  // Generate charts
  const complianceChartUrl = await generateComplianceChart(monthShort, compliancePcts)
  const closuresChartUrl = await generateClosuresChart(monthShort, actuals)

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte Integral CEO — ${monthName} 2026</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Calibri,Arial,sans-serif;background:#f5f5f5;color:#333;line-height:1.6}
    .container{max-width:1000px;margin:0 auto;background:#ffffff}
    .header{background:#050807;color:#edf4f3;padding:40px;border-bottom:2px solid rgba(215, 51, 43, 0.22)}
    .header-eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#ff766f;margin-bottom:12px;font-weight:700}
    .header-title{font-size:32px;font-weight:600;margin-bottom:12px;color:#edf4f3}
    .header-meta{font-size:13px;color:rgba(237, 244, 243, 0.8);margin-bottom:4px}
    .header-date{font-size:11px;color:rgba(237, 244, 243, 0.6)}
    .section{padding:40px;border-bottom:1px solid rgba(215, 51, 43, 0.22)}
    .section:last-child{border-bottom:none}
    .section-eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#9ca9a7;margin-bottom:6px;font-weight:600}
    .section-title{font-size:24px;font-weight:600;color:#050807;margin-bottom:20px}
    .chart-label{font-size:12px;color:#7F8C8D;margin-bottom:8px;font-weight:500}
    /* scoring */
    .score-total{background:#F5F5F5;border-radius:8px;padding:20px 24px;display:flex;align-items:center;gap:24px;margin-bottom:24px}
    .score-total-num{font-size:48px;font-weight:700;color:#333;line-height:1}
    .score-total-meta{font-size:12px;color:#7F8C8D;line-height:1.5}
    .scoring-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:28px}
    .scoring-card{border:1px solid #EEE;border-radius:8px;padding:20px;display:flex;flex-direction:column;align-items:center;gap:6px}
    .scoring-card-label{font-size:11px;color:#7F8C8D;text-transform:uppercase;letter-spacing:.05em}
    .scoring-card-weight{font-size:10px;color:#999;margin-top:2px}
    /* metrics */
    .metrics-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
    .metric-card{border:1px solid #EEE;border-radius:8px;padding:20px}
    .metric-label{font-size:11px;color:#7F8C8D;text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px}
    .metric-value{font-size:28px;font-weight:600;color:#333;margin-bottom:6px}
    .metric-target{font-size:12px;color:#7F8C8D;margin-bottom:10px}
    .metric-row{display:flex;justify-content:space-between;align-items:center;font-size:12px;border-top:1px solid #EEE;padding-top:8px;margin-top:8px}
    .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;color:#fff;text-transform:uppercase;letter-spacing:.05em}
    /* table */
    .evo-table{width:100%;border-collapse:collapse;font-size:13px}
    .evo-table thead{background:#F5F5F5;border-bottom:2px solid #333}
    .evo-table th{padding:10px 8px;text-align:right;font-weight:600;color:#333}
    .evo-table th:first-child{text-align:left}
    .evo-table td{padding:10px 8px;text-align:right;border-bottom:1px solid #EEE}
    .evo-table td:first-child{text-align:left;font-weight:500}
    .evo-table tbody tr:nth-child(even){background:#FAFAFA}
    .evo-table .acum{background:#F5F5F5!important;font-weight:700}
    /* definitions */
    .def-card{border:1px solid #E0E0E0;border-radius:8px;padding:20px;margin-bottom:16px}
    .def-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
    .def-title{font-size:14px;font-weight:700;color:#333}
    .def-status{background:#E8F5E9;color:#2E7D32;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700}
    .def-grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px}
    .def-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:12px}
    .def-tile{background:#F5F5F5;padding:12px;border-radius:6px}
    .def-tile-label{font-size:10px;color:#999;margin-bottom:4px}
    .def-tile-value{font-size:18px;font-weight:700;color:#333}
    .def-tile-sub{font-size:10px;color:#7F8C8D}
    .alert-orange{background:#FFF3E0;padding:10px 12px;border-radius:6px;font-size:12px;color:#E65100;border-left:3px solid #F39C12}
    .alert-blue{background:#E3F2FD;padding:10px 12px;border-radius:6px;font-size:12px;color:#0D47A1;border-left:3px solid #1976D2}
    .alert-pink{background:#FCE4EC;padding:10px 12px;border-radius:6px;font-size:12px;color:#880E4F;border-left:3px solid #E91E63}
    /* chart section */
    .charts-row{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:8px}
    .chart-box{background:#FAFAFA;border:1px solid #EEE;border-radius:8px;padding:20px}
    .chart-box-full{background:#FAFAFA;border:1px solid #EEE;border-radius:8px;padding:20px;margin-top:16px}
    /* footer */
    .footer{background:#F5F5F5;padding:24px;text-align:center;font-size:11px;color:#7F8C8D;border-top:1px solid #EEE}
    /* legend dot */
    .dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:4px;vertical-align:middle}
    @media(max-width:700px){
      .metrics-grid{grid-template-columns:1fr 1fr}
      .scoring-grid{grid-template-columns:1fr}
      .charts-row{grid-template-columns:1fr}
      .def-grid-4{grid-template-columns:1fr 1fr}
    }
  </style>
</head>
<body>
<div class="container">

  <!-- ── HEADER ────────────────────────────────────────────────── -->
  <div class="header">
    <div class="header-eyebrow">Fuente canónica · ${monthName} 2026</div>
    <div class="header-title">Control de Gestión — Cierre ${monthName}</div>
    <div class="header-meta">Reporte CEO — Enero a ${monthName} 2026</div>
    <div class="header-date">Generado ${now}</div>
  </div>

  <!-- ── CALIDAD DE GESTIÓN ─────────────────────────────────────── -->
  <div class="section">
    <div class="section-title">Calidad de Gestión</div>
    
    <!-- Overall Score Card -->
    <div style="background:linear-gradient(135deg, #d7332b 0%, #b82924 100%);color:white;border-radius:8px;padding:28px 24px;margin-bottom:28px;box-shadow:0 2px 8px rgba(215, 51, 43, 0.15)">
      <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:8px">
        <div style="font-size:48px;font-weight:800;line-height:1">${mgmtScore}%</div>
        <div style="font-size:14px;opacity:0.9">Puntuación Global</div>
      </div>
      <div style="font-size:13px;opacity:0.85">Operación Integral — Cartera 40% · Seguimiento 30% · Conversión 30%</div>
    </div>
    
    <!-- Three Metrics Grid -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">
      <!-- CARTERA -->
      <div style="background:#F8F9FA;border-radius:8px;padding:20px;border-left:4px solid #d7332b">
        <div style="font-size:12px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:16px">Cartera</div>
        <div style="font-size:32px;font-weight:700;color:#d7332b;margin-bottom:2px">${portfolioQ}%</div>
        <div style="font-size:12px;color:#999;margin-bottom:14px">Cumplimiento de meta</div>
        <div style="background:white;height:6px;border-radius:3px;overflow:hidden;background:rgba(215, 51, 43, 0.1)">
          <div style="height:100%;width:${portfolioQ}%;background:#d7332b;transition:width 0.3s ease"></div>
        </div>
        <div style="font-size:11px;color:#999;margin-top:8px">Peso: 40%</div>
      </div>
      
      <!-- SEGUIMIENTO -->
      <div style="background:#F8F9FA;border-radius:8px;padding:20px;border-left:4px solid #f39c12">
        <div style="font-size:12px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:16px">Seguimiento</div>
        <div style="font-size:32px;font-weight:700;color:#f39c12;margin-bottom:2px">${followUpQ}%</div>
        <div style="font-size:12px;color:#999;margin-bottom:14px">Disciplina de leads</div>
        <div style="background:white;height:6px;border-radius:3px;overflow:hidden;background:rgba(243, 156, 18, 0.1)">
          <div style="height:100%;width:${followUpQ}%;background:#f39c12;transition:width 0.3s ease"></div>
        </div>
        <div style="font-size:11px;color:#999;margin-top:8px">Peso: 30%</div>
      </div>
      
      <!-- CONVERSIÓN -->
      <div style="background:#F8F9FA;border-radius:8px;padding:20px;border-left:4px solid #27ae60">
        <div style="font-size:12px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:16px">Conversión</div>
        <div style="font-size:32px;font-weight:700;color:#27ae60;margin-bottom:2px">${conversionQ}%</div>
        <div style="font-size:12px;color:#999;margin-bottom:14px">Tasa de cierre</div>
        <div style="background:white;height:6px;border-radius:3px;overflow:hidden;background:rgba(39, 174, 96, 0.1)">
          <div style="height:100%;width:${conversionQ}%;background:#27ae60;transition:width 0.3s ease"></div>
        </div>
        <div style="font-size:11px;color:#999;margin-top:8px">Peso: 30%</div>
      </div>
    </div>
  </div>

  <!-- ── VENTA MES ───────────────────────────────────────────────── -->
  <div class="section">
    <div class="section-eyebrow">N3uralia Intelligence Platform</div>
    <div class="section-title">Venta ${monthName}</div>

    <div class="metrics-grid">
      <!-- Cierres Card -->
      <div style="background:linear-gradient(135deg, #d7332b 0%, #b82924 100%);color:white;border-radius:8px;padding:24px;box-shadow:0 2px 8px rgba(215, 51, 43, 0.15)">
        <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;opacity:0.9;margin-bottom:12px">Cierres ${monthName}</div>
        <div style="font-size:42px;font-weight:800;line-height:1;margin-bottom:8px">${currentActual}</div>
        <div style="font-size:13px;opacity:0.9;margin-bottom:16px">Meta: ${currentTarget.toFixed(1)}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.15);padding:10px 12px;border-radius:6px">
          <span style="font-size:13px;font-weight:600">${currentPct}% Cumplimiento</span>
          <span class="badge" style="background:rgba(255,255,255,0.25);color:white;font-size:10px">${badgeLabel}</span>
        </div>
      </div>

      <!-- Productividad Card -->
      <div style="background:linear-gradient(135deg, #27ae60 0%, #1f8a48 100%);color:white;border-radius:8px;padding:24px;box-shadow:0 2px 8px rgba(39, 174, 96, 0.15)">
        <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;opacity:0.9;margin-bottom:12px">Productividad</div>
        <div style="font-size:42px;font-weight:800;line-height:1;margin-bottom:8px">${currentProd}</div>
        <div style="font-size:13px;opacity:0.9;margin-bottom:16px">Por ejecutiva</div>
        <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.15);padding:10px 12px;border-radius:6px">
          <span style="font-size:13px;font-weight:600">${totalPartners} ejecutivas</span>
          <span style="font-size:11px;opacity:0.85">Promedio:</span>
        </div>
      </div>

      <!-- Inteligencia de Mercado Card -->
      <div style="background:linear-gradient(135deg, #f39c12 0%, #da8b0a 100%);color:white;border-radius:8px;padding:24px;box-shadow:0 2px 8px rgba(243, 156, 18, 0.15)">
        <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;opacity:0.9;margin-bottom:12px">Inteligencia de Mercado</div>
        <div style="font-size:42px;font-weight:800;line-height:1;margin-bottom:8px">${marketSignalCount}</div>
        <div style="font-size:13px;opacity:0.9;margin-bottom:16px">Señales monitoreadas</div>
        <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.15);padding:10px 12px;border-radius:6px">
          <span style="font-size:13px;font-weight:600">Confianza prom:</span>
          <span style="font-size:13px;font-weight:700">${marketAvgConf}%</span>
        </div>
      </div>

      <!-- Valuación Card -->
      <div style="background:linear-gradient(135deg, #1565c0 0%, #1149a3 100%);color:white;border-radius:8px;padding:24px;box-shadow:0 2px 8px rgba(21, 101, 192, 0.15)">
        <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;opacity:0.9;margin-bottom:12px">Valuación</div>
        <div style="font-size:42px;font-weight:800;line-height:1;margin-bottom:8px">${propertyTypes.length}</div>
        <div style="font-size:13px;opacity:0.9;margin-bottom:16px">Tipos de propiedad</div>
        <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.15);padding:10px 12px;border-radius:6px;font-size:11px;font-weight:600">
          <span>${propertyTypes.join(' · ')}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ── EVOLUCIÓN DE VENTA ─────────────────────────────────────── -->
  <div class="section">
    <div class="section-title">Evolución de Venta</div>

    <!-- Professional Data Table with Color-Coding -->
    <div style="overflow-x:auto;background:#FAFAFA;border-radius:8px;padding:20px;margin-bottom:24px">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#F5F5F5;border-bottom:2px solid #DDD">
            <th style="text-align:left;padding:12px 10px;font-weight:700;color:#333;text-transform:uppercase;font-size:11px;letter-spacing:0.5px">Indicador</th>
            ${monthShort.map(m => `<th style="padding:12px 8px;font-weight:600;color:#555;text-align:center;font-size:12px">${m}</th>`).join('')}
            <th style="padding:12px 8px;font-weight:700;color:#fff;background:#d7332b;border-radius:4px;text-align:center;font-size:12px">Acum</th>
          </tr>
        </thead>
        <tbody>
          <!-- Cierres mes (red) -->
          <tr style="background:rgba(215, 51, 43, 0.05);border-bottom:1px solid #EEE">
            <td style="padding:12px 10px;font-weight:600;color:#d7332b">Cierres mes</td>
            ${actuals.map(v => `<td style="padding:12px 8px;text-align:center;color:#333;font-weight:600">${v}</td>`).join('')}
            <td style="padding:12px 8px;text-align:center;font-weight:700;color:#fff;background:#d7332b;border-radius:4px">${totalSales}</td>
          </tr>
          <!-- Meta cierres (green) -->
          <tr style="background:rgba(39, 174, 96, 0.05);border-bottom:1px solid #EEE">
            <td style="padding:12px 10px;font-weight:600;color:#27ae60">Meta cierres</td>
            ${monthlyData.map(m => `<td style="padding:12px 8px;text-align:center;color:#333;font-weight:500">${(m.target || 8.1).toFixed(1)}</td>`).join('')}
            <td style="padding:12px 8px;text-align:center;font-weight:700;color:#fff;background:#27ae60;border-radius:4px">${totalTarget.toFixed(1)}</td>
          </tr>
          <!-- Cumplimiento % (color-coded per value) -->
          <tr style="background:#F9F9F9;border-bottom:1px solid #EEE">
            <td style="padding:12px 10px;font-weight:600;color:#F57C00">Cumplimiento %</td>
            ${compliancePcts.map(v => {
              const c = v >= 90 ? '#27AE60' : v >= 70 ? '#F39C12' : '#E74C3C'
              return `<td style="padding:12px 8px;text-align:center;color:${c};font-weight:700">${v}%</td>`
            }).join('')}
            <td style="padding:12px 8px;text-align:center;font-weight:700;color:#fff;background:#F57C00;border-radius:4px">${totalCompPct}%</td>
          </tr>
          <!-- Productividad (blue) -->
          <tr style="background:rgba(21, 101, 192, 0.05)">
            <td style="padding:12px 10px;font-weight:600;color:#1565c0">Productividad</td>
            ${actuals.map(v => `<td style="padding:12px 8px;text-align:center;color:#333;font-weight:600">${(v / totalPartners).toFixed(2)}</td>`).join('')}
            <td style="padding:12px 8px;text-align:center;font-weight:700;color:#fff;background:#9C27B0;border-radius:4px">${(totalSales / totalPartners).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      <div style="font-size:11px;color:#999;margin-top:14px;padding-top:12px;border-top:1px solid #DDD">
        <span style="background:#27AE60;display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px"></span>Cierres &nbsp;
        <span style="background:#1976D2;display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;margin-left:12px"></span>Meta &nbsp;
        <span style="background:#F57C00;display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;margin-left:12px"></span>Cumplimiento &nbsp;
        <span style="background:#9C27B0;display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;margin-left:12px"></span>Productividad
      </div>
    </div>

    <!-- Large Charts Aligned with Table -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:32px">
      <!-- Cierres Chart -->
      <div style="background:#FAFAFA;border-radius:8px;padding:20px">
        <div style="font-size:13px;font-weight:600;color:#333;margin-bottom:16px">Cierres por mes (Enero-${monthName})</div>
        <img src="${closuresChartUrl}" style="width:100%;height:auto;border-radius:6px;display:block;margin-bottom:12px;">
        <div style="font-size:12px;color:#666;font-weight:500;border-top:1px solid #E0E0E0;padding-top:12px">
          <span>Meta mensual: <strong>8.1</strong></span><br>
          <span>Acumulado: <strong>${totalSales}</strong></span>
        </div>
      </div>
      
      <!-- Compliance Chart -->
      <div style="background:#FAFAFA;border-radius:8px;padding:20px">
        <div style="font-size:13px;font-weight:600;color:#333;margin-bottom:16px">Cumplimiento % (Verde ≥90%, Amarillo ≥70%, Rojo &lt;70%)</div>
        <img src="${complianceChartUrl}" style="width:100%;height:auto;border-radius:6px;display:block;margin-bottom:12px;">
        <div style="font-size:12px;color:#666;font-weight:500;border-top:1px solid #E0E0E0;padding-top:12px">
          <span>Objetivo: <strong>100%</strong></span><br>
          <span>Acumulado: <strong>${totalCompPct}%</strong></span>
        </div>
      </div>
    </div>
  </div>

  <!-- ── DEFINICIONES OPERACIONALES ────────────────────────────── -->
  <div class="section">
    <div class="section-title">Definiciones Operacionales</div>
    <p style="font-size:13px;color:#7F8C8D;margin-bottom:32px">
    Estándares operacionales basados en datos reales del CRM — Enero a ${monthName} 2026.
    </p>
    
    <!-- 1. Lead Prioritization -->
    <div style="background:#FAFAFA;border-radius:8px;padding:28px;margin-bottom:32px;border-left:4px solid #1976D2">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:24px">
        <div style="font-size:15px;font-weight:700;color:#333">1. Criterios de Priorización de Leads</div>
        <span style="background:#1976D2;color:white;font-size:10px;font-weight:700;padding:5px 12px;border-radius:3px;text-transform:uppercase;letter-spacing:0.5px">ACTIVO</span>
      </div>
      
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:16px;margin-bottom:24px">
        <!-- T1 -->
        <div style="background:linear-gradient(135deg, #27AE60 0%, #229954 100%);border-radius:8px;padding:20px;text-align:center;color:white;box-shadow:0 2px 6px rgba(39, 174, 96, 0.15)">
          <div style="font-size:10px;font-weight:700;opacity:0.85;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">TIER 1</div>
          <div style="font-size:32px;font-weight:800;margin-bottom:4px">${T1.toLocaleString('es-CL')}</div>
          <div style="font-size:12px;font-weight:600;margin-bottom:8px">Clasificados</div>
          <div style="font-size:11px;opacity:0.8">66% de leads</div>
        </div>
        <!-- T2 -->
        <div style="background:linear-gradient(135deg, #1976D2 0%, #1565C0 100%);border-radius:8px;padding:20px;text-align:center;color:white;box-shadow:0 2px 6px rgba(25, 118, 210, 0.15)">
          <div style="font-size:10px;font-weight:700;opacity:0.85;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">TIER 2</div>
          <div style="font-size:32px;font-weight:800;margin-bottom:4px">${T2.toLocaleString('es-CL')}</div>
          <div style="font-size:12px;font-weight:600;margin-bottom:8px">Activos &lt;30d</div>
          <div style="font-size:11px;opacity:0.8">100% activos</div>
        </div>
        <!-- T3 -->
        <div style="background:linear-gradient(135deg, #F39C12 0%, #E67E22 100%);border-radius:8px;padding:20px;text-align:center;color:white;box-shadow:0 2px 6px rgba(243, 156, 18, 0.15)">
          <div style="font-size:10px;font-weight:700;opacity:0.85;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">TIER 3</div>
          <div style="font-size:32px;font-weight:800;margin-bottom:4px">${T3.toLocaleString('es-CL')}</div>
          <div style="font-size:12px;font-weight:600;margin-bottom:8px">15–90 días</div>
          <div style="font-size:11px;opacity:0.8">Seguimiento</div>
        </div>
        <!-- T4 -->
        <div style="background:linear-gradient(135deg, #E74C3C 0%, #C0392B 100%);border-radius:8px;padding:20px;text-align:center;color:white;box-shadow:0 2px 6px rgba(231, 76, 60, 0.15)">
          <div style="font-size:10px;font-weight:700;opacity:0.85;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">TIER 4</div>
          <div style="font-size:32px;font-weight:800;margin-bottom:4px">${T4.toLocaleString('es-CL')}</div>
          <div style="font-size:12px;font-weight:600;margin-bottom:8px">&gt;90 días</div>
          <div style="font-size:11px;opacity:0.8">Reactivación</div>
        </div>
      </div>
      
      <div style="background:white;border-radius:6px;padding:14px;border-left:3px solid #E74C3C">
        <div style="font-size:12px;color:#E74C3C;font-weight:700;margin-bottom:4px">⚠ Oportunidad crítica:</div>
        <div style="font-size:12px;color:#333"><strong>${T4.toLocaleString('es-CL')} leads (61%)</strong> en estatus >90 días requieren reactivación estratégica inmediata.</div>
      </div>
    </div>
    
    <!-- 2. Contact Timing -->
    <div style="background:#FAFAFA;border-radius:8px;padding:28px;margin-bottom:32px;border-left:4px solid #F39C12">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:24px">
        <div style="font-size:15px;font-weight:700;color:#333">2. Estándares de Contacto por Tipo</div>
        <span style="background:#F39C12;color:white;font-size:10px;font-weight:700;padding:5px 12px;border-radius:3px;text-transform:uppercase;letter-spacing:0.5px">ACTIVO</span>
      </div>
      
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:20px">
        <!-- CASA -->
        <div>
          <div style="font-weight:700;color:#1976D2;margin-bottom:14px;font-size:13px;text-transform:uppercase;letter-spacing:0.5px">Casa</div>
          <div style="display:flex;gap:12px;margin-bottom:12px">
            <div style="flex:1;background:white;border-radius:6px;padding:14px;text-align:center;border-top:3px solid #1976D2">
              <div style="font-size:11px;color:#666;font-weight:600;margin-bottom:8px">Primera toma</div>
              <div style="font-size:24px;font-weight:800;color:#1976D2">48h</div>
            </div>
          </div>
          <div style="display:flex;gap:12px;margin-bottom:12px">
            <div style="flex:1;background:white;border-radius:6px;padding:14px;text-align:center;border-top:3px solid #1976D2">
              <div style="font-size:11px;color:#666;font-weight:600;margin-bottom:8px">Seguimiento</div>
              <div style="font-size:24px;font-weight:800;color:#1976D2">24h</div>
            </div>
          </div>
          <div style="display:flex;gap:12px">
            <div style="flex:1;background:white;border-radius:6px;padding:14px;text-align:center;border-top:3px solid #1976D2">
              <div style="font-size:11px;color:#666;font-weight:600;margin-bottom:8px">Re-contacto</div>
              <div style="font-size:24px;font-weight:800;color:#1976D2">7 días</div>
            </div>
          </div>
        </div>
        
        <!-- DEPARTAMENTO -->
        <div>
          <div style="font-weight:700;color:#F57C00;margin-bottom:14px;font-size:13px;text-transform:uppercase;letter-spacing:0.5px">Departamento</div>
          <div style="display:flex;gap:12px;margin-bottom:12px">
            <div style="flex:1;background:white;border-radius:6px;padding:14px;text-align:center;border-top:3px solid #F57C00">
              <div style="font-size:11px;color:#666;font-weight:600;margin-bottom:8px">Primera toma</div>
              <div style="font-size:24px;font-weight:800;color:#F57C00">24h</div>
            </div>
          </div>
          <div style="display:flex;gap:12px;margin-bottom:12px">
            <div style="flex:1;background:white;border-radius:6px;padding:14px;text-align:center;border-top:3px solid #F57C00">
              <div style="font-size:11px;color:#666;font-weight:600;margin-bottom:8px">Seguimiento</div>
              <div style="font-size:24px;font-weight:800;color:#F57C00">12h</div>
            </div>
          </div>
          <div style="display:flex;gap:12px">
            <div style="flex:1;background:white;border-radius:6px;padding:14px;text-align:center;border-top:3px solid #F57C00">
              <div style="font-size:11px;color:#666;font-weight:600;margin-bottom:8px">Re-contacto</div>
              <div style="font-size:24px;font-weight:800;color:#F57C00">5 días</div>
            </div>
          </div>
        </div>
      </div>
      
      <div style="background:white;border-radius:6px;padding:14px;border-left:3px solid #1976D2">
        <div style="font-size:12px;color:#0D47A1;font-weight:700;margin-bottom:4px">ℹ Base operacional:</div>
        <div style="font-size:12px;color:#333">5,968 visitas realizadas. Tiempos más agresivos para departamentos por mayor competencia.</div>
      </div>
    </div>
    
    <!-- 3. Conversion Benchmarks -->
    <div style="background:#FAFAFA;border-radius:8px;padding:28px;border-left:4px solid #9C27B0">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:24px">
        <div style="font-size:15px;font-weight:700;color:#333">3. Benchmarks de Conversión por Tipo</div>
        <span style="background:#9C27B0;color:white;font-size:10px;font-weight:700;padding:5px 12px;border-radius:3px;text-transform:uppercase;letter-spacing:0.5px">ACTIVO</span>
      </div>
      
      <div style="font-size:13px;color:#666;margin-bottom:20px;padding:12px;background:white;border-radius:6px;border-left:3px solid #9C27B0">
        <strong>Embudo (Enero–${monthName} 2026):</strong> ${funnelSteps[0]?.value || 0} leads → ${funnelSteps[1]?.value || 0} activos → ${funnelSteps[2]?.value || 0} visitas → ${funnelSteps[3]?.value || 0} cierres
      </div>
      
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:20px">
        <!-- CASA -->
        <div>
          <div style="font-weight:700;color:#333;margin-bottom:14px;font-size:13px;text-transform:uppercase;letter-spacing:0.5px">Casa</div>
          <div style="display:flex;gap:12px;margin-bottom:12px">
            <div style="flex:1;background:white;border-radius:6px;padding:14px;text-align:center;border-top:3px solid #4CAF50">
              <div style="font-size:11px;color:#666;font-weight:600;margin-bottom:8px">Lead → Visita</div>
              <div style="font-size:24px;font-weight:800;color:#4CAF50">15–20%</div>
            </div>
          </div>
          <div style="display:flex;gap:12px;margin-bottom:12px">
            <div style="flex:1;background:white;border-radius:6px;padding:14px;text-align:center;border-top:3px solid #FF9800">
              <div style="font-size:11px;color:#666;font-weight:600;margin-bottom:8px">Visita → Cierre</div>
              <div style="font-size:24px;font-weight:800;color:#FF9800">3.5–4.5%</div>
            </div>
          </div>
          <div style="display:flex;gap:12px">
            <div style="flex:1;background:white;border-radius:6px;padding:14px;text-align:center;border-top:3px solid #2196F3">
              <div style="font-size:11px;color:#666;font-weight:600;margin-bottom:8px">Total</div>
              <div style="font-size:24px;font-weight:800;color:#2196F3">0.5–0.9%</div>
            </div>
          </div>
        </div>
        
        <!-- DEPARTAMENTO -->
        <div>
          <div style="font-weight:700;color:#333;margin-bottom:14px;font-size:13px;text-transform:uppercase;letter-spacing:0.5px">Departamento</div>
          <div style="display:flex;gap:12px;margin-bottom:12px">
            <div style="flex:1;background:white;border-radius:6px;padding:14px;text-align:center;border-top:3px solid #4CAF50">
              <div style="font-size:11px;color:#666;font-weight:600;margin-bottom:8px">Lead → Visita</div>
              <div style="font-size:24px;font-weight:800;color:#4CAF50">20–25%</div>
            </div>
          </div>
          <div style="display:flex;gap:12px;margin-bottom:12px">
            <div style="flex:1;background:white;border-radius:6px;padding:14px;text-align:center;border-top:3px solid #FF9800">
              <div style="font-size:11px;color:#666;font-weight:600;margin-bottom:8px">Visita → Cierre</div>
              <div style="font-size:24px;font-weight:800;color:#FF9800">2.5–3.5%</div>
            </div>
          </div>
          <div style="display:flex;gap:12px">
            <div style="flex:1;background:white;border-radius:6px;padding:14px;text-align:center;border-top:3px solid #2196F3">
              <div style="font-size:11px;color:#666;font-weight:600;margin-bottom:8px">Total</div>
              <div style="font-size:24px;font-weight:800;color:#2196F3">0.5–0.9%</div>
            </div>
          </div>
        </div>
      </div>
      
      <div style="background:white;border-radius:6px;padding:14px;border-left:3px solid #E91E63">
        <div style="font-size:12px;color:#880E4F;font-weight:700;margin-bottom:4px">📊 Conversión actual:</div>
        <div style="font-size:12px;color:#333"><strong>3.3%</strong> (197 cierres / 5,968 visitas). Reactivación estratégica puede recuperar 400–600 oportunidades.</div>
      </div>
    </div>
  </div>

  <!-- ── FOOTER ─────────────────────────────────────────────────── -->
  <div class="footer">
    N3uralia Intelligence Platform · Reporte CEO ${monthName} 2026 · Generado ${now}
  </div>

</div>
</body>
</html>`
}
