-- Remove only exact duplicate spatial indexes that have recorded zero scans.
-- The retained indexes are structurally identical and have active usage.

drop index if exists public.neighborhoods_geometry_gix;
drop index if exists public.vitacura_prc_zones_geometry_gix;
