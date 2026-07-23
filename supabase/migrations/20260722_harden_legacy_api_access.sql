-- Close legacy Data API write paths after security review.

DROP POLICY IF EXISTS properties_insert_allow ON public.properties;
DROP POLICY IF EXISTS properties_update_allow ON public.properties;
DROP POLICY IF EXISTS properties_delete_allow ON public.properties;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.properties FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.import_vitacura_market_geojson(jsonb, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.import_vitacura_prc_geojson(jsonb, text, text) FROM PUBLIC, anon, authenticated;
