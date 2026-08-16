-- Supabase secret API keys (sb_secret_*) execute Data API calls with the
-- service_role Postgres role but do not provide the legacy JWT GUC checked by
-- the original function. Authorization therefore belongs at the function grant
-- boundary, which also supports legacy service_role JWT keys.

do $migration$
declare
  v_def text;
  v_new text;
  v_needle text := $needle$  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;

$needle$;
begin
  select pg_get_functiondef('public.ingest_portal_listing_snapshot_v2(text,text,text,timestamptz,jsonb,boolean)'::regprocedure) into v_def;
  v_new := replace(v_def, v_needle, '');
  if v_new = v_def then
    raise exception 'Expected legacy service_role JWT guard was not found';
  end if;
  execute v_new;
end
$migration$;

revoke all on function public.ingest_portal_listing_snapshot_v2(text,text,text,timestamptz,jsonb,boolean) from public;
revoke all on function public.ingest_portal_listing_snapshot_v2(text,text,text,timestamptz,jsonb,boolean) from anon;
revoke all on function public.ingest_portal_listing_snapshot_v2(text,text,text,timestamptz,jsonb,boolean) from authenticated;
grant execute on function public.ingest_portal_listing_snapshot_v2(text,text,text,timestamptz,jsonb,boolean) to service_role;

comment on function public.ingest_portal_listing_snapshot_v2(text,text,text,timestamptz,jsonb,boolean) is
  'Canonical Portal unit-listing ingestion. Authorization is enforced by EXECUTE grants: service_role only for Data API callers; modern sb_secret backend keys are supported.';
