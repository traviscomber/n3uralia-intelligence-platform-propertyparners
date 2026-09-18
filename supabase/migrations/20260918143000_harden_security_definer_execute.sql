begin;

-- SECURITY DEFINER functions must never inherit PostgreSQL's default PUBLIC execute.
-- Authenticated access remains explicit and is still enforced inside each approved RPC.
do $$
declare
  fn record;
begin
  for fn in
    select
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as identity_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
  loop
    execute format(
      'revoke execute on function %I.%I(%s) from public, anon',
      fn.schema_name,
      fn.function_name,
      fn.identity_args
    );
  end loop;
end
$$;

-- Future functions created by postgres in public start closed to PUBLIC.
alter default privileges for role postgres in schema public
  revoke execute on functions from public;

comment on schema public is
  'Application API schema. SECURITY DEFINER RPCs require explicit grants and internal authorization checks.';

commit;
