-- Move the relocatable unaccent extension out of the exposed public schema.
-- The database search_path already includes extensions and anon,
-- authenticated and service_role all have USAGE on that schema.

alter extension unaccent set schema extensions;
