import { createClient } from '@supabase/supabase-js';

// Server-side client uses service role — never exposed to browser
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Neighborhood {
  barrio_id: string;
  barrio_nombre: string;
  zona_prc: string;
  subzona?: string;
  geometry?: unknown;
}

export interface TagResult {
  barrio_id: string;
  barrio_nombre: string;
  zona_prc: string;
  subzona: string;
}

export interface MarketNeighborhood {
  barrio_id: string;
  barrio_nombre: string;
  velocity_days: number;
  price_per_sqm: number;
  price_trend_3yr: number;
  price_trend_5yr: number;
  absorption_rate: number;
  inventory_count: number;
  geometry?: unknown;
}

export interface PrcZone {
  zona_prc: string;
  subzona: string;
  geometry?: unknown;
}

// ─── Point Tagging ────────────────────────────────────────────────────────────

/**
 * Find the neighborhood for a given lat/lng using the RPC tag_vitacura_point.
 * This is the canonical way to assign a barrio to any coordinate.
 */
export async function tagVitacuraPoint(
  lat: number,
  lng: number
): Promise<TagResult | null> {
  const { data, error } = await supabase
    .rpc('tag_vitacura_point', { lat, lng })
    .single();

  if (error) {
    console.error('[neighborhoods] Error tagging point:', error.message);
    return null;
  }

  return data as TagResult;
}

// ─── Market Neighborhoods ────────────────────────────────────────────────────

/**
 * Get all market neighborhoods — used by Market Intelligence dashboard
 */
export async function getAllMarketNeighborhoods(): Promise<MarketNeighborhood[]> {
  const { data, error } = await supabase
    .from('vitacura_market_neighborhoods')
    .select('barrio_id, barrio_nombre, velocity_days, price_per_sqm, price_trend_3yr, price_trend_5yr, absorption_rate, inventory_count, geometry')
    .order('barrio_nombre');

  if (error) {
    console.error('[neighborhoods] Error fetching market neighborhoods:', error.message);
    return [];
  }

  return (data as MarketNeighborhood[]) || [];
}

/**
 * Get a single market neighborhood by barrio_id
 */
export async function getMarketNeighborhoodById(barrio_id: string): Promise<MarketNeighborhood | null> {
  const { data, error } = await supabase
    .from('vitacura_market_neighborhoods')
    .select('*')
    .eq('barrio_id', barrio_id)
    .single();

  if (error) {
    console.error('[neighborhoods] Error fetching neighborhood by id:', error.message);
    return null;
  }

  return data as MarketNeighborhood;
}

// ─── PRC Zones ────────────────────────────────────────────────────────────────

/**
 * Get all PRC zones — used to paint regulatory layers on map
 */
export async function getAllPrcZones(): Promise<PrcZone[]> {
  const { data, error } = await supabase
    .from('vitacura_prc_zones')
    .select('zona_prc, subzona, geometry');

  if (error) {
    console.error('[neighborhoods] Error fetching PRC zones:', error.message);
    return [];
  }

  return (data as PrcZone[]) || [];
}

// ─── Properties ───────────────────────────────────────────────────────────────

/**
 * Assign a barrio to a property row using point-in-polygon via tag_vitacura_point
 */
export async function assignBarrioToProperty(
  propertyId: string | number,
  lat: number,
  lng: number
): Promise<TagResult | null> {
  const tag = await tagVitacuraPoint(lat, lng);
  if (!tag) return null;

  const { error } = await supabase
    .from('properties')
    .update({ barrio_id: tag.barrio_id, barrio_nombre: tag.barrio_nombre })
    .eq('id', propertyId);

  if (error) {
    console.error('[neighborhoods] Error assigning barrio to property:', error.message);
    return null;
  }

  return tag;
}

export default {
  tagVitacuraPoint,
  getAllMarketNeighborhoods,
  getMarketNeighborhoodById,
  getAllPrcZones,
  assignBarrioToProperty,
};
