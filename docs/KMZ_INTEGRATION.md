# KMZ Integration for Property Partners

## Overview

The KMZ file contains 12 Vitacura sector polygons for geographic neighborhood identification. This enables automatic neighborhood assignment for properties and market analysis visualization.

## Files

- **KMZ file:** `/public/vitacura-sectors.kmz` (1.1 KB)
- **Download endpoint:** `/api/kmz` (redirects to KMZ download)
- **12 Sectors:** Vitacura Centro, El Golf, La Dehesa, Nueva Costanera, Costanera Sur, Cerro San Cristóbal, La Florida, Andrés Bello, Huérfanos, Apoquindo Alto, Alonso de Córdova, Manquehue

## How KMZ Works

1. **KMZ Format:** ZIP archive containing KML (Keyhole Markup Language) XML file
2. **Content:** Geographic polygons defining neighborhood boundaries
3. **Use Case:** Point-in-polygon queries to assign neighborhood to property coordinates

## Phase 1: Database Setup

### Step 1: Create Supabase PostGIS Table

```sql
CREATE TABLE IF NOT EXISTS neighborhoods (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sector_name VARCHAR(255) UNIQUE NOT NULL,
  geometry GEOGRAPHY(POLYGON, 4326) NOT NULL,
  velocity_days INT DEFAULT NULL,
  avg_price_uf DECIMAL(10, 2) DEFAULT NULL,
  absorption_rate DECIMAL(5, 2) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create spatial index
CREATE INDEX idx_neighborhoods_geometry ON neighborhoods USING GIST(geometry);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_neighborhoods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER neighborhoods_updated_at
BEFORE UPDATE ON neighborhoods
FOR EACH ROW
EXECUTE FUNCTION update_neighborhoods_updated_at();
```

### Step 2: Convert KMZ to GeoJSON and Populate Database

```bash
# Extract KMZ (it's a ZIP)
unzip vitacura-sectors.kmz doc.kml

# Convert KML to GeoJSON using ogr2ogr (GDAL)
ogr2ogr -f GeoJSON vitacura-sectors.geojson doc.kml

# Parse GeoJSON and insert into Supabase using Python or Node.js script
```

### Step 3: Point-in-Polygon Query

```sql
-- Find neighborhood for a given property coordinate
SELECT id, name, sector_name 
FROM neighborhoods 
WHERE ST_Contains(geometry, ST_Point(-70.5935, -33.3834)::GEOGRAPHY)
LIMIT 1;
```

## Phase 2: Frontend Integration

### Visualize in Market Intelligence Dashboard

```typescript
import maplibre from 'maplibre-gl'
import { neighborhoods } from '@/lib/neighborhoods'

const map = new maplibre.Map({
  container: 'map',
  style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  center: [-70.5935, -33.3834],
  zoom: 13,
})

// Add neighborhoods GeoJSON source
map.addSource('neighborhoods', {
  type: 'geojson',
  data: neighborhoodsGeoJSON,
})

// Color by velocity
map.addLayer({
  id: 'neighborhoods-fill',
  type: 'fill',
  source: 'neighborhoods',
  paint: {
    'fill-color': [
      'case',
      ['==', ['get', 'velocity_days'], null],
      '#gray',
      ['<', ['get', 'velocity_days'], 30],
      '#10b981', // Fast
      ['<', ['get', 'velocity_days'], 60],
      '#f59e0b', // Medium
      '#ef4444', // Slow
    ],
    'fill-opacity': 0.6,
  },
})

// Add outline
map.addLayer({
  id: 'neighborhoods-outline',
  type: 'line',
  source: 'neighborhoods',
  paint: {
    'line-color': '#ffffff',
    'line-width': 1,
  },
})
```

## Phase 3: Scraper Integration

When scraping Portal Inmobiliario:

```typescript
async function assignNeighborhood(propertyLng: number, propertyLat: number) {
  const { data } = await supabase
    .rpc('get_neighborhood_for_point', {
      point_lng: propertyLng,
      point_lat: propertyLat,
    })
  
  return data?.[0]?.sector_name || 'Unknown'
}

// Use in scraper
for (const property of properties) {
  property.neighborhood = await assignNeighborhood(
    property.longitude,
    property.latitude
  )
}
```

## Testing

### Download KMZ
```bash
curl http://localhost:3000/api/kmz -o vitacura-test.kmz
```

### View in Google Earth
1. Download from `/api/kmz`
2. Open in Google Earth Pro
3. Verify 12 sectors display correctly

### Test Point-in-Polygon
```sql
-- Test with Vitacura Centro coordinates
SELECT * FROM neighborhoods 
WHERE ST_Contains(geometry, ST_Point(-70.5935, -33.3834)::GEOGRAPHY);
-- Should return: Vitacura Centro
```

## Next Steps

1. Setup Supabase PostGIS table
2. Extract and convert KMZ to GeoJSON
3. Populate neighborhoods table
4. Create RPC function for point-in-polygon queries
5. Integrate with scraper
6. Build Market Intelligence dashboard visualization
7. Add velocity/pricing data to neighborhoods table

## Resources

- [KML Reference](https://developers.google.com/kml/documentation/kml_tut)
- [PostGIS Geography Functions](https://postgis.net/docs/reference/functions/geography.html)
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/)
- [GDAL ogr2ogr](https://gdal.org/programs/ogr2ogr.html)
