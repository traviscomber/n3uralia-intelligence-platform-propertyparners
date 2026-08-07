create or replace function public.claim_document_distribution(p_distribution_id uuid)
returns table (
  schedule_id uuid,
  recipient_email text,
  attempt_count integer
)
language sql
security definer
set search_path = public
as $$
  update public.document_distributions
  set
    status = 'claimed',
    attempt_count = coalesce(attempt_count, 0) + 1,
    last_attempted_at = now(),
    updated_at = now()
  where id = p_distribution_id
    and status = 'pending'
    and (next_attempt_at is null or next_attempt_at <= now())
  returning schedule_id, recipient_email, attempt_count;
$$;

revoke all on function public.claim_document_distribution(uuid) from public;
revoke all on function public.claim_document_distribution(uuid) from anon;
revoke all on function public.claim_document_distribution(uuid) from authenticated;
grant execute on function public.claim_document_distribution(uuid) to service_role;

comment on function public.claim_document_distribution(uuid) is
  'Atomically transitions one due pending document distribution to claimed and returns it. Concurrent callers can only claim the row once.';
