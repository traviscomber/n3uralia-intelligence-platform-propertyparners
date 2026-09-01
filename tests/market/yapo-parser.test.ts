import assert from 'node:assert/strict'
import test from 'node:test'
import { extractYapoListingUrls, parseYapoListingHtml } from '../../lib/yapo-collector'

test('extractYapoListingUrls keeps only canonical Yapo house listing URLs', () => {
  const urls = extractYapoListingUrls([
    'https://www.yapo.cl/bienes-raices-venta-de-propiedades-casas/casa-en-sector-exclusivo-de-vitacura/32770580?utm_source=test',
    'https://yapo.cl/bienes-raices-venta-de-propiedades-casas/casa-en-sector-exclusivo-de-vitacura/32770580#photos',
    'https://www.yapo.cl/paginas/region-metropolitana/vitacura/comprar/casa',
    'https://example.com/bienes-raices-venta-de-propiedades-casas/casa/32770580',
  ])

  assert.deepEqual(urls, [
    'https://www.yapo.cl/bienes-raices-venta-de-propiedades-casas/casa-en-sector-exclusivo-de-vitacura/32770580',
  ])
})

test('parseYapoListingHtml extracts commercially useful Vitacura house facts without inventing address', () => {
  const html = `
    <html>
      <head><meta property="og:title" content="Casa en Sector Exclusivo de Vitacura" /></head>
      <body>
        <h1>Casa en Sector Exclusivo de Vitacura</h1>
        Vitacura 29/07/2026
        Casas en Vitacura | Casa en Sector Exclusivo de Vitacura
        UF25.000,00
        Ref.: 36670V
        Precio UF25.000,00
        Dormitorios 5
        Baños 4
        Estacionamientos 3
        Área construida (m²) 216
        Publicado 29/07/2026
        Precio/M² de construcción UF115,74
        Precio/M² de terreno UF49,01
        M² totales 510
        Dirección exacta ¡Pregunta al anunciante!
        Año de construcción 1971
        Niveles 2
        Descripción Casa familiar en Vitacura.
      </body>
    </html>
  `

  const row = parseYapoListingHtml(
    'https://www.yapo.cl/bienes-raices-venta-de-propiedades-casas/casa-en-sector-exclusivo-de-vitacura/32770580',
    html,
  )

  assert.equal(row.source_system, 'yapo')
  assert.equal(row.source_listing_id, '32770580')
  assert.equal(row.source_reference, '36670V')
  assert.equal(row.title, 'Casa en Sector Exclusivo de Vitacura')
  assert.equal(row.address, null)
  assert.equal(row.locality, 'Vitacura')
  assert.equal(row.price_uf, 25000)
  assert.equal(row.price_uf_m2, 115.74)
  assert.equal(row.built_area_m2, 216)
  assert.equal(row.land_area_m2, 510)
  assert.equal(row.bedrooms, 5)
  assert.equal(row.bathrooms, 4)
  assert.equal(row.parking_spaces, 3)
  assert.equal(row.construction_year, 1971)
  assert.equal(row.published_at, '2026-07-29T00:00:00.000Z')
})
