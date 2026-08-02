import { getCompanySalesCompliance } from '@/lib/targets-2026'
import { getOperationalSummary } from '@/lib/crm-snapshot'

const MONTHS = [
  { key: '2026-01', short: 'Ene', long: 'Enero' },
  { key: '2026-02', short: 'Feb', long: 'Febrero' },
  { key: '2026-03', short: 'Mar', long: 'Marzo' },
  { key: '2026-04', short: 'Abr', long: 'Abril' },
  { key: '2026-05', short: 'May', long: 'Mayo' },
  { key: '2026-06', short: 'Jun', long: 'Junio' },
] as const

function number(value: number, digits = 0) {
  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

function status(percent: number) {
  if (percent >= 100) return { label: 'Sobre meta', color: '#2FA66A', bg: '#10271D' }
  if (percent >= 90) return { label: 'En rango', color: '#E7B84B', bg: '#2A2414' }
  return { label: 'Bajo meta', color: '#EF655D', bg: '#2A1717' }
}

function metricCard(label: string, value: string, detail: string, accent = '#FFFFFF') {
  return `<td width="50%" valign="top" style="padding:0 8px 16px 8px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;background:#101414;border:1px solid #293231;">
      <tr><td style="padding:22px 22px 20px 22px;">
        <div style="font-family:Calibri,Arial,sans-serif;font-size:10px;line-height:14px;letter-spacing:1.5px;text-transform:uppercase;color:#879391;margin-bottom:14px;">${label}</div>
        <div style="font-family:Calibri,Arial,sans-serif;font-size:38px;line-height:42px;font-weight:700;color:${accent};font-variant-numeric:tabular-nums;">${value}</div>
        <div style="font-family:Calibri,Arial,sans-serif;font-size:12px;line-height:18px;color:#879391;margin-top:10px;">${detail}</div>
      </td></tr>
    </table>
  </td>`
}

export async function generateCeoReportAprilLayout(monthName: string, period: string) {
  const monthIndex = Math.max(0, MONTHS.findIndex((item) => item.key === period))
  const visibleMonths = MONTHS.slice(0, monthIndex + 1)
  const monthly = visibleMonths.map((item) => ({
    ...item,
    data: getCompanySalesCompliance(item.key),
  }))
  const current = monthly[monthly.length - 1]?.data ?? getCompanySalesCompliance(period)
  const operational = getOperationalSummary()

  const actual = Number(current?.actual ?? 0)
  const target = Number(current?.target ?? 0)
  const compliance = target > 0 ? (actual / target) * 100 : 0
  const productivity = actual / 7
  const cumulativeActual = monthly.reduce((sum, item) => sum + Number(item.data?.actual ?? 0), 0)
  const cumulativeTarget = monthly.reduce((sum, item) => sum + Number(item.data?.target ?? 0), 0)
  const cumulativeCompliance = cumulativeTarget > 0 ? (cumulativeActual / cumulativeTarget) * 100 : 0
  const previous = monthly.length > 1 ? Number(monthly[monthly.length - 2]?.data?.actual ?? 0) : 0
  const delta = actual - previous
  const currentStatus = status(compliance)

  const leads = Number(operational?.leads ?? 30225)
  const activeLeads = Number(operational?.activeLeads ?? 14034)
  const visits = Number(operational?.visits ?? 5968)
  const closings = Number(operational?.sales ?? 197)
  const conversion = visits > 0 ? (closings / visits) * 100 : 3.3

  const generated = new Intl.DateTimeFormat('es-CL', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Santiago',
  }).format(new Date())

  const monthHeaders = monthly.map((item) => `<th style="padding:11px 6px;text-align:center;font-family:Calibri,Arial,sans-serif;font-size:10px;letter-spacing:.5px;color:#879391;font-weight:600;border-bottom:1px solid #293231;">${item.short}</th>`).join('')
  const row = (label: string, values: string[], total: string, highlight = false) => `<tr>
    <td style="padding:12px 10px;font-family:Calibri,Arial,sans-serif;font-size:11px;color:#DDE3E1;font-weight:600;border-bottom:1px solid #202827;white-space:nowrap;">${label}</td>
    ${values.map((value) => `<td style="padding:12px 6px;text-align:center;font-family:Calibri,Arial,sans-serif;font-size:11px;color:#AAB4B2;border-bottom:1px solid #202827;font-variant-numeric:tabular-nums;">${value}</td>`).join('')}
    <td style="padding:12px 8px;text-align:center;font-family:Calibri,Arial,sans-serif;font-size:11px;color:${highlight ? '#FFFFFF' : '#DDE3E1'};background:${highlight ? '#252D2C' : '#171D1C'};font-weight:700;border-bottom:1px solid #202827;font-variant-numeric:tabular-nums;">${total}</td>
  </tr>`

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Control de Gestión — Cierre ${monthName}</title></head>
<body style="margin:0;padding:0;background:#070909;color:#FFFFFF;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;background:#070909;">
<tr><td align="center" style="padding:0;">
<table width="700" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;max-width:700px;border-collapse:collapse;background:#090C0C;">

<tr><td style="padding:46px 44px 38px 44px;border-bottom:1px solid #293231;">
  <div style="font-family:Calibri,Arial,sans-serif;font-size:10px;line-height:14px;letter-spacing:2.4px;text-transform:uppercase;color:#879391;margin-bottom:18px;">PROPERTY PARTNERS VITACURA · CONTROL DE GESTIÓN</div>
  <div style="font-family:Calibri,Arial,sans-serif;font-size:30px;line-height:35px;font-weight:700;color:#FFFFFF;letter-spacing:-.5px;">Cierre ${monthName}</div>
  <div style="font-family:Calibri,Arial,sans-serif;font-size:14px;line-height:21px;color:#AAB4B2;margin-top:10px;max-width:560px;">Resultado comercial, evolución acumulada y control operacional para decisión ejecutiva.</div>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:28px;border-collapse:collapse;border-top:1px solid #202827;">
    <tr>
      <td style="padding-top:16px;font-family:Calibri,Arial,sans-serif;font-size:10px;line-height:16px;color:#687674;text-transform:uppercase;letter-spacing:1px;">Reporte CEO · Enero–${monthName} 2026</td>
      <td align="right" style="padding-top:16px;font-family:Calibri,Arial,sans-serif;font-size:10px;line-height:16px;color:#687674;">Generado ${generated}</td>
    </tr>
  </table>
</td></tr>

<tr><td style="padding:38px 36px 30px 36px;border-bottom:1px solid #293231;">
  <div style="font-family:Calibri,Arial,sans-serif;font-size:10px;letter-spacing:2px;color:#EF655D;text-transform:uppercase;font-weight:700;">01 · RESUMEN EJECUTIVO</div>
  <div style="font-family:Calibri,Arial,sans-serif;font-size:22px;line-height:28px;font-weight:700;color:#FFFFFF;margin-top:8px;">Resultado comercial de ${monthName}</div>
  <div style="font-family:Calibri,Arial,sans-serif;font-size:12px;line-height:18px;color:#879391;margin-top:6px;margin-bottom:24px;">Lectura inmediata del mes y del avance acumulado al corte.</div>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;"><tr>
    ${metricCard('Cierres del mes', number(actual), `Meta mensual: ${number(target, 1)} · Variación vs mes anterior: ${delta >= 0 ? '+' : ''}${number(delta)}`)}
    ${metricCard('Cumplimiento mensual', `${number(compliance)}%`, currentStatus.label, currentStatus.color)}
  </tr><tr>
    ${metricCard('Productividad', number(productivity, 2), 'Cierres por ejecutiva')}
    ${metricCard(`Acumulado Ene–${monthName}`, number(cumulativeActual), `Meta: ${number(cumulativeTarget, 1)} · ${number(cumulativeCompliance, 1)}% de cumplimiento`)}
  </tr></table>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;background:${currentStatus.bg};border-left:3px solid ${currentStatus.color};margin:4px 8px 0 8px;width:calc(100% - 16px);">
    <tr><td style="padding:14px 16px;font-family:Calibri,Arial,sans-serif;font-size:12px;line-height:18px;color:#DDE3E1;"><strong style="color:${currentStatus.color};">Lectura ejecutiva:</strong> ${monthName} registra ${number(actual)} cierres frente a una meta de ${number(target, 1)}. El acumulado alcanza ${number(cumulativeActual)} cierres y ${number(cumulativeCompliance, 1)}% de cumplimiento.</td></tr>
  </table>
</td></tr>

<tr><td style="padding:38px 44px;border-bottom:1px solid #293231;">
  <div style="font-family:Calibri,Arial,sans-serif;font-size:10px;letter-spacing:2px;color:#EF655D;text-transform:uppercase;font-weight:700;">02 · EVOLUCIÓN COMERCIAL</div>
  <div style="font-family:Calibri,Arial,sans-serif;font-size:22px;line-height:28px;font-weight:700;color:#FFFFFF;margin-top:8px;">Enero–${monthName} 2026</div>
  <div style="font-family:Calibri,Arial,sans-serif;font-size:12px;line-height:18px;color:#879391;margin-top:6px;margin-bottom:24px;">Comparación mensual de resultado, meta, cumplimiento y productividad.</div>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;background:#101414;border:1px solid #293231;">
    <thead><tr><th style="padding:11px 10px;text-align:left;font-family:Calibri,Arial,sans-serif;font-size:10px;letter-spacing:.5px;color:#879391;font-weight:600;border-bottom:1px solid #293231;">INDICADOR</th>${monthHeaders}<th style="padding:11px 8px;text-align:center;font-family:Calibri,Arial,sans-serif;font-size:10px;color:#FFFFFF;background:#252D2C;border-bottom:1px solid #293231;">ACUM.</th></tr></thead>
    <tbody>
      ${row('Cierres', monthly.map((item) => number(Number(item.data?.actual ?? 0))), number(cumulativeActual), true)}
      ${row('Meta', monthly.map((item) => number(Number(item.data?.target ?? 0), 1)), number(cumulativeTarget, 1))}
      ${row('Cumplimiento', monthly.map((item) => `${number(Number(item.data?.compliance ?? 0))}%`), `${number(cumulativeCompliance)}%`, true)}
      ${row('Productividad', monthly.map((item) => number(Number(item.data?.actual ?? 0) / 7, 2)), number(cumulativeActual / 7, 2))}
    </tbody>
  </table>
</td></tr>

<tr><td style="padding:38px 44px;border-bottom:1px solid #293231;">
  <div style="font-family:Calibri,Arial,sans-serif;font-size:10px;letter-spacing:2px;color:#EF655D;text-transform:uppercase;font-weight:700;">03 · RESULTADOS OPERACIONALES CONSOLIDADOS</div>
  <div style="font-family:Calibri,Arial,sans-serif;font-size:22px;line-height:28px;font-weight:700;color:#FFFFFF;margin-top:8px;">Embudo operacional actualizado</div>
  <div style="font-family:Calibri,Arial,sans-serif;font-size:12px;line-height:18px;color:#879391;margin-top:6px;margin-bottom:24px;">Bloque separado del corte comercial mensual. Resume el estado consolidado disponible en CRM.</div>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;"><tr>
    ${metricCard('Leads totales', number(leads), 'Base consolidada CRM')}
    ${metricCard('Leads activos', number(activeLeads), `${number((activeLeads / Math.max(leads, 1)) * 100, 1)}% del total`)}
  </tr><tr>
    ${metricCard('Visitas', number(visits), 'Actividad comercial registrada')}
    ${metricCard('Cierres consolidados', number(closings), `${number(conversion, 1)}% visita → cierre`, '#2FA66A')}
  </tr></table>
</td></tr>

<tr><td style="padding:38px 44px;border-bottom:1px solid #293231;">
  <div style="font-family:Calibri,Arial,sans-serif;font-size:10px;letter-spacing:2px;color:#EF655D;text-transform:uppercase;font-weight:700;">04 · DEFINICIONES OPERACIONALES ACTIVAS</div>
  <div style="font-family:Calibri,Arial,sans-serif;font-size:22px;line-height:28px;font-weight:700;color:#FFFFFF;margin-top:8px;">Estándares de contacto</div>
  <div style="font-family:Calibri,Arial,sans-serif;font-size:12px;line-height:18px;color:#879391;margin-top:6px;margin-bottom:24px;">Tiempos operacionales activos por tipo de propiedad. No corresponden a resultados observados.</div>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;background:#101414;border:1px solid #293231;">
    <tr><td style="padding:16px 18px;font-family:Calibri,Arial,sans-serif;font-size:11px;color:#FFFFFF;font-weight:700;border-bottom:1px solid #293231;">TIPO</td><td align="center" style="padding:16px 8px;font-family:Calibri,Arial,sans-serif;font-size:10px;color:#879391;border-bottom:1px solid #293231;">PRIMER CONTACTO</td><td align="center" style="padding:16px 8px;font-family:Calibri,Arial,sans-serif;font-size:10px;color:#879391;border-bottom:1px solid #293231;">SEGUIMIENTO</td><td align="center" style="padding:16px 8px;font-family:Calibri,Arial,sans-serif;font-size:10px;color:#879391;border-bottom:1px solid #293231;">RECONTACTO</td></tr>
    <tr><td style="padding:16px 18px;font-family:Calibri,Arial,sans-serif;font-size:12px;color:#DDE3E1;font-weight:700;border-bottom:1px solid #202827;">Casa</td><td align="center" style="font-family:Calibri,Arial,sans-serif;color:#FFFFFF;font-size:18px;font-weight:700;border-bottom:1px solid #202827;">48h</td><td align="center" style="font-family:Calibri,Arial,sans-serif;color:#FFFFFF;font-size:18px;font-weight:700;border-bottom:1px solid #202827;">24h</td><td align="center" style="font-family:Calibri,Arial,sans-serif;color:#FFFFFF;font-size:18px;font-weight:700;border-bottom:1px solid #202827;">7 días</td></tr>
    <tr><td style="padding:16px 18px;font-family:Calibri,Arial,sans-serif;font-size:12px;color:#DDE3E1;font-weight:700;">Departamento</td><td align="center" style="font-family:Calibri,Arial,sans-serif;color:#FFFFFF;font-size:18px;font-weight:700;">24h</td><td align="center" style="font-family:Calibri,Arial,sans-serif;color:#FFFFFF;font-size:18px;font-weight:700;">12h</td><td align="center" style="font-family:Calibri,Arial,sans-serif;color:#FFFFFF;font-size:18px;font-weight:700;">5 días</td></tr>
  </table>
</td></tr>

<tr><td style="padding:38px 44px;border-bottom:1px solid #293231;">
  <div style="font-family:Calibri,Arial,sans-serif;font-size:10px;letter-spacing:2px;color:#EF655D;text-transform:uppercase;font-weight:700;">05 · BENCHMARKS OPERACIONALES ACTIVOS</div>
  <div style="font-family:Calibri,Arial,sans-serif;font-size:22px;line-height:28px;font-weight:700;color:#FFFFFF;margin-top:8px;">Conversión por tipo de propiedad</div>
  <div style="font-family:Calibri,Arial,sans-serif;font-size:12px;line-height:18px;color:#879391;margin-top:6px;margin-bottom:24px;">Rangos operacionales de referencia activa. Deben compararse con resultados observados sin mezclarlos.</div>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;background:#101414;border:1px solid #293231;">
    <tr><td style="padding:16px 18px;font-family:Calibri,Arial,sans-serif;font-size:11px;color:#FFFFFF;font-weight:700;border-bottom:1px solid #293231;">TIPO</td><td align="center" style="padding:16px 8px;font-family:Calibri,Arial,sans-serif;font-size:10px;color:#879391;border-bottom:1px solid #293231;">LEAD → VISITA</td><td align="center" style="padding:16px 8px;font-family:Calibri,Arial,sans-serif;font-size:10px;color:#879391;border-bottom:1px solid #293231;">VISITA → CIERRE</td><td align="center" style="padding:16px 8px;font-family:Calibri,Arial,sans-serif;font-size:10px;color:#879391;border-bottom:1px solid #293231;">TOTAL</td></tr>
    <tr><td style="padding:16px 18px;font-family:Calibri,Arial,sans-serif;font-size:12px;color:#DDE3E1;font-weight:700;border-bottom:1px solid #202827;">Casa</td><td align="center" style="font-family:Calibri,Arial,sans-serif;color:#FFFFFF;font-size:17px;font-weight:700;border-bottom:1px solid #202827;">15–20%</td><td align="center" style="font-family:Calibri,Arial,sans-serif;color:#FFFFFF;font-size:17px;font-weight:700;border-bottom:1px solid #202827;">3,5–4,5%</td><td align="center" style="font-family:Calibri,Arial,sans-serif;color:#FFFFFF;font-size:17px;font-weight:700;border-bottom:1px solid #202827;">0,5–0,9%</td></tr>
    <tr><td style="padding:16px 18px;font-family:Calibri,Arial,sans-serif;font-size:12px;color:#DDE3E1;font-weight:700;">Departamento</td><td align="center" style="font-family:Calibri,Arial,sans-serif;color:#FFFFFF;font-size:17px;font-weight:700;">20–25%</td><td align="center" style="font-family:Calibri,Arial,sans-serif;color:#FFFFFF;font-size:17px;font-weight:700;">2,5–3,5%</td><td align="center" style="font-family:Calibri,Arial,sans-serif;color:#FFFFFF;font-size:17px;font-weight:700;">0,5–0,9%</td></tr>
  </table>
</td></tr>

<tr><td style="padding:34px 44px 42px 44px;">
  <div style="font-family:Calibri,Arial,sans-serif;font-size:10px;letter-spacing:2px;color:#EF655D;text-transform:uppercase;font-weight:700;">06 · FOCO DE GESTIÓN</div>
  <div style="font-family:Calibri,Arial,sans-serif;font-size:20px;line-height:26px;font-weight:700;color:#FFFFFF;margin-top:8px;">Prioridades para el siguiente ciclo</div>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;margin-top:20px;">
    <tr><td width="24" valign="top" style="font-family:Calibri,Arial,sans-serif;color:#EF655D;font-size:18px;font-weight:700;padding:12px 0;">01</td><td style="font-family:Calibri,Arial,sans-serif;color:#DDE3E1;font-size:12px;line-height:18px;padding:12px 0;border-bottom:1px solid #202827;">Cerrar la brecha del acumulado mediante seguimiento semanal del pipeline avanzado.</td></tr>
    <tr><td width="24" valign="top" style="font-family:Calibri,Arial,sans-serif;color:#EF655D;font-size:18px;font-weight:700;padding:12px 0;">02</td><td style="font-family:Calibri,Arial,sans-serif;color:#DDE3E1;font-size:12px;line-height:18px;padding:12px 0;border-bottom:1px solid #202827;">Aplicar los estándares de contacto por tipo de propiedad y medir cumplimiento real.</td></tr>
    <tr><td width="24" valign="top" style="font-family:Calibri,Arial,sans-serif;color:#EF655D;font-size:18px;font-weight:700;padding:12px 0;">03</td><td style="font-family:Calibri,Arial,sans-serif;color:#DDE3E1;font-size:12px;line-height:18px;padding:12px 0;">Separar siempre resultados mensuales, consolidados operacionales y benchmarks activos.</td></tr>
  </table>
</td></tr>

<tr><td style="padding:22px 44px;background:#060808;border-top:1px solid #293231;">
  <div style="font-family:Calibri,Arial,sans-serif;font-size:9px;line-height:15px;color:#596663;text-align:center;letter-spacing:.4px;">N3URALIA INTELLIGENCE PLATFORM · PROPERTY PARTNERS VITACURA · INFORMACIÓN CONFIDENCIAL</div>
</td></tr>

</table></td></tr></table>
</body></html>`
}
