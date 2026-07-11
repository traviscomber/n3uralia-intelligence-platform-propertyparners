#!/bin/bash

# Database setup script for Property Partners
# Run this once to create neighborhoods and properties tables with PostGIS

set -e

echo "🚀 Setting up Property Partners database..."
echo ""

# Check if POSTGRES_URL is set
if [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: POSTGRES_URL environment variable not set"
  echo "Set it from your Supabase project settings and try again"
  exit 1
fi

echo "✓ Database URL found"
echo ""

# Run the migration
echo "📝 Running migration to create neighborhoods and properties tables..."
psql "$POSTGRES_URL" -f supabase/migrations/20260710_create_neighborhoods.sql

echo ""
echo "✓ Database setup complete!"
echo ""
echo "📊 Next steps:"
echo "  1. Verify tables created: SELECT * FROM neighborhoods LIMIT 1;"
echo "  2. Upload property data from Portal Inmobiliario scraper"
echo "  3. Run: SELECT * FROM market_intelligence_summary;"
echo ""
