import { NextRequest, NextResponse } from 'next/server';
import {
  tagVitacuraPoint,
  getAllMarketNeighborhoods,
  getMarketNeighborhoodById,
  getAllPrcZones,
} from '@/lib/neighborhoods';

/**
 * GET /api/neighborhoods
 *
 * ?action=all           → all vitacura_market_neighborhoods
 * ?action=prc           → all vitacura_prc_zones
 * ?action=tag&lat=&lng= → tag_vitacura_point RPC
 * ?action=by-id&id=     → single neighborhood by barrio_id
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    if (action === 'all') {
      const data = await getAllMarketNeighborhoods();
      return NextResponse.json(data);
    }

    if (action === 'prc') {
      const data = await getAllPrcZones();
      return NextResponse.json(data);
    }

    if (action === 'tag') {
      const lat = searchParams.get('lat');
      const lng = searchParams.get('lng');

      if (!lat || !lng) {
        return NextResponse.json({ error: 'Missing lat and lng' }, { status: 400 });
      }

      const data = await tagVitacuraPoint(parseFloat(lat), parseFloat(lng));
      if (!data) {
        return NextResponse.json({ error: 'Point not found in any barrio' }, { status: 404 });
      }
      return NextResponse.json(data);
    }

    if (action === 'by-id') {
      const id = searchParams.get('id');
      if (!id) {
        return NextResponse.json({ error: 'Missing id' }, { status: 400 });
      }

      const data = await getMarketNeighborhoodById(id);
      if (!data) {
        return NextResponse.json({ error: 'Neighborhood not found' }, { status: 404 });
      }
      return NextResponse.json(data);
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: all, prc, tag, or by-id' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[neighborhoods API] error:', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
