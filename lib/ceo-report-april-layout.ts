import { getCompanySalesCompliance } from '@/lib/targets-2026'
import { getOperationalSummary } from '@/lib/crm-snapshot'

const MONTHS = [
  { key: '2026-01', short: 'Ene' },
  { key: '2026-02', short: 'Feb' },
  { key: '2026-03', short: 'Mar' },
  { key: '2026-04', short: 'Abr' },
  { key: '2026-05', short: 'May' },
  { key: '2026-06', short: 'Jun' },
] as const

const nf = (value: number, digits = 0) => new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: digits,
  maximumFractionDigits: digits,
}).format(value)

function metric(label: string, value: string, detail: string, accent = '#ffffff') {
  return `<td width="50%" valign="top" style="padding:0 7px 14px">
    <table width="100%" role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#111615;border:1px solid #2b3533">
      <tr><td style="padding:22px">
        <div style="font:600 10px/14px Calibri,Arial,sans-serif;letter-spacing:1.35px;text-transform:uppercase;color:#84908e">${label}</div>
        <div style="font:700 39px/44px Calibri,Arial,sans-serif;color:${accent};margin-top:10px;font-variant-numeric:tabular-nums">${value}</div>
        <div style="font:400 12px/18px Calibri,Arial,sans-serif;color:#8f9a98;margin-top:8px">${detail}</div>
      </td></tr>
    </table>
  </td>`
}

