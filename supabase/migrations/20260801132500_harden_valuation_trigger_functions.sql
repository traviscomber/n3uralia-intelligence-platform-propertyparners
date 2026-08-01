-- Restrict internal valuation trigger functions from direct PostgREST RPC execution.
-- Trigger execution remains unchanged because PostgreSQL invokes these functions
-- through their registered triggers under the function owner context.

begin;

revoke all privileges on function public.reject_valuation_audit_mutation()
  from public, anon, authenticated;

revoke all privileges on function public.validate_valuation_case_version_insert()
  from public, anon, authenticated;

-- Retain explicit administrative access for trusted server-side operations.
grant execute on function public.reject_valuation_audit_mutation()
  to service_role;

grant execute on function public.validate_valuation_case_version_insert()
  to service_role;

commit;
