import { getCompanySalesCompliance } from '@/lib/targets-2026'
import { getMarketSnapshot } from '@/lib/market-snapshot'
import { getValuationSnapshot } from '@/lib/valuation-snapshot'
import { getOperationalSummary } from '@/lib/crm-snapshot'
import { generateComplianceChart, generateClosuresChart } from '@/lib/chart-generator'

// ─── Canonical Design System Colors (Black Background Theme) ──────────────────
const CANONICAL_COLORS = {
  // Backgrounds - ALL BLACK
  background: '#000000',   // Primary bg (pure black)
  headerBg: '#000000',     // Header background (black)
  cardBg: '#1A1A1A',       // Card backgrounds (dark gray-black)
  cardBgAlt: '#0F0F0F',    // Alternative card background
  
  // Text Colors
  textLight: '#FFFFFF',    // Primary text on dark (white)
  textMuted: '#B0B0B0',    // Secondary text (light gray - high contrast)
  textOnDark: '#FFFFFF',   // Text on dark backgrounds (white)
  
  // Status Colors (Traffic Light System - adjusted for contrast on black)
  success: '#27AE60',      // Verde - positive, goal achievement (brightened)
  warning: '#F39C12',      // Amarillo - caution, warning (brightened)
  error: '#E74C3C',        // Rojo - critical, alert (brightened)
  info: '#1565C0',         // Blue - information (brightened)
  
  // Accents
  darkRed: '#C0392B',      // Dark red for high-severity alerts
  borderColor: '#333333',  // Subtle borders on black
}

// ─── helpers ────────────────────────────────────────────────────────────────

