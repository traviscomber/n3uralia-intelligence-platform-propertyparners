#!/bin/bash
# Direct SQL execution against Supabase via psql or REST API
# Usage: ./execute_migration.sh

set -e

echo "📋 N3URALIA Roles Expansion Migration"
echo "======================================"
echo ""

# Check if required env vars exist
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: Missing environment variables"
  echo "   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

echo "✅ Environment variables found"
echo ""
echo "Migration Steps:"
echo "1. Add agent_id to kpi_snapshots"
echo "2. Create agent_activities table"
echo "3. Seed 3 directors + 6 agents"
echo "4. Seed 36 KPI snapshots (6 months)"
echo "5. Seed 22 activities"
echo ""

# Read the SQL file
SQL_FILE="/vercel/share/v0-project/exec_roles_migration.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "❌ SQL file not found: $SQL_FILE"
  exit 1
fi

echo "📂 Reading migration file: $SQL_FILE"
SQL_CONTENT=$(cat "$SQL_FILE")

echo ""
echo "🔄 Executing via Supabase REST API..."
echo ""

# Execute via curl to Supabase SQL API
RESPONSE=$(curl -s -X POST \
  "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"sql\": $(echo "$SQL_CONTENT" | jq -Rs .)}" 2>&1)

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

echo ""
echo "======================================"
echo "✅ Migration execution complete"
echo ""
echo "Next steps:"
echo "1. Verify in Supabase dashboard"
echo "2. Check profiles table: 9 records (3 directors + 6 agents)"
echo "3. Check kpi_snapshots: agent_id column exists + 36 agent records"
echo "4. Check agent_activities: 22 activity records"
