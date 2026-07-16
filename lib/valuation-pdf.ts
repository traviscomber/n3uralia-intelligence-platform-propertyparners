import {
  buildFallbackValuationAnalysis,
  type ValuationAnalysis,
  type ValuationRequest,
} from '@/lib/valuation-ai'

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89

type PdfLine = {
  text: string
  x: number
  y: number
  size: number
  bold?: boolean
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

  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

function pushLine(lines: PdfLine[], text: string, x: number, y: number, size: number, bold = false) {
  lines.push({ text, x, y, size, bold })
}

function pushWrapped(lines: PdfLine[], text: string, x: number, y: number, size: number, maxChars: number, bold = false) {
  wrapText(text, maxChars).forEach((line, index) => {
    pushLine(lines, line, x, y - index * (size + 3), size, bold)
  })
}

function moneyUF(value: number) {
  return `${Math.round(value).toLocaleString('es-CL')} UF`
}

function moneyCLP(value: number) {
  return `$${Math.round(value).toLocaleString('es-CL')} CLP`
}

function buildLines(request: ValuationRequest, analysis: ValuationAnalysis) {
  const lines: PdfLine[] = []
  let y = 796

  pushLine(lines, 'Valorizacion comercial Vitacura', 48, y, 20, true)
  y -= 24
  pushLine(lines, `${analysis.title}`, 48, y, 12, true)
  y -= 16
  pushLine(lines, `Barrio: ${request.neighborhood.name} | Condicion: ${request.condition} | Area: ${request.area_m2} m2`, 48, y, 10)
  y -= 14
  pushLine(lines, `Fecha: ${new Date().toLocaleDateString('es-CL')} | Fuente: ${analysis.source === 'openai' ? 'OpenAI + fallback comercial' : 'Fallback comercial'}`, 48, y, 10)

  y -= 26
  pushLine(lines, 'Resumen comercial', 48, y, 14, true)
  y -= 18
  pushWrapped(lines, analysis.summary, 48, y, 10, 74)
  y -= 34

  pushLine(lines, 'Precio recomendado', 48, y, 14, true)
  y -= 18
  pushLine(lines, `Precio de publicacion: ${moneyUF(analysis.price_bands.find((band) => band.label === 'aspiracional')?.value_uf || request.estimated_uf)}`, 48, y, 11)
  y -= 14
  pushLine(lines, `Precio de cierre objetivo: ${moneyUF(analysis.price_bands.find((band) => band.label === 'mercado')?.value_uf || request.estimated_uf)}`, 48, y, 11)
  y -= 14
  pushLine(lines, `Piso de negociacion: ${moneyUF(analysis.price_bands.find((band) => band.label === 'piso_negociacion')?.value_uf || request.estimated_uf)}`, 48, y, 11)
  y -= 14
  pushLine(lines, `Estimacion base: ${moneyUF(request.estimated_uf)} | ${moneyCLP(request.estimated_clp)}`, 48, y, 11)

  y -= 24
  pushLine(lines, 'Sensibilidad y lectura', 48, y, 14, true)
  y -= 18
  analysis.sensitivities.slice(0, 4).forEach((item) => {
    pushWrapped(lines, `${item.factor}: ${item.direction === 'down' ? '-' : '+'}${moneyUF(item.impact_uf)} - ${item.note}`, 48, y, 10, 74)
    y -= 22
  })

  y -= 2
  pushLine(lines, 'Reportes por rol', 48, y, 14, true)
  y -= 18
  pushLine(lines, 'Vendedor: foco en cierre, objeciones y siguiente accion comercial.', 48, y, 10)
  y -= 14
  pushLine(lines, 'Director: foco en desempeno del equipo, brechas y priorizacion de cartera.', 48, y, 10)
  y -= 14
  pushLine(lines, 'CEO: foco en negocio, riesgos, directores y lectura ejecutiva del mercado.', 48, y, 10)

  y -= 24
  pushLine(lines, 'Comparables principales', 48, y, 14, true)
  y -= 18
  request.selected_comparables.slice(0, 3).forEach((item, index) => {
    pushWrapped(
      lines,
      `${index + 1}. ${item.address} | ${item.neighborhood} | ${item.bedrooms}D/${item.bathrooms}B | ${moneyUF(item.price_uf)} | score ${item.score.toFixed(0)}%`,
      48,
      y,
      10,
      74,
    )
    y -= 18
  })

  y -= 8
  pushLine(lines, 'Acciones sugeridas', 48, y, 14, true)
  y -= 18
  analysis.actions.slice(0, 3).forEach((item) => {
    pushWrapped(lines, `- ${item}`, 48, y, 10, 74)
    y -= 18
  })

  y -= 4
  pushLine(lines, `Confianza: ${analysis.confidence_note}`, 48, y, 10)

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

export async function buildValuationPdfBuffer(request: ValuationRequest, analysis?: ValuationAnalysis | null) {
  const resolvedAnalysis = analysis || buildFallbackValuationAnalysis(request)
  return buildPdfBuffer(buildLines(request, resolvedAnalysis))
}

