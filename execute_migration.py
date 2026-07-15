#!/usr/bin/env python3
"""
N3URALIA Roles Expansion Migration Executor
Executes SQL migration against Supabase PostgreSQL
"""

import os
import sys
import json

try:
    import psycopg2
    from psycopg2.extras import execute_batch
except ImportError:
    print("❌ Error: psycopg2 not installed")
    print("   Install with: pip install psycopg2-binary")
    sys.exit(1)

def get_connection_string():
    """Build PostgreSQL connection string from Supabase URL and key"""
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "").replace("https://", "")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    if not url or not key:
        print("❌ Error: Missing environment variables")
        print("   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)
    
    # Parse Supabase URL: https://xxxxx.supabase.co -> xxxxx.supabase.co
    project_ref = url.split(".supabase.co")[0]
    
    # Supabase connection string format
    conn_str = f"postgresql://postgres:{key}@db.{project_ref}.supabase.co:5432/postgres"
    return conn_str

def execute_migration():
    """Execute the roles expansion migration"""
    print("📋 N3URALIA Roles Expansion Migration")
    print("=" * 50)
    print()
    
    # Read SQL file
    sql_file = "/vercel/share/v0-project/exec_roles_migration.sql"
    if not os.path.exists(sql_file):
        print(f"❌ SQL file not found: {sql_file}")
        sys.exit(1)
    
    with open(sql_file, 'r') as f:
        sql_content = f.read()
    
    print("✅ Migration file loaded")
    print()
    print("Migration Steps:")
    print("  1. Add agent_id to kpi_snapshots")
    print("  2. Create agent_activities table")
    print("  3. Seed 3 directors + 6 agents")
    print("  4. Seed 36 KPI snapshots (6 months)")
    print("  5. Seed 22 activities")
    print()
    
    try:
        print("🔄 Connecting to Supabase PostgreSQL...")
        conn_str = get_connection_string()
        conn = psycopg2.connect(conn_str, sslmode='require')
        cur = conn.cursor()
        print("✅ Connected")
        print()
        
        print("⚙️  Executing SQL migration...")
        cur.execute(sql_content)
        conn.commit()
        print("✅ Migration executed successfully")
        print()
        
        # Verify
        print("🔍 Verification Results:")
        print("-" * 50)
        
        # Count profiles
        cur.execute("""
            SELECT COUNT(*) as count, COUNT(DISTINCT role) as roles
            FROM profiles 
            WHERE id LIKE 'a0000000%' OR id LIKE 'd0000000%'
        """)
        profile_count, role_count = cur.fetchone()
        print(f"  ✅ Profiles created: {profile_count} (roles: {role_count})")
        
        # Count agent_activities
        cur.execute("SELECT COUNT(*) FROM agent_activities")
        activities_count = cur.fetchone()[0]
        print(f"  ✅ Activities created: {activities_count}")
        
        # Check agent_id in kpi_snapshots
        cur.execute("""
            SELECT COUNT(*) FROM kpi_snapshots WHERE agent_id IS NOT NULL
        """)
        agent_kpi_count = cur.fetchone()[0]
        print(f"  ✅ KPI snapshots with agent_id: {agent_kpi_count}")
        
        # Check agent_activities table exists
        cur.execute("""
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_name = 'agent_activities'
        """)
        table_exists = cur.fetchone()[0]
        print(f"  ✅ agent_activities table: {'EXISTS' if table_exists else 'MISSING'}")
        
        print()
        print("=" * 50)
        print("✅ Migration Complete!")
        print()
        print("Summary:")
        print(f"  • Profiles: {profile_count}")
        print(f"  • Activities: {activities_count}")
        print(f"  • Agent KPI records: {agent_kpi_count}")
        print()
        print("Ready to use:")
        print("  • /dashboard/ceo")
        print("  • /dashboard/director")
        print("  • /dashboard/agente")
        
        cur.close()
        conn.close()
        
    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    execute_migration()
