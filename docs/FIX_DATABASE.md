# Fixing Property Partners Database

## Problem
The first migration (`20260710_create_neighborhoods.sql`) didn't fully create the `neighborhoods` table. The `properties` table exists but `neighborhoods` was not created.

## Solution

### Step 1: Execute Fixed Migration in Supabase Dashboard

1. Go to https://app.supabase.com
2. Click your project
3. Go to **SQL Editor** → **New Query**
4. Open this file: `supabase/migrations/20260711_fix_neighborhoods.sql`
5. Copy ALL the content
6. Paste into the Supabase SQL Editor
7. Click **Run**

This migration will:
- ✅ Create `neighborhoods` table with PostGIS geometry
- ✅ Create spatial indexes for fast queries
- ✅ Create `get_neighborhood_by_point()` function
- ✅ Create `market_intelligence_summary` view
- ✅ Insert 12 pre-populated Vitacura sectors with market data

### Step 2: Verify Migration

After running the SQL, execute:

```bash
cd /vercel/share/v0-project
set -a && source /vercel/share/.env.project && set +a
pnpm tsx scripts/verify-db.ts
```

Expected output:
```
✅ Tabla neighborhoods existe
   - Sectores encontrados: 12
✅ Tabla properties existe
   - Propiedades registradas: 0
```

### Step 3: Verify via API

```bash
curl -X POST http://localhost:3000/api/db/migrate
```

Expected response:
```json
{
  "status": "success",
  "message": "Database migration completed successfully",
  "tables_created": ["neighborhoods", "properties", "market_intelligence_summary"]
}
```

## Database Schema After Migration

### neighborhoods table
- `id` (BIGSERIAL PRIMARY KEY)
- `name` (VARCHAR UNIQUE) - Sector name
- `sector_name` (VARCHAR) - Short name
- `geometry` (GEOMETRY POLYGON 4326) - Geographic boundary
- `velocity_days` (INTEGER) - Average days to sell
- `price_per_sqm` (NUMERIC) - Current price per sqm
- `price_trend_3yr` (NUMERIC) - % change 3 years
- `price_trend_5yr` (NUMERIC) - % change 5 years
- `absorption_rate` (NUMERIC) - Inventory turnover
- `inventory_count` (INTEGER) - Listed properties
- `last_updated` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### properties table
- `id` (BIGSERIAL PRIMARY KEY)
- `portal_id` (TEXT UNIQUE) - Portal Inmobiliario ID
- `address` (TEXT)
- `latitude` (NUMERIC)
- `longitude` (NUMERIC)
- `neighborhood_id` (BIGINT FK)
- `price_uf` (NUMERIC)
- `price_clp` (BIGINT)
- `sqm` (NUMERIC)
- `rooms` (INT)
- `bathrooms` (INT)
- `type` (TEXT) - House/Apt/Other
- `quality_score` (NUMERIC)
- `last_updated` (TIMESTAMP)
- `created_at` (TIMESTAMP)

### Functions
- `get_neighborhood_by_point(lat, lng)` - Returns neighborhood containing point
- `get_market_data_by_neighborhood(id)` - Returns market intelligence

### Views
- `market_intelligence_summary` - Aggregated data by neighborhood

## Troubleshooting

### Error: "Could not find the table 'public.neighborhoods'"
→ The migration hasn't been executed yet. Follow Step 1.

### Error: "Relation 'neighborhoods' does not exist"
→ The migration wasn't applied. Run it in Supabase Dashboard.

### Error: "PostGIS extension not enabled"
→ The extension is enabled in the migration. If you see this after migration, contact Supabase support.

### Data not inserted
→ If sectors aren't auto-inserted, you can manually run the INSERT statements from the migration file.

## Next Steps After Database is Fixed

1. ✅ Load Portal Inmobiliario properties
2. ✅ Assign neighborhoods to properties (point-in-polygon)
3. ✅ Build Market Intelligence Dashboard
4. ✅ Build Valorizador system
5. ✅ Setup Weekly Reports

