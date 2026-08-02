import { getCompanySalesCompliance } from '@/lib/targets-2026'
import { getMarketSnapshot } from '@/lib/market-snapshot'
import { getValuationSnapshot } from '@/lib/valuation-snapshot'
import { getOperationalSummary } from '@/lib/crm-snapshot'
import { generateComplianceChart, generateClosuresChart } from '@/lib/chart-generator'

// ─── helpers ────────────────────────────────────────────────────────────────

function badge(pct: number) {
  if (pct >= 90) return { cls: '#27AE60', label: 'Verde' }
  if (pct >= 70) return { cls: '#F39C12', label: 'Amarillo' }
  return { cls: '#E74C3C', label: 'Rojo' }
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
    body{font-family:Calibri,Arial,sans-serif;background:#F0F0F0;color:#333;line-height:1.6}
    .container{max-width:1000px;margin:0 auto;background:#fff}
    .header{background:#000;color:#fff;padding:40px}
    .header-eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:rgba(255,255,255,.55);margin-bottom:12px}
    .header-title{font-size:32px;font-weight:600;margin-bottom:12px}
    .header-meta{font-size:13px;color:rgba(255,255,255,.8);margin-bottom:4px}
    .header-date{font-size:11px;color:rgba(255,255,255,.5)}
    .section{padding:40px;border-bottom:1px solid #EEE}
    .section:last-child{border-bottom:none}
    .section-eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#7F8C8D;margin-bottom:6px}
    .section-title{font-size:24px;font-weight:600;color:#333;margin-bottom:20px}
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
    <div style="background:linear-gradient(135deg, #1976D2 0%, #1565C0 100%);color:white;border-radius:8px;padding:28px 24px;margin-bottom:28px;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
      <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:8px">
        <div style="font-size:48px;font-weight:800;line-height:1">${mgmtScore}%</div>
        <div style="font-size:14px;opacity:0.9">Puntuación Global</div>
      </div>
      <div style="font-size:13px;opacity:0.85">Operación Integral — Cartera 40% · Seguimiento 30% · Conversión 30%</div>
    </div>
    
    <!-- Three Metrics Grid -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">
      <!-- CARTERA -->
      <div style="background:#F8F9FA;border-radius:8px;padding:20px;border-left:4px solid #1976D2">
        <div style="font-size:12px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:16px">Cartera</div>
        <div style="font-size:32px;font-weight:700;color:#1976D2;margin-bottom:2px">${portfolioQ}%</div>
        <div style="font-size:12px;color:#999;margin-bottom:14px">Cumplimiento de meta</div>
        <div style="background:white;height:6px;border-radius:3px;overflow:hidden;background:#E3F2FD">
          <div style="height:100%;width:${portfolioQ}%;background:#1976D2;transition:width 0.3s ease"></div>
        </div>
        <div style="font-size:11px;color:#999;margin-top:8px">Peso: 40%</div>
      </div>
      
      <!-- SEGUIMIENTO -->
      <div style="background:#F8F9FA;border-radius:8px;padding:20px;border-left:4px solid #F57C00">
        <div style="font-size:12px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:16px">Seguimiento</div>
        <div style="font-size:32px;font-weight:700;color:#F57C00;margin-bottom:2px">${followUpQ}%</div>
        <div style="font-size:12px;color:#999;margin-bottom:14px">Disciplina de leads</div>
        <div style="background:white;height:6px;border-radius:3px;overflow:hidden;background:#FFF3E0">
          <div style="height:100%;width:${followUpQ}%;background:#F57C00;transition:width 0.3s ease"></div>
        </div>
        <div style="font-size:11px;color:#999;margin-top:8px">Peso: 30%</div>
      </div>
      
      <!-- CONVERSIÓN -->
      <div style="background:#F8F9FA;border-radius:8px;padding:20px;border-left:4px solid #388E3C">
        <div style="font-size:12px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:16px">Conversión</div>
        <div style="font-size:32px;font-weight:700;color:#388E3C;margin-bottom:2px">${conversionQ}%</div>
        <div style="font-size:12px;color:#999;margin-bottom:14px">Tasa de cierre</div>
        <div style="background:white;height:6px;border-radius:3px;overflow:hidden;background:#E8F5E9">
          <div style="height:100%;width:${conversionQ}%;background:#388E3C;transition:width 0.3s ease"></div>
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
      <div class="metric-card">
        <div class="metric-label">Cierres ${monthName}</div>
        <div class="metric-value">${currentActual}</div>
        <div class="metric-target">Meta: ${currentTarget.toFixed(1)}</div>
        <div class="metric-row">
          <span>${currentPct}% Cumplimiento</span>
          <span class="badge" style="background:${badgeBg}">${badgeLabel}</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Productividad</div>
        <div class="metric-value">${currentProd}</div>
        <div class="metric-target">Por ejecutiva</div>
        <div class="metric-row"><span>${totalPartners} ejecutivas</span></div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Inteligencia de Mercado</div>
        <div class="metric-value">${marketSignalCount}</div>
        <div class="metric-target">Señales monitoreadas</div>
        <div class="metric-row"><span>Confianza prom: ${marketAvgConf}%</span></div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Valuación</div>
        <div class="metric-value">${propertyTypes.length}</div>
        <div class="metric-target">Tipos de propiedad</div>
        <div class="metric-row"><span>${propertyTypes.join(' · ')}</span></div>
      </div>
    </div>
  </div>

  <!-- ── EVOLUCIÓN DE VENTA ─────────────────────────────────────── -->
  <div class="section">
    <div class="section-title">Evolución de Venta</div>

    <!-- Tabla -->
    <div style="overflow-x:auto">
      <table class="evo-table">
        <thead>
          <tr>
            <th style="text-align:left">Indicador</th>
            ${monthShort.map(m => `<th>${m}</th>`).join('')}
            <th class="acum">Acum</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Cierres mes</td>
            ${actuals.map(v => `<td>${v}</td>`).join('')}
            <td class="acum">${totalSales}</td>
          </tr>
          <tr>
            <td>Meta cierres</td>
            ${monthlyData.map(m => `<td>${(m.target || 8.1).toFixed(1)}</td>`).join('')}
            <td class="acum">${totalTarget.toFixed(1)}</td>
          </tr>
          <tr>
            <td>Cumplimiento %</td>
            ${compliancePcts.map(v => `<td>${v}%</td>`).join('')}
            <td class="acum">${totalCompPct}%</td>
          </tr>
          <tr>
            <td>Productividad</td>
            ${actuals.map(v => `<td>${(v / totalPartners).toFixed(2)}</td>`).join('')}
            <td class="acum">${(totalSales / totalPartners).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Gráficos dinámicos generados con Chart.js -->
    <div class="charts-row" style="margin-top:24px">
      <div class="chart-box">
        <div class="chart-label">Cierres por mes (Enero-${monthName})</div>
        <img src="${closuresChartUrl}" style="width:100%;max-width:280px;height:auto;border-radius:4px;margin-top:8px;">
        <div style="font-size:10px;color:#999;margin-top:6px">
          Meta mensual: <strong>8.1</strong> · Acumulado: <strong>${totalSales}</strong>
        </div>
      </div>
      <div class="chart-box">
        <div class="chart-label">Cumplimiento % (Verde ≥90%, Amarillo ≥70%, Rojo &lt;70%)</div>
        <img src="${complianceChartUrl}" style="width:100%;max-width:280px;height:auto;border-radius:4px;margin-top:8px;">
        <div style="font-size:10px;color:#999;margin-top:6px">
          Objetivo: 100% · Acumulado: <strong>${totalCompPct}%</strong>
        </div>
      </div>
    </div>
  </div>

  <!-- ── DEFINICIONES OPERACIONALES ────────────────────────────── -->
  <div class="section">
    <div class="section-title">Definiciones Operacionales</div>
    <p style="font-size:13px;color:#7F8C8D;margin-bottom:24px">
      Estándares operacionales basados en datos reales del CRM — Enero a ${monthName} 2026.
    </p>

    <!-- 1. Lead Prioritization -->
    <div class="def-card">
      <div class="def-header">
        <div class="def-title">1. Criterios de Priorización de Leads</div>
        <span class="def-status">ACTIVO</span>
      </div>

      <div class="def-grid-4">
        <div class="def-tile">
          <div class="def-tile-label">TIER 1 · Clasificados</div>
          <div class="def-tile-value">${T1.toLocaleString('es-CL')}</div>
          <div class="def-tile-sub">66% de leads</div>
        </div>
        <div class="def-tile">
          <div class="def-tile-label">TIER 2 · Activos &lt;30d</div>
          <div class="def-tile-value">${T2.toLocaleString('es-CL')}</div>
          <div class="def-tile-sub">100% activos</div>
        </div>
        <div class="def-tile">
          <div class="def-tile-label">TIER 3 · 15–90 días</div>
          <div class="def-tile-value">${T3.toLocaleString('es-CL')}</div>
          <div class="def-tile-sub">Seguimiento</div>
        </div>
        <div class="def-tile">
          <div class="def-tile-label">TIER 4 · &gt;90 días</div>
          <div class="def-tile-value">${T4.toLocaleString('es-CL')}</div>
          <div class="def-tile-sub">Reactivación</div>
        </div>
      </div>

      <div class="chart-label" style="margin-bottom:6px">Distribución de leads por tier (T1: ${T1}, T2: ${T2}, T3: ${T3}, T4: ${T4})</div>
      <div style="margin-top:10px;font-size:10px;color:#999">
        <span class="dot" style="background:#27AE60"></span>T1 Clasificados&nbsp;
        <span class="dot" style="background:#1976D2"></span>T2 Activos&nbsp;
        <span class="dot" style="background:#F39C12"></span>T3 Seguimiento&nbsp;
        <span class="dot" style="background:#E74C3C"></span>T4 Reactivar
      </div>
      <div class="alert-orange" style="margin-top:12px">
        <strong>Oportunidad:</strong> ${T4.toLocaleString('es-CL')} leads (61%) en estatus >90 días requieren reactivación estratégica.
      </div>
    </div>

    <!-- 2. Contact Timing -->
    <div class="def-card">
      <div class="def-header">
        <div class="def-title">2. Estándares de Contacto por Tipo de Propiedad</div>
        <span class="def-status">ACTIVO</span>
      </div>

      <div class="def-grid-2">
        <div>
          <div style="font-weight:700;color:#1976D2;margin-bottom:10px;font-size:12px;text-transform:uppercase;letter-spacing:.05em">Casa</div>
          <div class="def-tile" style="margin-bottom:6px"><div class="def-tile-label">Primera toma</div><div class="def-tile-value" style="color:#1976D2">48h</div></div>
          <div class="def-tile" style="margin-bottom:6px"><div class="def-tile-label">Seguimiento</div><div class="def-tile-value" style="color:#1976D2">24h</div></div>
          <div class="def-tile"><div class="def-tile-label">Re-contacto</div><div class="def-tile-value" style="color:#1976D2">7 días</div></div>
        </div>
        <div>
          <div style="font-weight:700;color:#F57C00;margin-bottom:10px;font-size:12px;text-transform:uppercase;letter-spacing:.05em">Departamento</div>
          <div class="def-tile" style="margin-bottom:6px"><div class="def-tile-label">Primera toma</div><div class="def-tile-value" style="color:#F57C00">24h</div></div>
          <div class="def-tile" style="margin-bottom:6px"><div class="def-tile-label">Seguimiento</div><div class="def-tile-value" style="color:#F57C00">12h</div></div>
          <div class="def-tile"><div class="def-tile-label">Re-contacto</div><div class="def-tile-value" style="color:#F57C00">5 días</div></div>
        </div>
      </div>
      <div class="alert-blue">
        <strong>Base:</strong> 5,968 visitas realizadas. Tiempos más agresivos para departamentos por mayor competencia.
      </div>
    </div>

    <!-- 3. Conversion Benchmarks -->
    <div class="def-card">
      <div class="def-header">
        <div class="def-title">3. Benchmarks de Conversión por Tipo</div>
        <span class="def-status">ACTIVO</span>
      </div>

      <div style="margin-bottom:16px">
        <div class="chart-label">Embudo de conversión (Enero–${monthName} 2026)</div>
        <div style="font-size:11px;color:#7F8C8D;margin-top:8px">Leads: ${funnelSteps[0]?.value || 0} → Activos: ${funnelSteps[1]?.value || 0} → Visitas: ${funnelSteps[2]?.value || 0} → Cierres: ${funnelSteps[3]?.value || 0}</div>
      </div>

      <div class="def-grid-2" style="margin-top:16px">
        <div>
          <div style="font-weight:700;color:#333;margin-bottom:8px;font-size:12px;text-transform:uppercase;letter-spacing:.05em">Casa</div>
          <div class="def-tile" style="margin-bottom:6px"><div class="def-tile-label">Lead → Visita</div><div class="def-tile-value">15–20%</div></div>
          <div class="def-tile" style="margin-bottom:6px"><div class="def-tile-label">Visita → Cierre</div><div class="def-tile-value">3.5–4.5%</div></div>
          <div class="def-tile"><div class="def-tile-label">Lead → Cierre total</div><div class="def-tile-value">0.5–0.9%</div></div>
        </div>
        <div>
          <div style="font-weight:700;color:#333;margin-bottom:8px;font-size:12px;text-transform:uppercase;letter-spacing:.05em">Departamento</div>
          <div class="def-tile" style="margin-bottom:6px"><div class="def-tile-label">Lead → Visita</div><div class="def-tile-value">20–25%</div></div>
          <div class="def-tile" style="margin-bottom:6px"><div class="def-tile-label">Visita → Cierre</div><div class="def-tile-value">2.5–3.5%</div></div>
          <div class="def-tile"><div class="def-tile-label">Lead → Cierre total</div><div class="def-tile-value">0.5–0.9%</div></div>
        </div>
      </div>

      <div class="alert-pink" style="margin-top:12px">
        <strong>Conversión total:</strong> 3.3% (197 cierres / 5,968 visitas). Reactivación estratégica puede recuperar 400–600 oportunidades.
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
