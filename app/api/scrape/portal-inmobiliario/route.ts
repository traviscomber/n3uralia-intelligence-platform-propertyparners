import { NextResponse } from 'next/server'
import { validateScraperAccess } from '@/lib/scrapers/route-auth'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const authResponse = validateScraperAccess(request)
  if (authResponse) return authResponse

  return NextResponse.json({
    status: 'quarantined',
    source: 'portal_inmobiliario_live',
    writesPerformed: 0,
    reason: 'La implementación heredada imputaba campos ausentes y fue retirada del runtime.',
    reactivationContract: [
      'Venta de casas y departamentos en Vitacura solamente.',
      'Listing ID y URL de origen obligatorios.',
      'Campos ausentes permanecen null; no se estiman coordenadas, superficies, dormitorios ni días.',
      'Conciliación contra los 5.197 IDs únicos del snapshot auditado antes de publicar.',
      'Activación manual y etiqueta FUENTE VIVA obligatorias.',
    ],
  }, { status: 409 })
}
