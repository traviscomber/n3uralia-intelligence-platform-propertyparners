-- Email subscriptions for automated report delivery
-- Allows users and stakeholders to subscribe to reports and receive them automatically

create table if not exists report_email_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  report_type text not null check (report_type in ('executive','office','partner','monthly','cumulative','all')),
  cadence text not null default 'monthly' check (cadence in ('weekly','biweekly','monthly','quarterly','yearly')),
  active boolean not null default true,
  recipient_name text,
  recipient_role text,
  entity_id uuid references management_entities(id) on delete cascade,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email, report_type, entity_id)
);

create table if not exists report_subscription_events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references report_email_subscriptions(id) on delete cascade,
  report_run_id uuid references management_report_runs(id) on delete set null,
  event_type text not null check (event_type in ('sent','failed','acknowledged','unsubscribed')),
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists report_email_subscriptions_active_idx on report_email_subscriptions(active, report_type, cadence);
create index if not exists report_email_subscriptions_email_idx on report_email_subscriptions(email);
create index if not exists report_email_subscriptions_entity_idx on report_email_subscriptions(entity_id);
create index if not exists report_subscription_events_subscription_idx on report_subscription_events(subscription_id);
create index if not exists report_subscription_events_report_idx on report_subscription_events(report_run_id);

alter table report_email_subscriptions enable row level security;
alter table report_subscription_events enable row level security;

create policy "authenticated users read subscriptions" on report_email_subscriptions for select to authenticated using (
  coalesce((select role from profiles where id=auth.uid()), '') in ('admin','ceo','director','subdirector')
);

create policy "ceo and admin manage subscriptions" on report_email_subscriptions for all to authenticated using (
  coalesce((select role from profiles where id=auth.uid()), '') in ('admin','ceo')
) with check (
  coalesce((select role from profiles where id=auth.uid()), '') in ('admin','ceo')
);

create policy "authenticated users read events" on report_subscription_events for select to authenticated using (
  coalesce((select role from profiles where id=auth.uid()), '') in ('admin','ceo','director','subdirector')
);

create policy "system can insert events" on report_subscription_events for insert with check (true);
