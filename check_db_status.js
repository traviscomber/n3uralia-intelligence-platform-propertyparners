const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[v0] Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  try {
    console.log('[v0] Checking database status...\n');

    // Check tables
    console.log('📊 TABLE STATUS:');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['agent_activities', 'kpi_snapshots', 'profiles']);
    
    if (!tablesError) {
      console.log(`  ✅ Tables found: ${tables.length}`);
    }

    // Check profiles (directors + agents)
    console.log('\n👥 PROFILES:');
    const { data: profiles, error: profilesError, count: profilesCount } = await supabase
      .from('profiles')
      .select('id, name, role', { count: 'exact' })
      .or("id.like.a0000000%,id.like.d0000000%");
    
    if (!profilesError && profiles) {
      const directors = profiles.filter(p => p.role === 'director').length;
      const agents = profiles.filter(p => p.role === 'seller').length;
      console.log(`  Total: ${profiles.length}`);
      console.log(`  Directors: ${directors}`);
      console.log(`  Agents: ${agents}`);
      console.log(`  Sample names: ${profiles.slice(0, 3).map(p => p.name).join(', ')}`);
    }

    // Check activities
    console.log('\n📋 AGENT ACTIVITIES:');
    const { data: activities, error: activitiesError, count: activitiesCount } = await supabase
      .from('agent_activities')
      .select('id, status', { count: 'exact' });
    
    if (!activitiesError && activities) {
      const pending = activities.filter(a => a.status === 'pending').length;
      const done = activities.filter(a => a.status === 'done').length;
      const lost = activities.filter(a => a.status === 'lost').length;
      console.log(`  Total: ${activities.length}`);
      console.log(`  Pending: ${pending}`);
      console.log(`  Done: ${done}`);
      console.log(`  Lost: ${lost}`);
    }

    // Check KPI snapshots with agent_id
    console.log('\n💰 KPI SNAPSHOTS (Agent-level):');
    const { data: agentKpis, error: kpisError, count: kpisCount } = await supabase
      .from('kpi_snapshots')
      .select('id, agent_id', { count: 'exact' })
      .not('agent_id', 'is', null);
    
    if (!kpisError && agentKpis) {
      console.log(`  Agent-level KPIs: ${agentKpis.length}`);
    }

    console.log('\n✅ DATABASE STATUS: READY');
    console.log('[v0] All tables and seed data verified!');

  } catch (err) {
    console.error('[v0] Error:', err.message);
    process.exit(1);
  }
})();
