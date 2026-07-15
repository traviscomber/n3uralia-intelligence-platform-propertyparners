# 🚀 SQL MIGRATION - READY TO EXECUTE

## In 5 Seconds

**Method 1: Supabase SQL Editor (NO SETUP NEEDED)**
1. Go to https://app.supabase.com
2. Click **SQL Editor** → **New Query**
3. Copy-paste contents of `exec_roles_migration.sql`
4. Click **Run** (▶️ button)
5. Done! ✅

**Expected**: ~5 seconds execution, verification results shown

---

## Files Provided

| File | Purpose | Size |
|------|---------|------|
| `exec_roles_migration.sql` | Pure SQL - paste into Supabase Editor | 6.8 KB |
| `execute_migration.py` | Python script (recommended) | 4.2 KB |
| `execute_migration.sh` | Bash wrapper script | 1.8 KB |
| `EXECUTE_MIGRATION_GUIDE.md` | Complete documentation | 6.8 KB |

---

## What Gets Created

**3 Directors + 6 Agents**
```
Equipo Alpha:   Juan Morales, Sofía Ramos, Diego Herrera
Equipo Beta:    María García, Valentina Torres, Andrés Muñoz
Equipo Gamma:   Carlos López, Camila Pérez, Matías Silva
```

**36 KPI Records** (6 months historical)
- Director-level: 18 records
- Agent-level: 18 records

**22 Agent Activities** (pending + completed + lost)
- Llamadas (calls): 8
- Visitas (visits): 8
- Ofertas (offers): 4
- Cierres (closures): 2

---

## After Execution

Dashboards will display:

```
/dashboard/ceo       ✅ With real director metrics
/dashboard/director  ✅ With real agent team data
/dashboard/agente    ✅ With real activities & pipeline
```

---

## Verification

Run in Supabase SQL Editor:
```sql
-- Should return: 9
SELECT COUNT(*) FROM profiles 
WHERE id LIKE 'a0000000%' OR id LIKE 'd0000000%';

-- Should return: 22
SELECT COUNT(*) FROM agent_activities;

-- Should return: 36
SELECT COUNT(*) FROM kpi_snapshots WHERE agent_id IS NOT NULL;
```

---

## Status

✅ **Ready to execute**  
✅ **Zero-risk** (distinct IDs, won't conflict)  
✅ **Fast** (~5 seconds)  
✅ **Documented** (4 methods provided)

---

**Choose your method above and run it now!**
