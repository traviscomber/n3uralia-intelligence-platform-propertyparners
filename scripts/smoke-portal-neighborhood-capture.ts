import { collectPortalListingDetails } from '../lib/portal-inmobiliario-collector'

const listingUrls = [
  'https://www.portalinmobiliario.com/MLC-3746582404-casa-nueva-en-vitacura-500-m2-terreno-_JM',
  'https://www.portalinmobiliario.com/MLC-2268794121-colegio-aleman-i-gran-terreno-i-muy-amplia-e-impecable-_JM',
  'https://www.portalinmobiliario.com/MLC-4460709738-casa-en-pasaje-cerrado-buenaventura-vitacura-_JM',
  'https://www.portalinmobiliario.com/MLC-4366172680-mediterranea-i-lo-beltran-i-pasaje-cerrado-i-espectacular-_JM',
  'https://www.portalinmobiliario.com/MLC-4061318012-casa-en-venta-de-4-dorm-en-vitacura-_JM',
  'https://www.portalinmobiliario.com/MLC-2241156247-nuestra-senora-del-rosario-las-hualtatas-_JM',
  'https://www.portalinmobiliario.com/MLC-4502770418-casa-en-venta-de-3-dorm-43-sala-estar-en-vitacura-nueva-_JM',
  'https://www.portalinmobiliario.com/MLC-4441137922-impecable-completamente-remodelada-espaciosa-plano-pa-rabat-_JM',
  'https://www.portalinmobiliario.com/MLC-4394167412-casa-con-departamento-independiente-_JM',
  'https://www.portalinmobiliario.com/MLC-2235118265-estadio-croata-_JM',
  'https://www.portalinmobiliario.com/MLC-4212612404-colegio-aleman-_JM',
  'https://www.portalinmobiliario.com/MLC-4343918078-casa-calle-tranquila-cuatro-dormitorios-y-cuatro-banos-_JM',
  'https://www.portalinmobiliario.com/MLC-2219206491-casa-en-venta-de-4-dorm-en-vitacura-_JM',
  'https://www.portalinmobiliario.com/MLC-2235118353-colegio-aleman-_JM',
  'https://www.portalinmobiliario.com/MLC-3815715442-casa-familiar-en-escriva-de-balaguer-_JM',
  'https://www.portalinmobiliario.com/MLC-2235118505-colegio-la-maisonnette-_JM',
  'https://www.portalinmobiliario.com/MLC-4491449200-alianza-francesa-club-de-polo-casa-impecable-_JM',
  'https://www.portalinmobiliario.com/MLC-4229049324-club-de-polo-_JM',
  'https://www.portalinmobiliario.com/MLC-4491449150-alianza-francesa-club-de-polo-gran-terreno-_JM',
  'https://www.portalinmobiliario.com/MLC-4484378282-club-de-polo-saint-george-acogedora-_JM',
  'https://www.portalinmobiliario.com/MLC-4491449182-precioso-jardin-casa-amplia-con-gran-potencial-bradford-_JM',
  'https://www.portalinmobiliario.com/MLC-2098617565-colegio-la-maissonette-_JM',
  'https://www.portalinmobiliario.com/MLC-4349830382-colegio-la-maisonnete-_JM',
  'https://www.portalinmobiliario.com/MLC-2074090859-estadio-croata-_JM',
]

const result = await collectPortalListingDetails({
  datasetKind: 'portal_houses',
  listingUrls,
  waitMs: 250,
})

const rows = result.rows.map((row) => ({
  source_listing_id: row.source_listing_id,
  latitude: row.latitude ?? null,
  longitude: row.longitude ?? null,
  address: row.address ?? null,
  nearby_places: Array.isArray(row.nearby_places) ? row.nearby_places : [],
}))

const summary = {
  requested: listingUrls.length,
  captured: rows.length,
  failed: result.failures.length,
  withCoordinates: rows.filter((row) => row.latitude != null && row.longitude != null).length,
  withNearbyPlaces: rows.filter((row) => row.nearby_places.length > 0).length,
  totalNearbyPlaces: rows.reduce((sum, row) => sum + row.nearby_places.length, 0),
  rows,
  failures: result.failures,
}

console.log('PORTAL_NEIGHBORHOOD_CAPTURE_RESULT=' + JSON.stringify(summary))
