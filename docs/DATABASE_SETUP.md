# Property Partners - Database Setup Guide

## Overview

This guide will help you set up the Property Partners database with PostGIS support for geospatial queries.

## Prerequisites

- Supabase project created and connected
- Environment variables configured (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- Node.js and pnpm installed

## What Gets Created

### Tables

1. **neighborhoods** - Vitacura sectors with PostGIS geometry
   - `id`: Primary key
   - `name`: Neighborhood name
   - `geometry`: POLYGON with coordinates (PostGIS)
   - `area_sqm`, `population`: Optional data

2. **properties** - Real estate listings from Portal Inmobiliario
   - `id`: Primary key
   - `lat`, `lng`: Location coordinates
   - `neighborhood_id`: Foreign key to neighborhoods (auto-assigned)
   - `price_uf`, `area_sqm`, `rooms`, `bathrooms`, `quality_score`
   - `property_type`: 'casa', 'departamento', etc.

### Views

- **market_intelligence_summary** - Pre-calculated neighborhood statistics
  - Property counts by type
  - Average/min/max pricing
  - Quality scores
  - Last data update timestamp

### Functions

1. **get_neighborhood_by_point(lat, lng)** - Point-in-polygon query
   - Returns neighborhood ID and name for given coordinates
   - Used by scraper to auto-assign neighborhoods

2. **find_closest_neighborhoods(lat, lng, limit)** - Proximity search
   - Returns N closest neighborhoods (default: 3)
   - Useful for fuzzy geocoding

## Step-by-Step Setup

### 1. Update Environment Variables

Create a `.env.local` file or add to your Vercel project settings:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Run Database Initialization

```bash
# Compile the TypeScript script
pnpm tsx scripts/init-neighborhoods.ts
```

This will:
- Enable PostGIS extension
- Create neighborhoods and properties tables
- Create market intelligence view
- Create PostGIS functions
- Populate 12 Vitacura sectors
- Set up Row Level Security policies

### 3. Verify Setup

Open your Supabase dashboard and check:

```sql
-- Should return 12 rows
SELECT id, name FROM neighborhoods;

-- Should work (returns neighborhood for a point)
SELECT * FROM get_neighborhood_by_point(-33.3834, -70.5935);

-- Should show empty initially
SELECT * FROM market_intelligence_summary;
```

## Loading Portal Inmobiliario Data

Once the database is set up, you can load properties:

```sql
-- Example: Insert a property
INSERT INTO properties (
  title, lat, lng, price_uf, area_sqm, rooms, 
  bathrooms, quality_score, property_type, source
) VALUES (
  'Propiedad en Vitacura Centro',
  -33.3834, -70.5935,
  500, 120, 3, 2, 8,
  'departamento', 'Portal Inmobiliario'
);
```

The `neighborhood_id` will be auto-populated when you run:

```sql
-- Update properties with neighborhood assignments
UPDATE properties p
SET neighborhood_id = n.id
FROM neighborhoods n
WHERE p.neighborhood_id IS NULL
AND ST_Contains(n.geometry, ST_SetSRID(ST_MakePoint(p.lng, p.lat), 4326));
```

## Troubleshooting

### "PostGIS not available" error
- PostGIS needs to be enabled by Supabase support
- Contact support or enable in Settings → Extensions

### "Function not found" error
- Ensure you have SERVICE_ROLE_KEY (admin permissions)
- RLS policies might be blocking the function

### Points not in any neighborhood
- Use `find_closest_neighborhoods()` to debug geocoding
- Coordinates might be outside Vitacura bounds

## Next Steps

1. Load property data from Portal Inmobiliario
2. Run market_intelligence_summary refresh
3. Connect to Market Intelligence dashboard
4. Build neighborhood comparison visualizations

## API Endpoints

Once setup is complete, you can use:

- `GET /api/neighborhoods?lat=X&lng=Y` - Get neighborhood by point
- `GET /api/neighborhoods/all` - List all neighborhoods
- `GET /api/neighborhoods/:id/market-data` - Get market intelligence for a neighborhood

See `app/api/neighborhoods/route.ts` for implementation.
