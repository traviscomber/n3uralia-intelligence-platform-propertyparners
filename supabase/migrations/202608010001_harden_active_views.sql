-- Restrict active contractual views to authenticated reads and preserve caller-scoped RLS.

DO $$
DECLARE
  view_name text;
BEGIN
  FOREACH view_name IN ARRAY ARRAY[
    'management_approved_metric_values',
    'market_current_listings',
    'market_listing_history',
    'market_property_lifecycle'
  ]
  LOOP
    IF to_regclass(format('public.%I', view_name)) IS NOT NULL THEN
      EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', view_name);
      EXECUTE format('REVOKE ALL PRIVILEGES ON public.%I FROM anon', view_name);
      EXECUTE format(
        'REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM authenticated',
        view_name
      );
      EXECUTE format('GRANT SELECT ON public.%I TO authenticated', view_name);
      EXECUTE format('GRANT SELECT ON public.%I TO service_role', view_name);
    END IF;
  END LOOP;
END
$$;
