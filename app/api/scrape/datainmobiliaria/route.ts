import { NextResponse } from 'next/server'
import { validateScraperAccess } from '@/lib/scrapers/route-auth'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const authResponse = validateScraperAccess(request)
  if (authResponse) return authResponse

  return NextResponse.json({
    status: 'quarantined',
    source: 'datainmobiliaria_live',
    writesPerformed: 0,
    reason: 'La salida viva no ha sido conciliada registro a registro con los archivos auditados recibidos.',
    reactivationContract: [
      'Venta en Vitacura solamente.',
      'Identificador y fuente reproducible obligatorios.',
      'Ningún valor por defecto para dormitorios, baños, barrio o superficies.',
      'Validación separada de Portal publicado y CBRS registral.',
      'Activación manual y etiqueta FUENTE VIVA obligatorias.',
    ],
  }, { status: 409 })
}
