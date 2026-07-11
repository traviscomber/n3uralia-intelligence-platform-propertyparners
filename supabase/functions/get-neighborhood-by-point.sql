-- Create function to get neighborhood by point (latitude, longitude)
-- This function uses PostGIS ST_Contains to find which neighborhood polygon contains the point

CREATE OR REPLACE FUNCTION get_neighborhood_by_point(lat DECIMAL, lng DECIMAL)
RETURNS TABLE(id BIGINT, name VARCHAR, sector_name VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    neighborhoods.id,
    neighborhoods.name,
    neighborhoods.sector_name
  FROM neighborhoods
  WHERE ST_Contains(neighborhoods.geometry, ST_Point(lng, lat, 4326))
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to get market data by neighborhood
CREATE OR REPLACE FUNCTION get_market_data_by_neighborhood(neighborhood_id BIGINT)
RETURNS TABLE(
  id BIGINT,
  name VARCHAR,
  sector_name VARCHAR,
  property_count BIGINT,
  avg_price_uf NUMERIC,
  avg_sqm NUMERIC,
  avg_velocity_days NUMERIC,
  absorption_rate DECIMAL,
  price_trend_5yr DECIMAL,
  last_updated TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mis.id,
    mis.name,
    mis.sector_name,
    mis.property_count,
    mis.avg_price_uf,
    mis.avg_sqm,
    mis.avg_velocity_days,
    mis.absorption_rate,
    mis.price_trend_5yr,
    mis.last_updated
  FROM market_intelligence_summary mis
  WHERE mis.id = neighborhood_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to find closest neighborhoods (for debugging/testing)
CREATE OR REPLACE FUNCTION find_closest_neighborhoods(lat DECIMAL, lng DECIMAL, max_distance_km DECIMAL DEFAULT 5)
RETURNS TABLE(id BIGINT, name VARCHAR, sector_name VARCHAR, distance_km DECIMAL) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    neighborhoods.id,
    neighborhoods.name,
    neighborhoods.sector_name,
    ROUND(CAST(ST_Distance(neighborhoods.geometry, ST_Point(lng, lat, 4326), true) / 1000 AS NUMERIC), 2) as distance_km
  FROM neighborhoods
  ORDER BY ST_Distance(neighborhoods.geometry, ST_Point(lng, lat, 4326), true)
  LIMIT CASE WHEN max_distance_km > 0 THEN 5 ELSE 10 END;
END;
$$ LANGUAGE plpgsql STABLE;
