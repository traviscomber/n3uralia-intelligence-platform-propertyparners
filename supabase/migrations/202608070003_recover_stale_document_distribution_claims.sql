create or replace function public.recover_stale_document_distribution_claims()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  recovered_ids uuid[];
  recovered_count integer := 0;
begin
  with recovered as (
    update public.document_distributions
    set
      status = 'pending',
      next_attempt_at = now(),
      updated_at = now()
    where status = 'claimed'
      and last_attempted_at is not null
      and last_attempted_at < now() - interval '5 minutes'
    returning id
  )
  select coalesce(array_agg(id), array[]::uuid[]), count(*)::integer
  into recovered_ids, recovered_count
  from recovered;

  if recovered_count > 0 then
    insert into public.document_delivery_events (distribution_id, event_type, details)
    select
      recovered_id,
      'claim_recovered',
      jsonb_build_object(
        'recovered_at', now(),
        'reason', 'claimed_stale_over_5_minutes'
      )
    from unnest(recovered_ids) as recovered_id;
  end if;

  return recovered_count;
end;
$$;

revoke all on function public.recover_stale_document_distribution_claims() from public;
revoke all on function public.recover_stale_document_distribution_claims() from anon;
revoke all on function public.recover_stale_document_distribution_claims() from authenticated;
grant execute on function public.recover_stale_document_distribution_claims() to service_role;

comment on function public.recover_stale_document_distribution_claims() is
  'Returns document distributions claimed for more than five minutes to pending without consuming another attempt, and records an audit event.';