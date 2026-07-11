import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Property {
  address: string
  price_uf: number
  area_m2: number
  bedrooms: number
  bathrooms: number
  lat: number
  lng: number
  days_on_market: number
}

// Vitacura sector definitions with realistic pricing, location, and barrio_id mapping
const VITACURA_SECTORS = [
  { name: 'Nueva Costanera', barrio_id: 'nueva_costanera', lat_base: -33.3885, lng_base: -70.5820, price_base: 95 },
  { name: 'El Golf', barrio_id: 'el_golf', lat_base: -33.3840, lng_base: -70.5900, price_base: 92 },
  { name: 'La Dehesa', barrio_id: 'la_dehesa', lat_base: -33.3750, lng_base: -70.5770, price_base: 88 },
  { name: 'Apoquindo Alto', barrio_id: 'apoquindo_alto', lat_base: -33.3970, lng_base: -70.5900, price_base: 91 },
  { name: 'Costanera Sur', barrio_id: 'costanera_sur', lat_base: -33.3930, lng_base: -70.5780, price_base: 87 },
  { name: 'La Florida', barrio_id: 'la_florida', lat_base: -33.4020, lng_base: -70.5700, price_base: 82 },
  { name: 'Andrés Bello', barrio_id: 'andres_bello', lat_base: -33.3920, lng_base: -70.6100, price_base: 85 },
  { name: 'Huérfanos', barrio_id: 'huerfanos', lat_base: -33.3850, lng_base: -70.6160, price_base: 84 },
  { name: 'Alonso de Córdova', barrio_id: 'alonso_de_cordova', lat_base: -33.4050, lng_base: -70.6090, price_base: 86 },
  { name: 'Manquehue', barrio_id: 'manquehue', lat_base: -33.4140, lng_base: -70.5990, price_base: 81 },
  { name: 'Vitacura Centro', barrio_id: 'vitacura_centro', lat_base: -33.3900, lng_base: -70.6000, price_base: 89 },
]

// Generate realistic synthetic Vitacura properties
function generateSyntheticProperties(count: number = 75): Property[] {
  const properties: Property[] = []
  const streetNames = [
    'Apoquindo',
    'Alonso de Córdova',
    'Américo Vespucio',
    'La Dehesa',
    'Nueva Costanera',
    'Las Tranqueras',
    'El Castillo',
    'San José de Apoquindo',
    'Bucarest',
    'Moscova',
  ]

  const apartmentTypes = [
    'Depto',
    'Departamento',
    'Apto',
    'Casa',
    'Casa Condominio',
  ]

  for (let i = 0; i < count; i++) {
    const sector = VITACURA_SECTORS[i % VITACURA_SECTORS.length]
    const street = streetNames[Math.floor(Math.random() * streetNames.length)]
    const type = apartmentTypes[Math.floor(Math.random() * apartmentTypes.length)]
    const number = Math.floor(Math.random() * 5000) + 100

    // Generate realistic property data
    const price_uf =
      sector.price_base +
      (Math.random() - 0.5) * 20 + // ±10 UF variation
      (Math.random() < 0.3 ? -10 : 0) // 30% chance of discount

    const area_m2 = Math.max(60, Math.floor(Math.random() * 120 + 50))
    const bedrooms = Math.floor(Math.random() * 3) + 1 // 1-3
    const bathrooms = Math.floor(Math.random() * 2) + 1 // 1-2
    const days_on_market = Math.floor(Math.random() * 150) + 5 // 5-155 days

    // Add realistic variation to coordinates (~50m per unit)
    const lat = sector.lat_base + (Math.random() - 0.5) * 0.0015
    const lng = sector.lng_base + (Math.random() - 0.5) * 0.0015

    properties.push({
      address: `${type} en ${street} ${number}, Vitacura`,
      price_uf: Math.round(price_uf * 100) / 100,
      area_m2,
      bedrooms,
      bathrooms,
      lat,
      lng,
      days_on_market,
    })
  }

  return properties
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    console.log('[v0] Starting property generation (synthetic Vitacura data)...')

    // Generate 50-75 realistic synthetic properties
    const targetCount = 50 + Math.floor(Math.random() * 25)
    const properties = generateSyntheticProperties(targetCount)

    console.log(`[v0] Generated ${properties.length} synthetic properties`)

    // Insert each property with sector-based neighborhood assignment
    const results = await Promise.allSettled(
      properties.map(async (prop, idx) => {
        try {
          // Get neighborhood from the sector that generated this property
          const sector = VITACURA_SECTORS[idx % VITACURA_SECTORS.length]
          const neighborhood = sector.name

          // Insert into properties table
          const { error: insertErr, data: inserted } = await supabase
            .from('properties')
            .insert({
              address: prop.address,
              neighborhood,
              price_uf: prop.price_uf,
              area_m2: prop.area_m2,
              bedrooms: prop.bedrooms,
              bathrooms: prop.bathrooms,
              lat: prop.lat,
              lng: prop.lng,
              status: 'disponible',
              days_on_market: prop.days_on_market,
            })
            .select('id')

          if (insertErr) {
            console.error('[v0] Insert error for', neighborhood, ':', insertErr.message)
            return null
          }

          return inserted ? inserted[0] : null
        } catch (err) {
          console.error('[v0] Error processing property:', err)
          return null
        }
      })
    )

    // Count successful inserts
    const successCount = results.filter(
      (r) => r.status === 'fulfilled' && r.value !== null
    ).length

    console.log(
      `[v0] Generation complete: ${successCount}/${properties.length} properties inserted to DB`
    )

    return NextResponse.json(
      {
        success: true,
        scraped: properties.length,
        inserted: successCount,
        message: `Successfully generated and inserted ${successCount} properties into Vitacura database`,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[v0] Generation error:', error)
    return NextResponse.json(
      {
        error: `Property generation failed: ${(error as Error).message}`,
      },
      { status: 500 }
    )
  }
}
