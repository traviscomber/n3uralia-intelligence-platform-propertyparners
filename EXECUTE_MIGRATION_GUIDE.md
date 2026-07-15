# How to Execute the Roles Expansion Migration

This guide explains how to run the SQL migration that creates the agent_activities table and seeds data for the 3 role-based dashboards.

## What the Migration Does

```
✓ Adds agent_id column to kpi_snapshots table
✓ Creates agent_activities table with proper constraints
✓ Seeds 3 directors (Juan, María, Carlos)
✓ Seeds 6 agents (Sofía, Diego, Valentina, Andrés, Camila, Matías)
✓ Inserts 36 KPI snapshots (6 months of data)
✓ Inserts 22 agent activities (today + past)
```

## Option 1: Via Supabase SQL Editor (Easiest)

1. Open your Supabase dashboard: https://app.supabase.com
2. Go to **SQL Editor** → **New Query**
3. Copy the entire contents of `exec_roles_migration.sql`
4. Paste into the SQL editor
5. Click **Run** (▶️ button)
6. Wait ~5 seconds for completion
7. You'll see verification queries output:
   - ✅ 9 profiles created
   - ✅ 22 agent activities created
   - ✅ 36 KPI snapshots with agent_id

## Option 2: Via Python Script

### Prerequisites
```bash
pip install psycopg2-binary
```

### Environment Setup
Export Supabase credentials:
```bash
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### Run Migration
```bash
cd /vercel/share/v0-project
python execute_migration.py
```

### Expected Output
```
📋 N3URALIA Roles Expansion Migration
==================================================

✅ Migration file loaded

Migration Steps:
  1. Add agent_id to kpi_snapshots
  2. Create agent_activities table
  3. Seed 3 directors + 6 agents
  4. Seed 36 KPI snapshots (6 months)
  5. Seed 22 activities

🔄 Connecting to Supabase PostgreSQL...
✅ Connected

⚙️  Executing SQL migration...
✅ Migration executed successfully

🔍 Verification Results:
-------------------------------------------------
  ✅ Profiles created: 9 (roles: 2)
  ✅ Activities created: 22
  ✅ KPI snapshots with agent_id: 36
  ✅ agent_activities table: EXISTS

==================================================
✅ Migration Complete!

Summary:
  • Profiles: 9
  • Activities: 22
  • Agent KPI records: 36

Ready to use:
  • /dashboard/ceo
  • /dashboard/director
  • /dashboard/agente
```

## Option 3: Via Bash Script

```bash
cd /vercel/share/v0-project
chmod +x execute_migration.sh
./execute_migration.sh
```

## Option 4: Via Node.js

```bash
node -e "
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sql = fs.readFileSync('exec_roles_migration.sql', 'utf8');

supabase.rpc('exec_sql', { sql })
  .then(({ data, error }) => {
    if (error) console.error('Migration failed:', error);
    else console.log('Migration complete!', data);
  });
"
```

## Verify Migration Success

After executing, verify by running these queries in Supabase SQL Editor:

### Check Profiles
```sql
SELECT full_name, role, team FROM profiles 
WHERE id LIKE 'a0000000%' OR id LIKE 'd0000000%'
ORDER BY role DESC, full_name;
```

Expected: 3 directors + 6 agents

### Check Agent Activities
```sql
SELECT COUNT(*) as total, 
       COUNT(DISTINCT agent_id) as agents,
       COUNT(DISTINCT activity_type) as types,
       COUNT(CASE WHEN status='pending' THEN 1 END) as pending
FROM agent_activities;
```

Expected: 22 total, 6 agents, 4 types, ~13 pending

### Check KPI Data
```sql
SELECT COUNT(*) as agent_records 
FROM kpi_snapshots 
WHERE agent_id IS NOT NULL;
```

Expected: 36 records (6 agents × 6 months)

## Data Included

### Directors (3)
- Juan Morales (Equipo Alpha) - Strongest performer
- María García (Equipo Beta) - Mid-tier
- Carlos López (Equipo Gamma) - Emerging leader

### Agents (6 per director team, 2 per director)
- **Equipo Alpha**: Sofía Ramos (top performer), Diego Herrera (mid-tier)
- **Equipo Beta**: Valentina Torres (consistent), Andrés Muñoz (variable)
- **Equipo Gamma**: Camila Pérez (emerging), Matías Silva (learning)

### Activities (22 total)
Mix of:
- `llamada` (calls) - 8 activities
- `visita` (visits) - 8 activities
- `oferta` (offers) - 4 activities
- `cierre` (closures) - 2 activities

Status distribution:
- `pending` - 13 activities (today's tasks)
- `done` - 7 activities (completed)
- `lost` - 2 activities (rejected opportunities)

### KPI Data (36 records, 6 months)
- 6 months of historical data (from 5 months ago to today)
- Realistic metrics:
  - Ventas: 1-7 per month
  - Captaciones: 2-13 per month
  - Conversion: 4.3% - 13.6%
  - Velocidad (days): 28-51 days
  - Comisión: UF 132,000 - UF 966,000

## Troubleshooting

### "Column already exists"
If you get this error, the migration was already run. You can:
1. Skip it and use existing data
2. Delete the data manually and re-run:
   ```sql
   DELETE FROM profiles WHERE id LIKE 'a0000000%' OR id LIKE 'd0000000%';
   DELETE FROM agent_activities;
   ```

### "Table does not exist"
Make sure you ran the production database initialization first:
```bash
POST /api/db/reinit
```

Or via Supabase SQL Editor:
```sql
-- Run 20260712_production_database_init.sql first
```

### "RLS policy error"
If you see RLS errors, make sure:
1. Service role key has admin permissions
2. RLS policies are configured correctly (should allow service role access)

### "Connection refused"
Check:
1. `NEXT_PUBLIC_SUPABASE_URL` is correct
2. `SUPABASE_SERVICE_ROLE_KEY` is correct (NOT the anon key)
3. Supabase project is running and accessible
4. Firewall/VPN not blocking PostgreSQL port 5432

## After Migration

### Dashboards Ready to Use
- `/dashboard/ceo` - View all directors and company KPIs
- `/dashboard/director` - View your team and agent metrics
- `/dashboard/agente` - View your personal activities and commission

### Mock Data Active
All 3 dashboards will display real data from the database:
- CEO dashboard shows director performance over 6 months
- Director dashboard shows agent activities and pipeline
- Agent dashboard shows personal checklist and metrics

### No Further Setup Needed
The dashboards are now fully functional. All data loads from Supabase.

## SQL Files Reference

### `supabase/migrations/20260712_roles_expansion.sql`
Original migration file (165 lines). Used by automatic Supabase migrations.

### `exec_roles_migration.sql` (This directory)
Standalone executable version with verification queries added (186 lines).

### `execute_migration.sh`
Bash wrapper for REST API execution.

### `execute_migration.py`
Python wrapper for direct PostgreSQL execution (recommended for large migrations).

---

**Status**: ✅ Ready to execute  
**Estimated Time**: 5-10 seconds  
**Risk Level**: Low (uses distinct IDs, won't conflict with existing data)  
**Rollback**: Easy (DELETE by ID range if needed)
