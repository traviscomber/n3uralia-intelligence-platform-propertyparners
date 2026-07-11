#!/usr/bin/env node

/**
 * KMZ to GeoJSON Converter
 * 
 * Converts Vitacura KMZ file to GeoJSON format for Supabase PostGIS integration
 * Usage: node scripts/kmz-to-geojson.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parseStringPromise } from 'xml2js'
import AdmZip from 'adm-zip'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function kmzToGeoJSON() {
  try {
    // Read KMZ file
    const kmzPath = path.join(__dirname, '../public/vitacura-sectors.kmz')
    const zipBuffer = fs.readFileSync(kmzPath)
    const zip = new AdmZip(zipBuffer)

    // Extract KML from ZIP
    const kmlEntry = zip.getEntry('doc.kml')
    if (!kmlEntry) {
      throw new Error('doc.kml not found in KMZ')
    }

    const kmlString = kmlEntry.getData().toString('utf8')
    
    // Parse KML XML
    const kmlJson = await parseStringPromise(kmlString)
    
    // Extract features from KML
    const features = []
    const placemarks = kmlJson.kml.Document[0].Placemark || []

    placemarks.forEach((placemark) => {
      const name = placemark.name?.[0] || 'Unknown'
      const description = placemark.description?.[0] || ''

      if (placemark.Polygon && placemark.Polygon[0]) {
        const polygon = placemark.Polygon[0]
        const coordinates = polygon.outerBoundaryIs?.[0]?.LinearRing?.[0]?.coordinates?.[0]

        if (coordinates) {
          // Parse coordinates string "lng,lat,alt lng,lat,alt ..."
          const coordArray = coordinates
            .trim()
            .split('\n')
            .map((coord) => coord.trim())
            .filter((coord) => coord)
            .map((coord) => {
              const [lng, lat, alt] = coord.split(',').map(Number)
              return [lng, lat]
            })

          if (coordArray.length >= 3) {
            features.push({
              type: 'Feature',
              properties: {
                name,
                description,
                sector_name: name,
              },
              geometry: {
                type: 'Polygon',
                coordinates: [coordArray],
              },
            })
          }
        }
      }
    })

    // Create GeoJSON FeatureCollection
    const geojson = {
      type: 'FeatureCollection',
      features,
    }

    // Write GeoJSON to file
    const outputPath = path.join(__dirname, '../public/vitacura-sectors.geojson')
    fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2))

    console.log('✓ KMZ converted to GeoJSON successfully')
    console.log(`✓ Output: ${outputPath}`)
    console.log(`✓ Features: ${features.length}`)
    console.log(`✓ Ready for Supabase import`)

    return geojson
  } catch (error) {
    console.error('✗ Error converting KMZ:', error.message)
    process.exit(1)
  }
}

kmzToGeoJSON()
