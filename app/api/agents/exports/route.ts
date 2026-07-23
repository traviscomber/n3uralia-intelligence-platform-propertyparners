import { NextResponse, type NextRequest } from 'next/server'
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { requireRoleAccess } from '@/lib/api-access'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type ExportFormat = 'pdf' | 'docx'

type ArtifactRow = {
  id: string
  run_id: string
  artifact_type: string
  title: string
  version: number
  content: Record<string, unknown> | null
  created_at: string
  agent_runs: {
    id: string
    agent_key: string
    title: string
    status: string
    confidence: number | string | null
    created_at: string
  } | null
}

function sanitizeFilename(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'n3uralia-export'
}

function formatValue(value: unknown, depth = 0): string[] {
  if (value === null || value === undefined) return ['—']
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return [String(value)]
  if (Array.isArray(value)) {
    if (!value.length) return ['—']
    return value.flatMap((item, index) => {
      const lines = formatValue(item, depth + 1)
      return lines.map((line, lineIndex) => `${lineIndex === 0 ? `${index + 1}. ` : '   '}${line}`)
    })
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => {
      const lines = formatValue(item, depth + 1)
      if (lines.length === 1) return [`${key}: ${lines[0]}`]
      return [`${key}:`, ...lines.map((line) => `  ${line}`)]
    })
  }
  return [String(value)]
}

function artifactSections(artifact: ArtifactRow) {
  const content = artifact.content || {}
  return Object.entries(content).map(([title, value]) => ({
    title,
    lines: formatValue(value),
  }))
}

function wrapText(text: string, maxChars = 92) {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines
}

async function buildPdf(artifact: ArtifactRow) {
  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const pageSize: [number, number] = [595.28, 841.89]
  const margin = 48
  let page = pdf.addPage(pageSize)
  let y = page.getHeight() - margin

  const addPage = () => {
    page = pdf.addPage(pageSize)
    y = page.getHeight() - margin
  }

  const writeLine = (text: string, options?: { size?: number; isBold?: boolean; gapAfter?: number }) => {
    const size = options?.size ?? 10
    const font = options?.isBold ? bold : regular
    for (const line of wrapText(text, size >= 16 ? 62 : 92)) {
      if (y < margin + size * 2) addPage()
      page.drawText(line, { x: margin, y, size, font, color: rgb(0.12, 0.12, 0.12) })
      y -= size * 1.35
    }
    y -= options?.gapAfter ?? 2
  }

  writeLine('PROPERTY PARTNERS VITACURA', { size: 9, isBold: true, gapAfter: 8 })
  writeLine(artifact.title, { size: 20, isBold: true, gapAfter: 8 })
  writeLine(`Agente: ${artifact.agent_runs?.agent_key || '—'}`, { size: 10 })
  writeLine(`Estado: ${artifact.agent_runs?.status || '—'}`, { size: 10 })
  writeLine(`Confianza: ${artifact.agent_runs?.confidence !== null && artifact.agent_runs?.confidence !== undefined ? `${Math.round(Number(artifact.agent_runs.confidence) * 100)}%` : '—'}`, { size: 10 })
  writeLine(`Versión: ${artifact.version} · Generado: ${new Date(artifact.created_at).toLocaleString('es-CL')}`, { size: 10, gapAfter: 12 })

  for (const section of artifactSections(artifact)) {
    writeLine(section.title, { size: 14, isBold: true, gapAfter: 5 })
    for (const line of section.lines) writeLine(line, { size: 9, gapAfter: 1 })
    y -= 6
  }

  writeLine('Documento generado por N3uralia Intelligence Platform. Requiere validación humana antes de distribución externa.', { size: 8, gapAfter: 0 })
  return pdf.save()
}

async function buildDocx(artifact: ArtifactRow) {
  const children: Paragraph[] = [
    new Paragraph({ text: 'PROPERTY PARTNERS VITACURA', heading: HeadingLevel.HEADING_3 }),
    new Paragraph({ text: artifact.title, heading: HeadingLevel.TITLE }),
    new Paragraph({ children: [new TextRun({ text: `Agente: ${artifact.agent_runs?.agent_key || '—'}`, bold: true })] }),
    new Paragraph({ text: `Estado: ${artifact.agent_runs?.status || '—'}` }),
    new Paragraph({ text: `Confianza: ${artifact.agent_runs?.confidence !== null && artifact.agent_runs?.confidence !== undefined ? `${Math.round(Number(artifact.agent_runs.confidence) * 100)}%` : '—'}` }),
    new Paragraph({ text: `Versión: ${artifact.version} · Generado: ${new Date(artifact.created_at).toLocaleString('es-CL')}` }),
  ]

  for (const section of artifactSections(artifact)) {
    children.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_2 }))
    for (const line of section.lines) children.push(new Paragraph({ text: line }))
  }

  children.push(new Paragraph({ children: [new TextRun({ text: 'Documento generado por N3uralia Intelligence Platform. Requiere validación humana antes de distribución externa.', italics: true })] }))

  const document = new Document({ sections: [{ properties: {}, children }] })
  return Packer.toBuffer(document)
}

export async function GET(request: NextRequest) {
  const access = await requireRoleAccess(['admin', 'ceo', 'director', 'analyst', 'seller'])
  if (!access.allowed) return NextResponse.json({ error: 'Acceso restringido.' }, { status: access.status })

  const runId = request.nextUrl.searchParams.get('runId')
  const artifactId = request.nextUrl.searchParams.get('artifactId')
  const format = request.nextUrl.searchParams.get('format') as ExportFormat | null
  if ((!runId && !artifactId) || !format || !['pdf', 'docx'].includes(format)) {
    return NextResponse.json({ error: 'Parámetros de exportación inválidos.' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    let query = supabase
      .from('agent_artifacts')
      .select('id,run_id,artifact_type,title,version,content,created_at,agent_runs(id,agent_key,title,status,confidence,created_at)')
      .order('version', { ascending: false })
      .limit(1)
    query = artifactId ? query.eq('id', artifactId) : query.eq('run_id', runId as string)

    const { data, error } = await query.maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'No se encontró un artefacto exportable.' }, { status: 404 })

    const artifact = data as unknown as ArtifactRow
    const filename = `${sanitizeFilename(artifact.title)}-v${artifact.version}.${format}`
    const bytes = format === 'pdf' ? await buildPdf(artifact) : await buildDocx(artifact)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('agent_notifications').insert({
        recipient_id: user.id,
        run_id: artifact.run_id,
        notification_type: 'export_ready',
        title: 'Exportación generada',
        message: `${artifact.title} fue exportado en formato ${format.toUpperCase()}.`,
        action_url: '/dashboard/agents',
        metadata: { artifactId: artifact.id, format, filename },
      })
    }

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo generar la exportación.' }, { status: 500 })
  }
}
