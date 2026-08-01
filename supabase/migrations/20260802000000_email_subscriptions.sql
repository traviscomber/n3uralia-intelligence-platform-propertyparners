-- Audited email subscriptions for automated report delivery.
-- Access is server-side only. Authenticated users operate through authorized API routes.

create table if not exists public.report_email_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  report_type text not null check (report_type in ('executive','office','partner','monthly','cumulative','all')),
  cadence text not null default 'monthly' check (cadence in ('weekly','biweekly','monthly','quarterly','yearly')),
  active boolean not null default true,
  recipient_name text check (recipient_name is null or char_length(recipient_name) <= 160),
  recipient_role text check (recipient_role is null or char_length(recipient_role) <= 80),
  entity_id uuid references public.management_entities(id) on delete set null,
  notes text check (notes is null or char_length(notes) <= 1000),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.report_subscription_events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.report_email_subscriptions(id) on delete restrict,
  report_run_id uuid references public.management_report_runs(id) on delete set null,
  event_type text not null check (event_type in ('sent','failed','acknowledged','unsubscribed')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists report_email_subscriptions_global_unique
  on public.report_email_subscriptions(email, report_type)
  where entity_id is null;
create unique index if not exists report_email_subscriptions_entity_unique
  on public.report_email_subscriptions(email, report_type, entity_id)
  where entity_id is not null;
create index if not exists report_email_subscriptions_active_idx
  on public.report_email_subscriptions(active, report_type, cadence);
create index if not exists report_email_subscriptions_entity_idx
  on public.report_email_subscriptions(entity_id);
create index if not exists report_subscription_events_subscription_idx
  on public.report_subscription_events(subscription_id, created_at desc);
create index if not exists report_subscription_events_report_idx
  on public.report_subscription_events(report_run_id);

alter table public.report_email_subscriptions enable row level security;
alter table public.report_subscription_events enable row level security;

revoke all on table public.report_email_subscriptions from public, anon, authenticated;
revoke all on table public.report_subscription_events from public, anon, authenticated;
grant all on table public.report_email_subscriptions to service_role;
grant all on table public.report_subscription_events to service_role;

drop policy if exists "authenticated users read subscriptions" on public.report_email_subscriptions;
drop policy if exists "ceo and admin manage subscriptions" on public.report_email_subscriptions;
drop policy if exists "authenticated users read events" on public.report_subscription_events;
drop policy if exists "system can insert events" on public.report_subscription_events;

drop trigger if exists report_email_subscriptions_set_updated_at on public.report_email_subscriptions;
create trigger report_email_subscriptions_set_updated_at
before update on public.report_email_subscriptions
for each row execute function public.set_updated_at();