export async function generateCeoReportAprilLayout(monthName: string, period: string) {
  const found = MONTHS.findIndex((item) => item.key === period)
  const visible = MONTHS.slice(0, found >= 0 ? found + 1 : 4)
  const monthly = visible.map((item) => ({ ...item, data: getCompanySalesCompliance(item.key) }))
  const current = monthly.at(-1)?.data ?? getCompanySalesCompliance(period)
  const operational = getOperationalSummary()

  const actual = Number(current?.actual ?? 0)
  const target = Number(current?.target ?? 0)
  const compliance = target > 0 ? actual / target * 100 : 0
  const cumulativeActual = monthly.reduce((sum, item) => sum + Number(item.data?.actual ?? 0), 0)
  const cumulativeTarget = monthly.reduce((sum, item) => sum + Number(item.data?.target ?? 0), 0)
  const cumulativeCompliance = cumulativeTarget > 0 ? cumulativeActual / cumulativeTarget * 100 : 0
  const productivity = actual / 7
  const leads = Number(operational.leads ?? 0)
  const activeLeads = 14034
  const visits = Number(operational.visits ?? 0)
  const closings = Number(operational.sales ?? 0)
  const conversion = visits > 0 ? closings / visits * 100 : 0
  const statusColor = compliance >= 100 ? '#42b883' : compliance >= 90 ? '#e2b64f' : '#ef655d'
  const statusLabel = compliance >= 100 ? 'Sobre meta' : compliance >= 90 ? 'En rango' : 'Bajo meta'
  const generated = new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Santiago' }).format(new Date())

  const headers = monthly.map((item) => `<th style="padding:11px 6px;text-align:center;font:600 10px/14px Calibri,Arial,sans-serif;color:#83908d;border-bottom:1px solid #2b3533">${item.short}</th>`).join('')
  const row = (label: string, values: string[], total: string) => `<tr>
    <td style="padding:12px 10px;font:600 11px/16px Calibri,Arial,sans-serif;color:#e2e7e5;border-bottom:1px solid #222b29">${label}</td>
    ${values.map((value) => `<td style="padding:12px 6px;text-align:center;font:400 11px/16px Calibri,Arial,sans-serif;color:#a7b0ae;border-bottom:1px solid #222b29">${value}</td>`).join('')}
    <td style="padding:12px 8px;text-align:center;font:700 11px/16px Calibri,Arial,sans-serif;color:#fff;background:#242d2b;border-bottom:1px solid #222b29">${total}</td>
  </tr>`

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Control de Gestión — Cierre ${monthName}</title></head>
<body style="margin:0;background:#070909;color:#fff">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;background:#070909"><tr><td align="center">
<table width="700" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;max-width:700px;border-collapse:collapse;background:#090c0c">
<tr><td style="padding:48px 44px 38px;border-bottom:1px solid #2b3533">
  <div style="font:600 10px/14px Calibri,Arial,sans-serif;letter-spacing:2.2px;color:#7d8987;text-transform:uppercase">Property Partners Vitacura · Control de Gestión</div>
  <div style="font:700 32px/38px Calibri,Arial,sans-serif;color:#fff;margin-top:18px">Cierre ${monthName}</div>
  <div style="font:400 14px/21px Calibri,Arial,sans-serif;color:#a9b2b0;margin-top:9px;max-width:560px">Resultado comercial, avance acumulado y control operacional para decisión ejecutiva.</div>
  <table width="100%" role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;border-top:1px solid #222b29"><tr>
    <td style="padding-top:15px;font:600 10px/15px Calibri,Arial,sans-serif;color:#687572;text-transform:uppercase">Reporte CEO · Enero–${monthName} 2026</td>
    <td align="right" style="padding-top:15px;font:400 10px/15px Calibri,Arial,sans-serif;color:#687572">Generado ${generated}</td>
  </tr></table>
</td></tr>

<tr><td style="padding:38px 36px 30px;border-bottom:1px solid #2b3533">
  <div style="font:700 10px/14px Calibri,Arial,sans-serif;letter-spacing:2px;color:#ef655d;text-transform:uppercase">01 · Resumen ejecutivo</div>
  <div style="font:700 23px/29px Calibri,Arial,sans-serif;color:#fff;margin-top:8px">Resultado comercial de ${monthName}</div>
  <div style="font:400 12px/18px Calibri,Arial,sans-serif;color:#83908d;margin:6px 0 24px">Lectura inmediata del mes y del avance acumulado al corte.</div>
  <table width="100%" role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>
    ${metric('Cierres del mes', nf(actual), `Meta mensual: ${nf(target, 1)}`)}
    ${metric('Cumplimiento mensual', `${nf(compliance)}%`, statusLabel, statusColor)}
  </tr><tr>
    ${metric('Productividad', nf(productivity, 2), 'Cierres por ejecutiva')}
    ${metric(`Acumulado Ene–${monthName}`, nf(cumulativeActual), `Meta: ${nf(cumulativeTarget, 1)} · ${nf(cumulativeCompliance, 1)}%`)}
  </tr></table>
</td></tr>

<tr><td style="padding:38px 44px;border-bottom:1px solid #2b3533">
  <div style="font:700 10px/14px Calibri,Arial,sans-serif;letter-spacing:2px;color:#ef655d;text-transform:uppercase">02 · Evolución comercial</div>
  <div style="font:700 23px/29px Calibri,Arial,sans-serif;color:#fff;margin-top:8px">Enero–${monthName} 2026</div>
  <div style="font:400 12px/18px Calibri,Arial,sans-serif;color:#83908d;margin:6px 0 24px">Resultado, meta, cumplimiento y productividad por mes.</div>
  <table width="100%" role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#111615;border:1px solid #2b3533">
    <tr><th style="padding:11px 10px;text-align:left;font:600 10px/14px Calibri,Arial,sans-serif;color:#83908d;border-bottom:1px solid #2b3533">INDICADOR</th>${headers}<th style="padding:11px 8px;background:#242d2b;font:700 10px/14px Calibri,Arial,sans-serif;color:#fff">ACUM.</th></tr>
    ${row('Cierres', monthly.map((item) => nf(Number(item.data?.actual ?? 0))), nf(cumulativeActual))}
    ${row('Meta', monthly.map((item) => nf(Number(item.data?.target ?? 0), 1)), nf(cumulativeTarget, 1))}
    ${row('Cumplimiento', monthly.map((item) => `${nf(Number(item.data?.compliance ?? 0))}%`), `${nf(cumulativeCompliance)}%`)}
    ${row('Productividad', monthly.map((item) => nf(Number(item.data?.actual ?? 0) / 7, 2)), nf(cumulativeActual / 7, 2))}
  </table>
</td></tr>

<tr><td style="padding:38px 36px 30px;border-bottom:1px solid #2b3533">
  <div style="font:700 10px/14px Calibri,Arial,sans-serif;letter-spacing:2px;color:#ef655d;text-transform:uppercase">03 · Resultados operacionales consolidados</div>
  <div style="font:700 23px/29px Calibri,Arial,sans-serif;color:#fff;margin-top:8px">Embudo operacional actualizado</div>
  <div style="font:400 12px/18px Calibri,Arial,sans-serif;color:#83908d;margin:6px 0 24px">Bloque separado del cierre comercial mensual.</div>
  <table width="100%" role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>
    ${metric('Leads totales', nf(leads), 'Base consolidada CRM')}
    ${metric('Leads activos', nf(activeLeads), `${nf(activeLeads / Math.max(leads, 1) * 100, 1)}% del total`)}
  </tr><tr>
    ${metric('Visitas', nf(visits), 'Actividad registrada')}
    ${metric('Cierres consolidados', nf(closings), `${nf(conversion, 1)}% visita → cierre`, '#42b883')}
  </tr></table>
</td></tr>

<tr><td style="padding:38px 44px;border-bottom:1px solid #2b3533">
  <div style="font:700 10px/14px Calibri,Arial,sans-serif;letter-spacing:2px;color:#ef655d;text-transform:uppercase">04 · Definiciones operacionales</div>
  <div style="font:700 23px/29px Calibri,Arial,sans-serif;color:#fff;margin-top:8px">Estándares de contacto</div>
  <table width="100%" role="presentation" cellpadding="0" cellspacing="0" style="margin-top:22px;border-collapse:collapse;background:#111615;border:1px solid #2b3533">
    <tr><td style="padding:15px 18px;font:700 11px Calibri,Arial,sans-serif;color:#fff;border-bottom:1px solid #2b3533">TIPO</td><td align="center" style="font:600 10px Calibri,Arial,sans-serif;color:#83908d;border-bottom:1px solid #2b3533">PRIMER CONTACTO</td><td align="center" style="font:600 10px Calibri,Arial,sans-serif;color:#83908d;border-bottom:1px solid #2b3533">SEGUIMIENTO</td><td align="center" style="font:600 10px Calibri,Arial,sans-serif;color:#83908d;border-bottom:1px solid #2b3533">RECONTACTO</td></tr>
    <tr><td style="padding:16px 18px;font:700 12px Calibri,Arial,sans-serif;color:#e2e7e5;border-bottom:1px solid #222b29">Casa</td><td align="center" style="font:700 18px Calibri,Arial,sans-serif;color:#fff;border-bottom:1px solid #222b29">48h</td><td align="center" style="font:700 18px Calibri,Arial,sans-serif;color:#fff;border-bottom:1px solid #222b29">24h</td><td align="center" style="font:700 18px Calibri,Arial,sans-serif;color:#fff;border-bottom:1px solid #222b29">7 días</td></tr>
    <tr><td style="padding:16px 18px;font:700 12px Calibri,Arial,sans-serif;color:#e2e7e5">Departamento</td><td align="center" style="font:700 18px Calibri,Arial,sans-serif;color:#fff">24h</td><td align="center" style="font:700 18px Calibri,Arial,sans-serif;color:#fff">12h</td><td align="center" style="font:700 18px Calibri,Arial,sans-serif;color:#fff">5 días</td></tr>
  </table>
</td></tr>

<tr><td style="padding:38px 44px 42px">
  <div style="font:700 10px/14px Calibri,Arial,sans-serif;letter-spacing:2px;color:#ef655d;text-transform:uppercase">05 · Foco de gestión</div>
  <div style="font:700 22px/28px Calibri,Arial,sans-serif;color:#fff;margin-top:8px">Prioridades para el siguiente ciclo</div>
  <table width="100%" role="presentation" cellpadding="0" cellspacing="0" style="margin-top:18px;border-collapse:collapse">
    <tr><td width="34" style="padding:13px 0;font:700 18px Calibri,Arial,sans-serif;color:#ef655d">01</td><td style="padding:13px 0;font:400 12px/18px Calibri,Arial,sans-serif;color:#dce2e0;border-bottom:1px solid #222b29">Seguimiento semanal del pipeline avanzado para cerrar la brecha acumulada.</td></tr>
    <tr><td width="34" style="padding:13px 0;font:700 18px Calibri,Arial,sans-serif;color:#ef655d">02</td><td style="padding:13px 0;font:400 12px/18px Calibri,Arial,sans-serif;color:#dce2e0;border-bottom:1px solid #222b29">Medición real de cumplimiento de los estándares de contacto.</td></tr>
    <tr><td width="34" style="padding:13px 0;font:700 18px Calibri,Arial,sans-serif;color:#ef655d">03</td><td style="padding:13px 0;font:400 12px/18px Calibri,Arial,sans-serif;color:#dce2e0">Separar resultados, operación y benchmarks en toda comunicación ejecutiva.</td></tr>
  </table>
</td></tr>
<tr><td style="padding:22px 44px;background:#060808;border-top:1px solid #2b3533;text-align:center;font:400 9px/15px Calibri,Arial,sans-serif;color:#596461;letter-spacing:.4px">N3URALIA INTELLIGENCE PLATFORM · PROPERTY PARTNERS VITACURA · INFORMACIÓN CONFIDENCIAL</td></tr>
</table></td></tr></table></body></html>`
}
