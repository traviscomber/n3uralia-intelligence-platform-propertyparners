# Database Migration - Property Partners

## Quick Start

Execute this migration in your Supabase dashboard to set up the Property Partners database schema.

## Option 1: Supabase Dashboard (Fastest)

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your Property Partners project
3. Click **SQL Editor** in the left sidebar
4. Click **"New Query"** button
5. **Paste the entire content** from: `supabase/migrations/20260710_create_neighborhoods.sql`
6. Click **"Run"** button (or Ctrl+Enter)
7. Wait for completion (should see "✓ Complete")

## Option 2: Supabase CLI

```bash
# From project root
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## What Gets Created

Running this migration creates:

### Tables
- **neighborhoods** - Geographic polygons for Vitacura sectors (PostGIS)
  - 12 pre-populated sectors: Vitacura Centro, El Golf, La Dehesa, etc.
  - POLYGON geometry for point-in-polygon queries
  
- **properties** - Portal Inmobiliario listings
  - Coordinates (latitude, longitude)
  - Price data (UF and CLP)
  - Neighborhood assignment
  - Quality scores and property details

### Views
- **market_intelligence_summary** - Aggregated market data by neighborhood
  - Property counts per sector
  - Average prices and median prices
  - Property velocity tracking

### Functions
- **get_neighborhood_by_point(lat, lng)** - Point-in-polygon query
  - Returns the neighborhood containing a given coordinate
  - Used for automatic neighborhood assignment

- **find_closest_neighborhoods(lat, lng)** - Distance-based lookup
  - Finds neighborhoods near a location (useful for debugging)

### Security
- Row-Level Security (RLS) enabled on all tables
- Public read access for neighborhoods (no auth required)
- Proper access controls for properties data

## Verification

After running the migration, verify it worked:

### Via Dashboard
1. Go to Table Editor in Supabase
2. Look for "neighborhoods" table
3. Should see 12 rows (12 Vitacura sectors)

### Via API Endpoint
```bash
curl http://localhost:3000/api/db/migrate \
  -X POST \
  -H "Content-Type: application/json" \
  -d {}
```

Should return:
```json
{
  "status": "success",
  "message": "Database migration verified",
  "neighborhoods_count": 12,
  "neighborhoods": ["Vitacura Centro", "El Golf", "La Dehesa", ...]
}
```

## SQL File Location

The complete migration SQL is located at:
```
supabase/migrations/20260710_create_neighborhoods.sql
```

File size: ~4KB  
Statements: ~20 DDL commands  
Execution time: ~2-5 seconds

## Troubleshooting

### "Extension postgis does not exist"
- Supabase may already have PostGIS enabled
- The migration checks and enables if needed
- Should not cause an error

### "Table already exists"
- Run the migration again
- The SQL uses `CREATE TABLE IF NOT EXISTS`
- Safe to re-run without losing data

### "Cannot find column..."
- Check you pasted the entire SQL file
- Make sure no lines got cut off
- Try copying from raw file view

### Still seeing "needs_manual_execution" via API?
- The endpoint is checking correctly
- Just means the table creation hasn't completed yet
- Refresh and try again
- Check Supabase dashboard Table Editor to verify

## Next Steps

After migration completes:

1. **Load Portal Inmobiliario data** - Import property listings
2. **Assign neighborhoods** - Use `get_neighborhood_by_point()` to auto-assign
3. **Build Market Intelligence Dashboard** - Query `market_intelligence_summary` view
4. **Connect Valorizador** - Use ML model with neighborhood context

## Support

If migration fails:
1. Check Supabase dashboard for error messages
2. Verify you have admin/owner access to project
3. Try running individual statements separately
4. Check SQL syntax if making custom modifications
