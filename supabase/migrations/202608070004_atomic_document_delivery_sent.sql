create or replace function public.mark_document_distribution_sent(
  p_distribution_id uuid,
  p_external_reference text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sent_at timestamptz := now();
  v_updated integer := 0;
begin
  update public.document_distributions
  set
    status = 'sent',
    sent_at = v_sent_at,
    external_reference = p_external_reference,
    error_message = null,
    updated_at = v_sent_at
  where id = p_distribution_id
    and status = 'claimed';

  get diagnostics v_updated = row_count;

  if v_updated = 1 then
    insert into public.document_delivery_events (
      distribution_id,
      event_type,
      details
    ) values (
      p_distribution_id,
      'sent',
      jsonb_build_object(
        'sent_at', v_sent_at,
        'external_reference', p_external_reference
      )
    );
    return true;
  end if;

  if exists (
    select 1
    from public.document_distributions
    where id = p_distribution_id
      and status = 'sent'
      and external_reference = p_external_reference
  ) then
    return true;
  end if;

  return false;
end;
$$;

revoke all on function public.mark_document_distribution_sent(uuid, text) from public;
revoke all on function public.mark_document_distribution_sent(uuid, text) from anon;
revoke all on function public.mark_document_distribution_sent(uuid, text) from authenticated;
grant execute on function public.mark_document_distribution_sent(uuid, text) to service_role;

comment on function public.mark_document_distribution_sent(uuid, text) is
  'Atomically marks one claimed document distribution as sent and records its sent delivery event. Repeated calls with the same external reference are idempotent.';