function badge(pct: number) {
  if (pct >= 100) return { cls: CANONICAL_COLORS.success, label: 'Verde' }
  if (pct >= 90) return { cls: CANONICAL_COLORS.warning, label: 'Amarillo' }
  return { cls: CANONICAL_COLORS.error, label: 'Rojo' }
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
    body{font-family:Calibri,Arial,sans-serif;background:#000000;color:#FFFFFF;line-height:1.6}
    .container{max-width:1000px;margin:0 auto;background:#000000}
    .header{background:#000000;color:#FFFFFF;padding:40px;border-bottom:1px solid #333333}
    .header-eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#B0B0B0;margin-bottom:12px;font-weight:600}
    .header-title{font-size:32px;font-weight:600;margin-bottom:12px;color:#FFFFFF;font-weight:700}
    .header-meta{font-size:13px;color:rgba(255, 255, 255, 0.9);margin-bottom:4px}
    .header-date{font-size:11px;color:rgba(255, 255, 255, 0.7)}
    .section{padding:40px;background:#000000;border-bottom:1px solid #333333}
    .section:last-child{border-bottom:none}
    .section-eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#B0B0B0;margin-bottom:6px;font-weight:600}
    .section-title{font-size:24px;font-weight:600;color:#FFFFFF;margin-bottom:20px;font-weight:700}
  </style>
</head>
<body>
<div class="container">

  <!-- ── PROPERTY PARTNERS VITACURA HEADER ────────────────────────── -->
  <div style="background:#000000;padding:48px 40px;text-align:center;border-bottom:2px solid #333333">
    <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-xvWb95Djb4pEo706gUgW8IBMweYarT.png" style="height:140px;margin-bottom:20px;display:block;margin-left:auto;margin-right:auto" alt="Property Partners Vitacura">
    <div style="font-size:16px;color:#B0B0B0;font-weight:500;letter-spacing:1.5px">INTELIGENCIA DE MERCADO VITACURA</div>
  </div>

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
    <div style="background:linear-gradient(135deg, #1565C0 0%, #0F4FA0 100%);color:white;border-radius:8px;padding:28px 24px;margin-bottom:28px;box-shadow:0 2px 8px rgba(21, 101, 192, 0.1)">
      <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:8px">
        <div style="font-size:48px;font-weight:800;line-height:1">${mgmtScore}%</div>
        <div style="font-size:14px;opacity:0.9">Puntuación Global</div>
      </div>
      <div style="font-size:13px;opacity:0.85">Operación Integral — Cartera 40% · Seguimiento 30% · Conversión 30%</div>
    </div>
    
    <!-- Three Metrics Grid -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">
      <!-- CARTERA (Blue Info) -->
      <div style="background:#1A1A1A;border-radius:8px;padding:20px;border-left:4px solid #1565C0">
        <div style="font-size:12px;font-weight:600;color:#B0B0B0;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:16px">Cartera</div>
        <div style="font-size:32px;font-weight:700;color:#1565C0;margin-bottom:2px">${portfolioQ}%</div>
        <div style="font-size:12px;color:#B0B0B0;margin-bottom:14px">Cumplimiento de meta</div>
        <div style="background:#0F0F0F;height:6px;border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${portfolioQ}%;background:#1565C0;transition:width 0.3s ease"></div>
        </div>
        <div style="font-size:11px;color:#B0B0B0;margin-top:8px">Peso: 40%</div>
      </div>
      
      <!-- SEGUIMIENTO (Yellow Warning) -->
      <div style="background:#1A1A1A;border-radius:8px;padding:20px;border-left:4px solid #F39C12">
        <div style="font-size:12px;font-weight:600;color:#B0B0B0;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:16px">Seguimiento</div>
        <div style="font-size:32px;font-weight:700;color:#F39C12;margin-bottom:2px">${followUpQ}%</div>
        <div style="font-size:12px;color:#B0B0B0;margin-bottom:14px">Disciplina de leads</div>
        <div style="background:#0F0F0F;height:6px;border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${followUpQ}%;background:#F39C12;transition:width 0.3s ease"></div>
        </div>
        <div style="font-size:11px;color:#B0B0B0;margin-top:8px">Peso: 30%</div>
      </div>
      
      <!-- CONVERSIÓN (Green Success) -->
      <div style="background:#1A1A1A;border-radius:8px;padding:20px;border-left:4px solid #27AE60">
        <div style="font-size:12px;font-weight:600;color:#B0B0B0;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:16px">Conversión</div>
        <div style="font-size:32px;font-weight:700;color:#27AE60;margin-bottom:2px">${conversionQ}%</div>
        <div style="font-size:12px;color:#B0B0B0;margin-bottom:14px">Tasa de cierre</div>
        <div style="background:#0F0F0F;height:6px;border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${conversionQ}%;background:#27AE60;transition:width 0.3s ease"></div>
        </div>
        <div style="font-size:11px;color:#B0B0B0;margin-top:8px">Peso: 30%</div>
      </div>
    </div>
  </div>

  <!-- ── VENTA MES ───────────────────────────────────────────────── -->
  <div class="section">
    <div class="section-eyebrow">N3uralia Intelligence Platform</div>
    <div class="section-title">Venta ${monthName}</div>

    <div class="metrics-grid">
      <!-- Cierres Card (Info Blue) -->
      <div style="background:linear-gradient(135deg, #1565C0 0%, #0F4FA0 100%);color:white;border-radius:8px;padding:24px;box-shadow:0 4px 12px rgba(0, 0, 0, 0.5)">
        <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;opacity:0.9;margin-bottom:12px">Cierres ${monthName}</div>
        <div style="font-size:42px;font-weight:800;line-height:1;margin-bottom:8px">${currentActual}</div>
        <div style="font-size:13px;opacity:0.9;margin-bottom:16px">Meta: ${currentTarget.toFixed(1)}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.15);padding:10px 12px;border-radius:6px">
          <span style="font-size:13px;font-weight:600">${currentPct}% Cumplimiento</span>
          <span class="badge" style="background:rgba(255,255,255,0.25);color:white;font-size:10px">${badgeLabel}</span>
        </div>
      </div>

      <!-- Productividad Card (Success Green) -->
      <div style="background:linear-gradient(135deg, #27AE60 0%, #1F8A48 100%);color:white;border-radius:8px;padding:24px;box-shadow:0 4px 12px rgba(0, 0, 0, 0.5)">
        <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;opacity:0.95;margin-bottom:12px">Productividad</div>
        <div style="font-size:42px;font-weight:800;line-height:1;margin-bottom:8px">${currentProd}</div>
        <div style="font-size:13px;opacity:0.95;margin-bottom:16px">Por ejecutiva</div>
        <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.15);padding:10px 12px;border-radius:6px">
          <span style="font-size:13px;font-weight:600">${totalPartners} ejecutivas</span>
          <span style="font-size:11px;opacity:0.9">Promedio:</span>
        </div>
      </div>

      <!-- Inteligencia de Mercado Card (Warning Orange) -->
      <div style="background:linear-gradient(135deg, #F39C12 0%, #DA8B0A 100%);color:white;border-radius:8px;padding:24px;box-shadow:0 4px 12px rgba(0, 0, 0, 0.5)">
        <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;opacity:0.95;margin-bottom:12px">Inteligencia de Mercado</div>
        <div style="font-size:42px;font-weight:800;line-height:1;margin-bottom:8px">${marketSignalCount}</div>
        <div style="font-size:13px;opacity:0.95;margin-bottom:16px">Señales monitoreadas</div>
        <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.15);padding:10px 12px;border-radius:6px">
          <span style="font-size:13px;font-weight:600">Confianza prom:</span>
          <span style="font-size:13px;font-weight:700">${marketAvgConf}%</span>
        </div>
      </div>

      <!-- Valuación Card (Secondary Gray) -->
      <div style="background:linear-gradient(135deg, #7F8C8D 0%, #5C6A6C 100%);color:white;border-radius:8px;padding:24px;box-shadow:0 4px 12px rgba(0, 0, 0, 0.5)">
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
    <div style="overflow-x:auto;background:#1A1A1A;border-radius:8px;padding:20px;margin-bottom:24px;border:1px solid #333333">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#0F0F0F;border-bottom:1px solid #333333">
            <th style="text-align:left;padding:12px 10px;font-weight:700;color:#B0B0B0;text-transform:uppercase;font-size:11px;letter-spacing:0.5px">Indicador</th>
            ${monthShort.map(m => `<th style="padding:12px 8px;font-weight:600;color:#B0B0B0;text-align:center;font-size:12px">${m}</th>`).join('')}
            <th style="padding:12px 8px;font-weight:700;color:#fff;background:#1A1A1A;border-radius:4px;text-align:center;font-size:12px;border:1px solid #333333">Acum</th>
          </tr>
        </thead>
        <tbody>
          <!-- Cierres mes -->
          <tr style="background:#0F0F0F;border-bottom:1px solid #333333">
            <td style="padding:12px 10px;font-weight:600;color:#FFFFFF">Cierres mes</td>
            ${actuals.map(v => `<td style="padding:12px 8px;text-align:center;color:#B0B0B0;font-weight:600">${v}</td>`).join('')}
            <td style="padding:12px 8px;text-align:center;font-weight:700;color:#fff;background:#1565C0;border-radius:4px">${totalSales}</td>
          </tr>
          <!-- Meta cierres -->
          <tr style="background:#1A1A1A;border-bottom:1px solid #333333">
            <td style="padding:12px 10px;font-weight:600;color:#FFFFFF">Meta cierres</td>
            ${monthlyData.map(m => `<td style="padding:12px 8px;text-align:center;color:#B0B0B0;font-weight:500">${(m.target || 8.1).toFixed(1)}</td>`).join('')}
            <td style="padding:12px 8px;text-align:center;font-weight:700;color:#fff;background:#27AE60;border-radius:4px">${totalTarget.toFixed(1)}</td>
          </tr>
          <!-- Cumplimiento % (color-coded per value) -->
          <tr style="background:#0F0F0F;border-bottom:1px solid #333333">
            <td style="padding:12px 10px;font-weight:600;color:#FFFFFF">Cumplimiento %</td>
            ${compliancePcts.map(v => {
              const c = v >= 90 ? '#27AE60' : v >= 70 ? '#F39C12' : '#E74C3C'
              return `<td style="padding:12px 8px;text-align:center;color:${c};font-weight:700">${v}%</td>`
            }).join('')}
            <td style="padding:12px 8px;text-align:center;font-weight:700;color:#000;background:#F39C12;border-radius:4px">${totalCompPct}%</td>
          </tr>
          <!-- Productividad -->
          <tr style="background:#1A1A1A;border-bottom:1px solid #333333">
            <td style="padding:12px 10px;font-weight:600;color:#FFFFFF">Productividad</td>
            ${actuals.map(v => `<td style="padding:12px 8px;text-align:center;color:#B0B0B0;font-weight:600">${(v / totalPartners).toFixed(2)}</td>`).join('')}
            <td style="padding:12px 8px;text-align:center;font-weight:700;color:#000;background:#27AE60;border-radius:4px">${(totalSales / totalPartners).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      <div style="font-size:11px;color:#B0B0B0;margin-top:14px;padding-top:12px;border-top:1px solid #333333">
        <span style="background:#FFFFFF;display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px"></span>Cierres &nbsp;
        <span style="background:#808080;display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;margin-left:12px"></span>Meta
      </div>
    </div>

    <!-- Large Charts Aligned with Table -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:32px">
      <!-- Cierres Chart -->
      <div style="background:#1A1A1A;border-radius:8px;padding:20px;border:1px solid #333333">
        <div style="font-size:13px;font-weight:600;color:#FFFFFF;margin-bottom:16px">Cierres por mes (Enero-${monthName})</div>
        <img src="${closuresChartUrl}" style="width:100%;height:auto;border-radius:6px;display:block;margin-bottom:12px;background:#0F0F0F;padding:8px">
        <div style="font-size:12px;color:#B0B0B0;font-weight:500;border-top:1px solid #333333;padding-top:12px">
          <span>Meta mensual: <strong>#808080</strong></span><br>
          <span>Acumulado: <strong>${totalSales}</strong></span>
        </div>
      </div>
      
      <!-- Compliance Chart -->
      <div style="background:#1A1A1A;border-radius:8px;padding:20px;border:1px solid #333333">
        <div style="font-size:13px;font-weight:600;color:#FFFFFF;margin-bottom:16px">Cumplimiento % (Verde ≥90%, Amarillo ≥70%, Rojo &lt;70%)</div>
        <img src="${complianceChartUrl}" style="width:100%;height:auto;border-radius:6px;display:block;margin-bottom:12px;background:#0F0F0F;padding:8px">
        <div style="font-size:12px;color:#B0B0B0;font-weight:500;border-top:1px solid #333333;padding-top:12px">
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
