import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    if (action === 'all') {
      // Get all neighborhoods with market intelligence
      const { data, error } = await supabase
        .from('market_intelligence_summary')
        .select('*')
        .order('name');

      if (error) throw error;
      return NextResponse.json(data);
    }

    if (action === 'by-point') {
      // Get neighborhood by lat/lng
      const lat = searchParams.get('lat');
      const lng = searchParams.get('lng');

      if (!lat || !lng) {
        return NextResponse.json(
          { error: 'Missing lat and lng parameters' },
          { status: 400 }
        );
      }

      const { data, error } = await supabase.rpc('get_neighborhood_by_point', {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      });

      if (error) throw error;
      return NextResponse.json(data || null);
    }

    if (action === 'by-name') {
      // Get neighborhood by name
      const name = searchParams.get('name');

      if (!name) {
        return NextResponse.json(
          { error: 'Missing name parameter' },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from('neighborhoods')
        .select('*')
        .eq('name', name)
        .single();

      if (error) throw error;
      return NextResponse.json(data || null);
    }

    if (action === 'market-data') {
      // Get market intelligence for specific neighborhood
      const id = searchParams.get('id');

      if (!id) {
        return NextResponse.json(
          { error: 'Missing id parameter' },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from('market_intelligence_summary')
        .select('*')
        .eq('id', parseInt(id))
        .single();

      if (error) throw error;
      return NextResponse.json(data || null);
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: all, by-point, by-name, or market-data' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[v0] Neighborhoods API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
