begin;

create or replace function public.claim_management_report_distributions(
  p_limit integer default 20,
  p_worker_id uuid default gen_random_uuid()
)
returns setof public.management_report_distributions
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select distribution.id
    from public.management_report_distributions distribution
    where (
        (
          distribution.status in ('pending', 'failed')
          and distribution.next_attempt_at <= now()
        )
        or (
          distribution.status = 'processing'
          and distribution.locked_at < now() - interval '15 minutes'
        )
      )
      and distribution.attempt_count < 6
      and distribution.metadata->>'terminalFailure' is distinct from 'true'
    order by coalesce(distribution.next_attempt_at, distribution.created_at) asc, distribution.created_at asc
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 20), 100))
  ), claimed as (
    update public.management_report_distributions distribution
    set status = 'processing',
        locked_at = now(),
        locked_by = p_worker_id,
        last_attempt_at = now(),
        attempt_count = distribution.attempt_count + 1,
        error_message = null
    where distribution.id in (select id from candidates)
    returning distribution.*
  )
  select * from claimed;
end;
$$;

revoke all on function public.claim_management_report_distributions(integer, uuid) from public;
revoke all on function public.claim_management_report_distributions(integer, uuid) from anon;
revoke all on function public.claim_management_report_distributions(integer, uuid) from authenticated;
grant execute on function public.claim_management_report_distributions(integer, uuid) to service_role;

commit;
