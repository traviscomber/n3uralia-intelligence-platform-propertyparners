alter table public.document_distributions
  add column if not exists scheduled_for timestamptz;

create unique index if not exists document_distributions_schedule_recipient_cycle_uidx
  on public.document_distributions (schedule_id, recipient_email, scheduled_for)
  where scheduled_for is not null;

comment on column public.document_distributions.scheduled_for is
  'Exact document schedule cycle timestamp used to make future distribution creation idempotent without rewriting historical delivery evidence.';
