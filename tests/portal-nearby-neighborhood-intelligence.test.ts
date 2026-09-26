import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { extractPortalNearbyPlacesFromText } from '../lib/portal-inmobiliario-collector'

test('Portal nearby tabs parse named places and walking distance from the listing UI', () => {
  const sample = `
    Son los puntos más cercanos al inmueble en un rango de 2km.
    Transporte
    Educación
    Áreas verdes
    Comercios
    Paraderos
    Camino La Bodega / Sta María
    8 mins - 635 metros
    Camino La Bodega / Sta María
    8 mins - 656 metros
    Rotonda Lo Curro / Sta María
    10 mins - 765 metros
    Gran Vía / Sta María
    10 mins - 813 metros
  `
  const places = extractPortalNearbyPlacesFromText(sample, 'Transporte')
  assert.equal(places.length, 4)
  assert.equal(places[0]?.name, 'Camino La Bodega / Sta María')
  assert.equal(places[0]?.category, 'transport')
  assert.equal(places[0]?.walk_minutes, 8)
  assert.equal(places[0]?.distance_m, 635)
  assert.equal(places[2]?.name, 'Rotonda Lo Curro / Sta María')
})

test('collector captures all four Portal nearby tabs and preserves the evidence payload', () => {
  const collector = readFileSync('lib/portal-inmobiliario-collector.ts','utf8')
  const normalize = readFileSync('lib/market-source-import.ts','utf8')
  assert.match(collector,/\['Transporte', 'Educación', 'Áreas verdes', 'Comercios'\]/)
  assert.match(collector,/nearby_places:/)
  assert.match(collector,/nearby_place_names:/)
  assert.match(collector,/embeddedCoordinate/)
  assert.match(normalize,/nearby_places:/)
  assert.match(normalize,/portalNearbyPlaces/)
})

test('nearby-place barrio inference requires multi-POI consensus and never rewrites historical source data', () => {
  const sql = readFileSync('supabase/migrations/20260926200000_portal_nearby_poi_neighborhood_intelligence.sql','utf8')
  assert.match(sql,/market_neighborhood_learned_poi_aliases_v1/)
  assert.match(sql,/total_rows>=4/)
  assert.ok(sql.includes("support_rows::numeric/nullif(total_rows,0)>=0.95"))
  assert.match(sql,/matched_places>=3/)
  assert.ok(sql.includes("coalesce(r.min_confidence,0)>=0.98"))
  assert.ok(sql.includes("coalesce(r.support_sum,0)>=15"))
  assert.match(sql,/portal_nearby_poi_consensus_v1/)
  assert.doesNotMatch(sql,/update public\.management_source_records/i)
  assert.doesNotMatch(sql,/update public\.market_neighborhoods/i)
})


test('territory resolver prefers Portal point-in-KML before learned memory', () => {
  const sql = readFileSync('supabase/migrations/20260926203000_coordinate_first_neighborhood_resolution.sql','utf8')
  const point = sql.indexOf("if v_listing.latitude is not null and v_listing.longitude is not null then")
  const memory = sql.indexOf("if v_address_key is not null then")
  assert.ok(point >= 0)
  assert.ok(memory >= 0)
  assert.ok(point < memory)
  assert.match(sql,/point_in_kml/)
  assert.match(sql,/st_covers/)
})

test('daily market refresh prioritizes missing coordinates and uses the second cron as a detail drain', () => {
  const route = readFileSync('app/api/cron/market-refresh/route.ts','utf8')
  const vercel = readFileSync('vercel.json','utf8')
  assert.match(route,/missingGeoBefore/)
  assert.match(route,/missingGeoUrls/)
  assert.match(route,/refresh_market_neighborhood_learning_v1/)
  assert.match(vercel,/market-refresh\?details_only=1/)
})


test('secondary territory signals cannot auto-resolve and learned aliases train only from point-in-KML truth', () => {
  const sql = readFileSync('supabase/migrations/20260926204500_harden_secondary_neighborhood_signals.sql','utf8')
  assert.match(sql,/resolution_kind is distinct from 'point_in_kml'/)
  assert.match(sql,/sig\.resolution_kind='point_in_kml'/)
  assert.match(sql,/training_truth','point_in_kml'/)
  assert.match(sql,/support_rows::numeric\/nullif\(total_rows,0\)>=0\.98/)
  assert.doesNotMatch(sql,/decision='resolved_by_system'[\s\S]{0,500}accepted_memory/)
})
