-- Harden the report directory after advisor review.
ALTER FUNCTION public.report_directory_set_updated_at() SET search_path = pg_catalog;

REVOKE EXECUTE ON FUNCTION public.report_directory_set_updated_at() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON TABLE
  public.report_people,
  public.report_branch_assignments,
  public.report_subscriptions,
  public.report_directory_audit_log
FROM service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.report_people,
  public.report_branch_assignments,
  public.report_subscriptions,
  public.report_directory_audit_log
TO service_role;

GRANT USAGE, SELECT ON SEQUENCE public.report_directory_audit_log_id_seq TO service_role;
