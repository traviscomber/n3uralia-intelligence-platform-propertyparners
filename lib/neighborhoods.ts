import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Find the neighborhood for a given latitude/longitude
 * Uses PostGIS point-in-polygon query
 */
export async function getNeighborhoodByLocation(
  latitude: number,
  longitude: number
): Promise<{ id: number; name: string; sector_name: string } | null> {
  const { data, error } = await supabase
    .rpc('get_neighborhood_by_point', {
      lat: latitude,
      lng: longitude,
    })
    .single();

  if (error) {
    console.error('[v0] Error finding neighborhood:', error);
    return null;
  }

  return data;
}

/**
 * Get all neighborhoods with current market intelligence
 */
export async function getAllNeighborhoods() {
  const { data, error } = await supabase
    .from('market_intelligence_summary')
    .select('*')
    .order('name');

  if (error) {
    console.error('[v0] Error fetching neighborhoods:', error);
    return [];
  }

  return data;
}

/**
 * Get neighborhood by name
 */
export async function getNeighborhoodByName(name: string) {
  const { data, error } = await supabase
    .from('neighborhoods')
    .select('*')
    .eq('name', name)
    .single();

  if (error) {
    console.error('[v0] Error fetching neighborhood:', error);
    return null;
  }

  return data;
}

/**
 * Get market intelligence for a specific neighborhood
 */
export async function getNeighborhoodMarketData(neighborhoodId: number) {
  const { data, error } = await supabase
    .from('market_intelligence_summary')
    .select('*')
    .eq('id', neighborhoodId)
    .single();

  if (error) {
    console.error('[v0] Error fetching market data:', error);
    return null;
  }

  return data;
}

/**
 * Get properties in a neighborhood
 */
export async function getPropertiesByNeighborhood(neighborhoodId: number, limit = 50) {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('neighborhood_id', neighborhoodId)
    .limit(limit);

  if (error) {
    console.error('[v0] Error fetching properties:', error);
    return [];
  }

  return data;
}

/**
 * Assign neighborhood to a property (point-in-polygon)
 * Used by scraper to automatically assign neighborhoods
 */
export async function assignNeighborhoodToProperty(propertyId: number, latitude: number, longitude: number) {
  const neighborhood = await getNeighborhoodByLocation(latitude, longitude);

  if (!neighborhood) {
    console.warn('[v0] No neighborhood found for property at', latitude, longitude);
    return null;
  }

  const { data, error } = await supabase
    .from('properties')
    .update({ neighborhood_id: neighborhood.id })
    .eq('id', propertyId);

  if (error) {
    console.error('[v0] Error updating property neighborhood:', error);
    return null;
  }

  return neighborhood;
}

/**
 * Get properties with highest velocity in a neighborhood
 * Velocity = faster sales (lower days_on_market)
 */
export async function getFastestSellingProperties(neighborhoodId: number, limit = 10) {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('neighborhood_id', neighborhoodId)
    .order('velocity_days', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[v0] Error fetching fastest selling properties:', error);
    return [];
  }

  return data;
}

export default {
  getNeighborhoodByLocation,
  getAllNeighborhoods,
  getNeighborhoodByName,
  getNeighborhoodMarketData,
  getPropertiesByNeighborhood,
  assignNeighborhoodToProperty,
  getFastestSellingProperties,
};
