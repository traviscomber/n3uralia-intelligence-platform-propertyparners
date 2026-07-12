import type { DirectorReportBundle, DirectorReportRow } from '@/lib/director-reports'

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89

type PdfLine = {
  text: string
  x: number
  y: number
  size: number
  bold?: boolean
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatMoney(value: number) {
  return value.toLocaleString('es-CL', { maximumFractionDigits: 0 })
}

function escapePdfText(text: string) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function wrapText(text: string, maxChars: number) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }

  if (current) {
    lines.push(current)
  }

  return lines.length ? lines : ['']
}

function pushLine(lines: PdfLine[], text: string, x: number, y: number, size: number, bold = false) {
  lines.push({ text, x, y, size, bold })
}

function pushWrappedLines(lines: PdfLine[], text: string, x: number, y: number, size: number, maxChars: number, bold = false) {
  wrapText(text, maxChars).forEach((line, index) => {
    pushLine(lines, line, x, y - index * (size + 3), size, bold)
  })
}

function statusLabel(status: string) {
  if (status === 'on_track') return 'En linea'
  if (status === 'warning') return 'En observacion'
  return 'Bajo objetivo'
}

function buildContentLines(bundle: DirectorReportBundle) {
  const lines: PdfLine[] = []
  let y = 796

  pushLine(lines, 'Reporte por Director', 48, y, 20, true)
  y -= 24
  pushLine(lines, `Director: ${bundle.directorId}`, 48, y, 10)
  y -= 14
  pushLine(lines, `Generado: ${new Date().toLocaleString('es-CL')}`, 48, y, 10)
  y -= 14
  pushLine(lines, `Reportes persistidos: ${bundle.metrics.reportCount}`, 48, y, 10)

  y -= 28
  pushLine(lines, 'Resumen ejecutivo', 48, y, 14, true)
  y -= 18
  pushLine(lines, `Ventas acumuladas: ${bundle.metrics.totalSales}`, 48, y, 11)
  y -= 14
  pushLine(lines, `Comision total: ${formatMoney(bundle.metrics.totalCommission)} UF`, 48, y, 11)
  y -= 14
  pushLine(lines, `Conversion promedio: ${bundle.metrics.avgConversion.toFixed(1)}%`, 48, y, 11)
  y -= 14
  pushLine(lines, `Objetivo actual: ${bundle.metrics.targetProgress}%`, 48, y, 11)
  y -= 14
  pushLine(lines, `Cambio velocidad: ${bundle.metrics.velocityChange.toFixed(1)} dias`, 48, y, 11)
  y -= 14
  pushLine(lines, `Estado actual: ${statusLabel(bundle.metrics.latestStatus)}`, 48, y, 11)

  y -= 26
  pushLine(lines, 'Reporte mas reciente', 48, y, 14, true)
  y -= 18
  if (bundle.latestReport) {
    pushLine(lines, `Semana ${formatDate(bundle.latestReport.week_start)} - ${formatDate(bundle.latestReport.week_end)}`, 48, y, 11, true)
    y -= 14
    pushLine(
      lines,
      `Ventas ${bundle.latestReport.sales_count} | Comision ${formatMoney(bundle.latestReport.commission_total)} UF | Conversion ${bundle.latestReport.conversion_rate.toFixed(1)}%`,
      48,
      y,
      10,
    )
    y -= 14
    pushLine(
      lines,
      `Objetivo ${bundle.latestReport.target_progress}% | Velocidad ${bundle.latestReport.velocity_change.toFixed(1)} dias | Estado ${statusLabel(bundle.latestReport.status)}`,
      48,
      y,
      10,
    )
  } else {
    pushLine(lines, 'No hay reporte semanal persistido para este director.', 48, y, 10)
  }

  y -= 26
  pushLine(lines, 'Ultimos reportes', 48, y, 14, true)
  y -= 18
  if (bundle.reports.length) {
    bundle.reports.slice(0, 5).forEach((report, index) => {
      pushLine(lines, `${index + 1}. ${formatDate(report.week_start)} - ${formatDate(report.week_end)} | ${report.sales_count} ventas | ${report.target_progress}% objetivo | ${statusLabel(report.status)}`, 48, y, 10)
      y -= 14
      pushWrappedLines(
        lines,
        `Conversion ${report.conversion_rate.toFixed(1)}% | Velocidad ${report.velocity_change.toFixed(1)} dias | Comision ${formatMoney(report.commission_total)} UF`,
        58,
        y,
        9,
        70,
      )
      y -= 18
    })
  } else {
    pushLine(lines, 'Todavia no hay reportes persistidos para este director.', 48, y, 10)
  }

  y -= 8
  pushLine(lines, 'Snapshots KPI', 48, y, 14, true)
  y -= 18
  if (bundle.kpis.length) {
    bundle.kpis.slice(0, 4).forEach((snapshot) => {
      pushLine(
        lines,
        `${formatDate(snapshot.period_date)} | ${snapshot.ventas_count} ventas | ${snapshot.conversion_rate.toFixed(1)}% conversion | ${snapshot.velocidad_venta ?? 0} dias | target ${snapshot.monthly_target ?? 0}`,
        48,
        y,
        10,
      )
      y -= 14
    })
  } else {
    pushLine(lines, 'Sin snapshots KPI recientes.', 48, y, 10)
  }

  return lines
}

function buildPdfBuffer(lines: PdfLine[]) {
  const contentParts = lines.map((line) => {
    const fontName = line.bold ? 'F2' : 'F1'
    return `BT /${fontName} ${line.size} Tf ${line.x} ${line.y} Td (${escapePdfText(line.text)}) Tj ET`
  })
  const content = contentParts.join('\n')
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >> endobj`,
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj',
    `6 0 obj << /Length ${Buffer.byteLength(content, 'utf8')} >> stream\n${content}\nendstream endobj`,
  ]

  let offset = Buffer.byteLength('%PDF-1.4\n', 'utf8')
  const offsets = [0]
  const bodyParts: Buffer[] = [Buffer.from('%PDF-1.4\n', 'utf8')]

  for (const object of objects) {
    offsets.push(offset)
    const body = Buffer.from(`${object}\n`, 'utf8')
    bodyParts.push(body)
    offset += body.length
  }

  const xrefOffset = offset
  const xrefEntries = ['0000000000 65535 f ']
  for (let i = 1; i < offsets.length; i += 1) {
    xrefEntries.push(`${offsets[i].toString().padStart(10, '0')} 00000 n `)
  }

  const xref = `xref\n0 ${offsets.length}\n${xrefEntries.join('\n')}\n`
  const trailer = `trailer << /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`

  bodyParts.push(Buffer.from(xref, 'utf8'))
  bodyParts.push(Buffer.from(trailer, 'utf8'))

  return Buffer.concat(bodyParts)
}

export async function buildDirectorReportPdfBuffer(bundle: DirectorReportBundle) {
  return buildPdfBuffer(buildContentLines(bundle))
}
