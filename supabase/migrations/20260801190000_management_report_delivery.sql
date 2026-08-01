begin;

alter table public.management_report_distributions
  add column if not exists attempt_count integer not null default 0,
  add column if not exists next_attempt_at timestamptz not null default now(),
  add column if not exists last_attempt_at timestamptz,
  add column if not exists provider text,
  add column if not exists provider_message_id text,
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by uuid,
  add column if not exists last_event_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.management_report_distributions
  drop constraint if exists management_report_distributions_status_check;

alter table public.management_report_distributions
  add constraint management_report_distributions_status_check
  check (status = any (array[
    'pending'::text,
    'processing'::text,
    'sent'::text,
    'failed'::text,
    'acknowledged'::text
  ]));

create index if not exists management_report_distributions_delivery_queue_idx
  on public.management_report_distributions (status, next_attempt_at, created_at)
  where status in ('pending', 'failed');

create index if not exists management_report_distributions_provider_message_idx
  on public.management_report_distributions (provider, provider_message_id)
  where provider_message_id is not null;

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
    where distribution.status in ('pending', 'failed')
      and distribution.attempt_count < 6
      and distribution.metadata->>'terminalFailure' is distinct from 'true'
      and distribution.next_attempt_at <= now()
      and (
        distribution.locked_at is null
        or distribution.locked_at < now() - interval '15 minutes'
      )
    order by distribution.next_attempt_at asc, distribution.created_at asc
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
