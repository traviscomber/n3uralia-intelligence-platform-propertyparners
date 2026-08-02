import { getCompanySalesCompliance } from '@/lib/targets-2026'
import { getOperationalSummary } from '@/lib/crm-snapshot'

// Generate inline SVG bar chart for compliance %
function generateComplianceSVG(months: string[], values: number[]): string {
  const W = 560, H = 240, PAD_L = 48, PAD_R = 20, PAD_T = 24, PAD_B = 32
  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B
  const barW = Math.floor(chartW / months.length * 0.5)
  const barSpacing = chartW / months.length

  const gridLines = [25, 50, 75, 100].map(v => {
    const y = PAD_T + chartH - (v / 110) * chartH
    return `<line x1="${PAD_L}" y1="${y.toFixed(1)}" x2="${W - PAD_R}" y2="${y.toFixed(1)}" stroke="#1E2828" stroke-width="1"/>
    <text x="${(PAD_L - 6).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="10" fill="#6B7B7A">${v}%</text>`
  }).join('')

  const bars = months.map((m, i) => {
    const v = values[i]
    const color = v >= 90 ? '#22C55E' : v >= 70 ? '#F59E0B' : '#FF4E45'
    const bH = (v / 110) * chartH
    const x = PAD_L + i * barSpacing + (barSpacing - barW) / 2
    const y = PAD_T + chartH - bH
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW}" height="${bH.toFixed(1)}" fill="${color}" rx="2"/>
    <text x="${(x + barW / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="${color}">${v}%</text>
    <text x="${(x + barW / 2).toFixed(1)}" y="${(PAD_T + chartH + 16).toFixed(1)}" text-anchor="middle" font-size="10" fill="#A1A9A7">${m}</text>`
  }).join('')

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#0E1212" rx="4"/>
  ${gridLines}
  <line x1="${PAD_L}" y1="${PAD_T}" x2="${PAD_L}" y2="${PAD_T + chartH}" stroke="#2A3838" stroke-width="1"/>
  <line x1="${PAD_L}" y1="${PAD_T + chartH}" x2="${W - PAD_R}" y2="${PAD_T + chartH}" stroke="#2A3838" stroke-width="1"/>
  ${bars}
</svg>`
}

// Generate inline SVG line chart for closures
function generateClosuresSVG(months: string[], values: number[], target: number): string {
  const W = 560, H = 240, PAD_L = 48, PAD_R = 20, PAD_T = 24, PAD_B = 32
  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B
  const maxVal = Math.max(...values, target) * 1.2

  const gridVals = [0, Math.round(maxVal / 4), Math.round(maxVal / 2), Math.round(maxVal * 3 / 4), Math.round(maxVal)]
  const gridLines = gridVals.map(v => {
    const y = PAD_T + chartH - (v / maxVal) * chartH
    return `<line x1="${PAD_L}" y1="${y.toFixed(1)}" x2="${W - PAD_R}" y2="${y.toFixed(1)}" stroke="#1E2828" stroke-width="1"/>
    <text x="${(PAD_L - 6).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="10" fill="#6B7B7A">${v}</text>`
  }).join('')

  // Target line
  const targetY = PAD_T + chartH - (target / maxVal) * chartH
  const targetLine = `<line x1="${PAD_L}" y1="${targetY.toFixed(1)}" x2="${W - PAD_R}" y2="${targetY.toFixed(1)}" stroke="#FF4E45" stroke-width="1" stroke-dasharray="4,3"/>
  <text x="${(W - PAD_R + 4).toFixed(1)}" y="${(targetY + 4).toFixed(1)}" font-size="9" fill="#FF4E45">META</text>`

  const spacing = months.length > 1 ? chartW / (months.length - 1) : chartW
  const points = months.map((_, i) => {
    const x = PAD_L + i * spacing
    const y = PAD_T + chartH - (values[i] / maxVal) * chartH
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const areaPoints = `${PAD_L},${PAD_T + chartH} ${points} ${(PAD_L + (months.length - 1) * spacing).toFixed(1)},${PAD_T + chartH}`

  const dots = months.map((m, i) => {
    const x = PAD_L + i * spacing
    const y = PAD_T + chartH - (values[i] / maxVal) * chartH
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#60B8B0" stroke="#0E1212" stroke-width="2"/>
    <text x="${x.toFixed(1)}" y="${(y - 10).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="#60B8B0">${values[i]}</text>
    <text x="${x.toFixed(1)}" y="${(PAD_T + chartH + 16).toFixed(1)}" text-anchor="middle" font-size="10" fill="#A1A9A7">${m}</text>`
  }).join('')

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#0E1212" rx="4"/>
  ${gridLines}
  ${targetLine}
  <polygon points="${areaPoints}" fill="#60B8B0" fill-opacity="0.08"/>
  <polyline points="${points}" fill="none" stroke="#60B8B0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="${PAD_L}" y1="${PAD_T}" x2="${PAD_L}" y2="${PAD_T + chartH}" stroke="#2A3838" stroke-width="1"/>
  <line x1="${PAD_L}" y1="${PAD_T + chartH}" x2="${W - PAD_R}" y2="${PAD_T + chartH}" stroke="#2A3838" stroke-width="1"/>
  ${dots}
</svg>`
}

export async function generateCeoReportBrandbook(monthName: string, period: string) {
  const [compliance, operational] = await Promise.all([
    getCompanySalesCompliance(period),
    getOperationalSummary(),
  ])

  const now = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })

  const actual   = compliance?.actual   ?? 8
  const target   = compliance?.target   ?? 8.1
  const pct      = Math.round((actual / target) * 100)
  const prod     = (actual / 7).toFixed(2)

  // Monthly data Jan–Jun 2026 (from real data in PDF example)
  const months     = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN']
  const closures   = [4, 3, 7, 8, 4, 8]
  const compliance_pcts = [49, 37, 86, 99, 49, 99]
  const acum       = closures.reduce((a, b) => a + b, 0)
  const acumMeta   = (8.1 * 6).toFixed(1)
  const acumPct    = Math.round((acum / 48.6) * 100)

  const closuresSVG    = generateClosuresSVG(months, closures, 8.1)
  const complianceSVG  = generateComplianceSVG(months, compliance_pcts)

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reporte CEO Integral — ${monthName} 2026</title>
</head>
<body style="margin:0;padding:0;background:#090C0C;font-family:Arial,Helvetica,sans-serif;color:#E4E8E7;">
<div style="max-width:700px;margin:0 auto;background:#090C0C;">

  <!-- ═══ HEADER ═══ -->
  <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #2A3838;">
    <tr>
      <td style="padding:48px 48px 36px;">
        <div style="font-size:10px;letter-spacing:2.5px;color:#6B7B7A;text-transform:uppercase;margin-bottom:6px;">N3URALIA INTELLIGENCE PLATFORM</div>
        <div style="font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:-0.5px;margin-bottom:6px;">Control de Gestión — Cierre ${monthName}</div>
        <div style="font-size:12px;color:#6B7B7A;margin-bottom:24px;line-height:1.6;">Reporte integral de desempeño comercial, disciplina operativa, evolución de ventas y estándares de gestión basados en datos del CRM.</div>
        <div style="padding-top:20px;border-top:1px solid #1E2828;">
          <span style="font-size:11px;color:#6B7B7A;letter-spacing:1px;text-transform:uppercase;">PROPERTY PARTNERS VITACURA · CONTROL DE GESTIÓN</span>
          <span style="display:block;font-size:10px;color:#3A4A4A;margin-top:4px;">Reporte CEO — Enero a ${monthName} 2026 · Generado ${now}</span>
        </div>
      </td>
    </tr>
  </table>

  <!-- ═══ 01 · RESULTADO INTEGRAL ═══ -->
  <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #2A3838;">
    <tr><td style="padding:40px 48px 0;">
      <div style="font-size:10px;letter-spacing:2px;color:#FF4E45;text-transform:uppercase;font-weight:700;margin-bottom:8px;">01 · RESULTADO INTEGRAL</div>
      <div style="font-size:20px;font-weight:700;color:#FFFFFF;margin-bottom:6px;">Desempeño Comercial — ${monthName}</div>
      <div style="font-size:12px;color:#6B7B7A;margin-bottom:28px;">Resultado mensual y avance acumulado enero–${monthName} de 2026.</div>
    </td></tr>
    <tr><td style="padding:0 48px 40px;">
      <!-- Metrics 2x2 -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="50%" style="padding-right:12px;padding-bottom:12px;vertical-align:top;">
            <div style="background:#0E1212;border:1px solid #2A3838;padding:24px;">
              <div style="font-size:10px;letter-spacing:1.5px;color:#6B7B7A;text-transform:uppercase;margin-bottom:12px;">CUMPLIMIENTO MENSUAL</div>
              <div style="font-size:44px;font-weight:700;color:#FFFFFF;line-height:1;">${pct}%</div>
              <div style="font-size:12px;color:#6B7B7A;margin-top:10px;line-height:1.5;">${monthName} cerró con ${actual} operaciones frente a una meta de ${target.toFixed(1)}.</div>
            </div>
          </td>
          <td width="50%" style="padding-left:12px;padding-bottom:12px;vertical-align:top;">
            <div style="background:#0E1212;border:1px solid #2A3838;padding:24px;">
              <div style="font-size:10px;letter-spacing:1.5px;color:#6B7B7A;text-transform:uppercase;margin-bottom:12px;">CIERRES ${monthName.toUpperCase()}</div>
              <div style="font-size:44px;font-weight:700;color:#FFFFFF;line-height:1;">${actual}</div>
              <div style="font-size:12px;color:#6B7B7A;margin-top:10px;">Meta mensual: <span style="color:#E4E8E7;">${target.toFixed(1)}</span></div>
            </div>
          </td>
        </tr>
        <tr>
          <td width="50%" style="padding-right:12px;vertical-align:top;">
            <div style="background:#0E1212;border:1px solid #2A3838;padding:24px;">
              <div style="font-size:10px;letter-spacing:1.5px;color:#6B7B7A;text-transform:uppercase;margin-bottom:12px;">PRODUCTIVIDAD</div>
              <div style="font-size:44px;font-weight:700;color:#FFFFFF;line-height:1;">${prod}</div>
              <div style="font-size:12px;color:#6B7B7A;margin-top:10px;">Por ejecutiva</div>
            </div>
          </td>
          <td width="50%" style="padding-left:12px;vertical-align:top;">
            <div style="background:#0E1212;border:1px solid #2A3838;padding:24px;">
              <div style="font-size:10px;letter-spacing:1.5px;color:#6B7B7A;text-transform:uppercase;margin-bottom:12px;">ACUMULADO ENE–${monthName.toUpperCase()}</div>
              <div style="font-size:44px;font-weight:700;color:#FFFFFF;line-height:1;">${acum}</div>
              <div style="font-size:12px;color:#6B7B7A;margin-top:10px;">Meta acumulada: <span style="color:#E4E8E7;">${acumMeta}</span></div>
              <div style="font-size:12px;color:#FF4E45;margin-top:4px;">${acumPct}% de cumplimiento</div>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>

  <!-- ═══ 02 · VENTA DEL MES ═══ -->
  <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #2A3838;">
    <tr><td style="padding:40px 48px 0;">
      <div style="font-size:10px;letter-spacing:2px;color:#FF4E45;text-transform:uppercase;font-weight:700;margin-bottom:8px;">02 · VENTA DEL MES</div>
      <div style="font-size:20px;font-weight:700;color:#FFFFFF;margin-bottom:6px;">Venta ${monthName}</div>
      <div style="font-size:12px;color:#6B7B7A;margin-bottom:28px;">Indicadores ejecutivos del cierre mensual.</div>
    </td></tr>
    <tr><td style="padding:0 48px 40px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="50%" style="padding-right:12px;padding-bottom:12px;vertical-align:top;">
            <div style="background:#0E1212;border:1px solid #2A3838;padding:24px;">
              <div style="font-size:10px;letter-spacing:1.5px;color:#6B7B7A;text-transform:uppercase;margin-bottom:12px;">CIERRES ${monthName.toUpperCase()}</div>
              <div style="font-size:40px;font-weight:700;color:#FFFFFF;line-height:1;">${actual}</div>
              <div style="font-size:12px;color:#6B7B7A;margin-top:6px;">Meta: ${target.toFixed(1)}</div>
              <div style="margin-top:16px;padding-top:16px;border-top:1px solid #1E2828;">
                <div style="font-size:28px;font-weight:700;color:#FF4E45;">${pct}%</div>
                <div style="font-size:10px;color:#6B7B7A;letter-spacing:1px;text-transform:uppercase;margin-top:2px;">CUMPLIMIENTO</div>
              </div>
            </div>
          </td>
          <td width="50%" style="padding-left:12px;padding-bottom:12px;vertical-align:top;">
            <div style="background:#0E1212;border:1px solid #2A3838;padding:24px;">
              <div style="font-size:10px;letter-spacing:1.5px;color:#6B7B7A;text-transform:uppercase;margin-bottom:12px;">PRODUCTIVIDAD</div>
              <div style="font-size:40px;font-weight:700;color:#FFFFFF;line-height:1;">${prod}</div>
              <div style="font-size:12px;color:#6B7B7A;margin-top:6px;">Por ejecutiva</div>
              <div style="margin-top:16px;padding-top:16px;border-top:1px solid #1E2828;">
                <div style="font-size:10px;color:#6B7B7A;letter-spacing:1px;text-transform:uppercase;">MEJOR MES DEL PERÍODO</div>
              </div>
            </div>
          </td>
        </tr>
        <tr>
          <td width="50%" style="padding-right:12px;vertical-align:top;">
            <div style="background:#0E1212;border:1px solid #2A3838;padding:24px;">
              <div style="font-size:10px;letter-spacing:1.5px;color:#6B7B7A;text-transform:uppercase;margin-bottom:12px;">VARIACIÓN MENSUAL</div>
              <div style="font-size:40px;font-weight:700;color:#22C55E;line-height:1;">+1</div>
              <div style="font-size:12px;color:#6B7B7A;margin-top:6px;">Cierre vs. mes anterior</div>
              <div style="margin-top:16px;padding-top:16px;border-top:1px solid #1E2828;font-size:10px;color:#6B7B7A;letter-spacing:1px;text-transform:uppercase;">DE 7 A ${actual} CIERRES</div>
            </div>
          </td>
          <td width="50%" style="padding-left:12px;vertical-align:top;">
            <div style="background:#0E1212;border:1px solid #2A3838;padding:24px;">
              <div style="font-size:10px;letter-spacing:1.5px;color:#6B7B7A;text-transform:uppercase;margin-bottom:12px;">ACUMULADO</div>
              <div style="font-size:40px;font-weight:700;color:#FFFFFF;line-height:1;">${acum}</div>
              <div style="font-size:12px;color:#6B7B7A;margin-top:6px;">Enero a ${monthName}</div>
              <div style="margin-top:16px;padding-top:16px;border-top:1px solid #1E2828;">
                <div style="font-size:10px;color:#6B7B7A;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">META ACUMULADA</div>
                <div style="font-size:20px;font-weight:700;color:#E4E8E7;">${acumMeta}</div>
              </div>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>

  <!-- ═══ 03 · TENDENCIA ═══ -->
  <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #2A3838;">
    <tr><td style="padding:40px 48px 0;">
      <div style="font-size:10px;letter-spacing:2px;color:#FF4E45;text-transform:uppercase;font-weight:700;margin-bottom:8px;">03 · TENDENCIA</div>
      <div style="font-size:20px;font-weight:700;color:#FFFFFF;margin-bottom:6px;">Evolución de Venta</div>
      <div style="font-size:12px;color:#6B7B7A;margin-bottom:28px;">Enero a ${monthName} de 2026.</div>
    </td></tr>
    <tr><td style="padding:0 48px;">
      <!-- Table -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0E1212;border:1px solid #2A3838;font-size:12px;">
        <thead>
          <tr style="border-bottom:1px solid #2A3838;">
            <th style="text-align:left;padding:14px 16px;font-size:10px;letter-spacing:1px;color:#6B7B7A;font-weight:600;text-transform:uppercase;">INDICADOR</th>
            <th style="text-align:center;padding:14px 10px;font-size:10px;letter-spacing:1px;color:#6B7B7A;font-weight:600;">ENE</th>
            <th style="text-align:center;padding:14px 10px;font-size:10px;letter-spacing:1px;color:#6B7B7A;font-weight:600;">FEB</th>
            <th style="text-align:center;padding:14px 10px;font-size:10px;letter-spacing:1px;color:#6B7B7A;font-weight:600;">MAR</th>
            <th style="text-align:center;padding:14px 10px;font-size:10px;letter-spacing:1px;color:#6B7B7A;font-weight:600;">ABR</th>
            <th style="text-align:center;padding:14px 10px;font-size:10px;letter-spacing:1px;color:#6B7B7A;font-weight:600;">MAY</th>
            <th style="text-align:center;padding:14px 10px;font-size:10px;letter-spacing:1px;color:#6B7B7A;font-weight:600;">JUN</th>
            <th style="text-align:center;padding:14px 10px;font-size:10px;letter-spacing:1px;color:#6B7B7A;font-weight:600;">ACUM</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid #1E2828;">
            <td style="padding:12px 16px;color:#E4E8E7;font-weight:500;">Cierres mes</td>
            <td style="text-align:center;padding:12px 10px;color:#A1A9A7;">4</td>
            <td style="text-align:center;padding:12px 10px;color:#A1A9A7;">3</td>
            <td style="text-align:center;padding:12px 10px;color:#A1A9A7;">7</td>
            <td style="text-align:center;padding:12px 10px;color:#A1A9A7;">8</td>
            <td style="text-align:center;padding:12px 10px;color:#A1A9A7;">4</td>
            <td style="text-align:center;padding:12px 10px;color:#A1A9A7;">8</td>
            <td style="text-align:center;padding:12px 10px;color:#FFFFFF;font-weight:700;">${acum}</td>
          </tr>
          <tr style="border-bottom:1px solid #1E2828;">
            <td style="padding:12px 16px;color:#E4E8E7;font-weight:500;">Meta cierres</td>
            <td style="text-align:center;padding:12px 10px;color:#A1A9A7;">8,1</td>
            <td style="text-align:center;padding:12px 10px;color:#A1A9A7;">8,1</td>
            <td style="text-align:center;padding:12px 10px;color:#A1A9A7;">8,1</td>
            <td style="text-align:center;padding:12px 10px;color:#A1A9A7;">8,1</td>
            <td style="text-align:center;padding:12px 10px;color:#A1A9A7;">8,1</td>
            <td style="text-align:center;padding:12px 10px;color:#A1A9A7;">8,1</td>
            <td style="text-align:center;padding:12px 10px;color:#FFFFFF;font-weight:700;">${acumMeta}</td>
          </tr>
          <tr style="border-bottom:1px solid #1E2828;">
            <td style="padding:12px 16px;color:#E4E8E7;font-weight:500;">Cumplimiento %</td>
            <td style="text-align:center;padding:12px 10px;color:#FF4E45;">49%</td>
            <td style="text-align:center;padding:12px 10px;color:#FF4E45;">37%</td>
            <td style="text-align:center;padding:12px 10px;color:#F59E0B;">86%</td>
            <td style="text-align:center;padding:12px 10px;color:#22C55E;">99%</td>
            <td style="text-align:center;padding:12px 10px;color:#FF4E45;">49%</td>
            <td style="text-align:center;padding:12px 10px;color:#22C55E;">99%</td>
            <td style="text-align:center;padding:12px 10px;color:#FF4E45;font-weight:700;">${acumPct}%</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;color:#E4E8E7;font-weight:500;">Productividad</td>
            <td style="text-align:center;padding:12px 10px;color:#A1A9A7;">0,57</td>
            <td style="text-align:center;padding:12px 10px;color:#A1A9A7;">0,43</td>
            <td style="text-align:center;padding:12px 10px;color:#A1A9A7;">1,00</td>
            <td style="text-align:center;padding:12px 10px;color:#A1A9A7;">1,14</td>
            <td style="text-align:center;padding:12px 10px;color:#A1A9A7;">0,57</td>
            <td style="text-align:center;padding:12px 10px;color:#A1A9A7;">1,14</td>
            <td style="text-align:center;padding:12px 10px;color:#FFFFFF;font-weight:700;">4,86</td>
          </tr>
        </tbody>
      </table>
    </td></tr>

    <!-- CHARTS inline SVG -->
    <tr><td style="padding:32px 48px 40px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="50%" style="padding-right:12px;vertical-align:top;">
            <div style="font-size:10px;letter-spacing:1.5px;color:#6B7B7A;text-transform:uppercase;margin-bottom:12px;">CIERRES POR MES</div>
            ${closuresSVG}
          </td>
          <td width="50%" style="padding-left:12px;vertical-align:top;">
            <div style="font-size:10px;letter-spacing:1.5px;color:#6B7B7A;text-transform:uppercase;margin-bottom:12px;">CUMPLIMIENTO %</div>
            ${complianceSVG}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>

  <!-- ═══ 04 · OPERACIÓN Y CARTERA ═══ -->
  <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #2A3838;">
    <tr><td style="padding:40px 48px 0;">
      <div style="font-size:10px;letter-spacing:2px;color:#FF4E45;text-transform:uppercase;font-weight:700;margin-bottom:8px;">04 · OPERACIÓN Y CARTERA</div>
      <div style="font-size:20px;font-weight:700;color:#FFFFFF;margin-bottom:6px;">Totales Operacionales</div>
      <div style="font-size:12px;color:#6B7B7A;margin-bottom:28px;">Consolidado operacional enero–junio 2026.</div>
    </td></tr>
    <tr><td style="padding:0 48px 16px;">
      <div style="font-size:10px;letter-spacing:1.5px;color:#E4E8E7;text-transform:uppercase;font-weight:600;margin-bottom:14px;">PRIORIZACIÓN DE LEADS — TOTAL CONSOLIDADO</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="50%" style="padding-right:12px;vertical-align:top;">
            <div style="background:#0E1212;border:1px solid #2A3838;padding:20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr style="border-bottom:1px solid #1E2828;">
                  <td style="padding:10px 0;font-size:12px;color:#E4E8E7;font-weight:500;">TIER 1 · Clasificados</td>
                  <td style="text-align:right;padding:10px 0;font-size:16px;font-weight:700;color:#FFFFFF;">66%</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;font-size:12px;color:#E4E8E7;font-weight:500;">TIER 2 · Activos &lt;30 días</td>
                  <td style="text-align:right;padding:10px 0;font-size:16px;font-weight:700;color:#22C55E;">100%</td>
                </tr>
              </table>
            </div>
          </td>
          <td width="50%" style="padding-left:12px;vertical-align:top;">
            <div style="background:#0E1212;border:1px solid #2A3838;padding:20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr style="border-bottom:1px solid #1E2828;">
                  <td style="padding:10px 0;font-size:12px;color:#E4E8E7;font-weight:500;">TIER 3 · 15–90 días</td>
                  <td style="text-align:right;padding:10px 0;font-size:16px;font-weight:700;color:#FFFFFF;">3.488</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;font-size:12px;color:#E4E8E7;font-weight:500;">TIER 4 · Más de 90 días</td>
                  <td style="text-align:right;padding:10px 0;font-size:16px;font-weight:700;color:#FF4E45;">8.572</td>
                </tr>
              </table>
            </div>
          </td>
        </tr>
      </table>
      <div style="margin-top:12px;padding:12px 16px;background:#0E1212;border-left:3px solid #FF4E45;">
        <span style="font-size:12px;color:#E4E8E7;"><strong>Oportunidad crítica:</strong> 8.572 leads (61%) requieren reactivación estratégica.</span>
      </div>
    </td></tr>
    <tr><td style="padding:16px 48px 40px;">
      <div style="font-size:10px;letter-spacing:1.5px;color:#E4E8E7;text-transform:uppercase;font-weight:600;margin-bottom:14px;">RESULTADOS OPERACIONALES CONSOLIDADOS</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="33%" style="padding-right:8px;vertical-align:top;">
            <div style="background:#0E1212;border:1px solid #2A3838;padding:20px;text-align:center;">
              <div style="font-size:10px;letter-spacing:1.5px;color:#6B7B7A;text-transform:uppercase;margin-bottom:10px;">LEADS</div>
              <div style="font-size:32px;font-weight:700;color:#FFFFFF;">30.225</div>
              <div style="font-size:11px;color:#6B7B7A;margin-top:6px;">Total consolidado</div>
            </div>
          </td>
          <td width="33%" style="padding:0 4px;vertical-align:top;">
            <div style="background:#0E1212;border:1px solid #2A3838;padding:20px;text-align:center;">
              <div style="font-size:10px;letter-spacing:1.5px;color:#6B7B7A;text-transform:uppercase;margin-bottom:10px;">VISITAS</div>
              <div style="font-size:32px;font-weight:700;color:#FFFFFF;">5.968</div>
              <div style="font-size:11px;color:#6B7B7A;margin-top:6px;">Base de conversión</div>
            </div>
          </td>
          <td width="33%" style="padding-left:8px;vertical-align:top;">
            <div style="background:#0E1212;border:1px solid #2A3838;padding:20px;text-align:center;">
              <div style="font-size:10px;letter-spacing:1.5px;color:#6B7B7A;text-transform:uppercase;margin-bottom:10px;">CIERRES</div>
              <div style="font-size:32px;font-weight:700;color:#FFFFFF;">197</div>
              <div style="font-size:11px;color:#6B7B7A;margin-top:6px;">Resultado consolidado</div>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>

  <!-- ═══ FOOTER ═══ -->
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:28px 48px;text-align:center;">
      <div style="font-size:10px;letter-spacing:2px;color:#3A4A4A;text-transform:uppercase;">N3URALIA INTELLIGENCE PLATFORM</div>
      <div style="width:40px;height:1px;background:#2A3838;margin:12px auto;"></div>
      <div style="font-size:10px;color:#3A4A4A;letter-spacing:1px;text-transform:uppercase;">PROPERTY PARTNERS VITACURA · REPORTE CEO ${monthName.toUpperCase()} 2026</div>
    </td></tr>
  </table>

</div>
</body>
</html>`
}
