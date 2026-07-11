import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  try {
    const pdfPath = join(process.cwd(), 'public', 'propuesta-profesional-completa.pdf')
    const pdfBuffer = readFileSync(pdfPath)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Propuesta-Comercial-N3uralia.pdf"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('[v0] Error descargando PDF:', error)
    return NextResponse.json(
      { error: 'Error al descargar el PDF' },
      { status: 500 }
    )
  }
}
