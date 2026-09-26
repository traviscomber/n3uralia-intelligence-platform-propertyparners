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
  assert.match(sql,/confidence.*0\.95/i)
  assert.match(sql,/matched_places>=3/)
  assert.match(sql,/min_confidence,0\)>=0\.98/)
  assert.match(sql,/support_sum,0\)>=15/)
  assert.match(sql,/portal_nearby_poi_consensus_v1/)
  assert.doesNotMatch(sql,/update public\.management_source_records/i)
  assert.doesNotMatch(sql,/update public\.market_neighborhoods/i)
})
