create table if not exists public.agent_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  run_id uuid references public.agent_runs(id) on delete cascade,
  finding_id uuid references public.agent_findings(id) on delete cascade,
  notification_type text not null,
  title text not null,
  message text not null,
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists agent_notifications_recipient_idx on public.agent_notifications(recipient_id, created_at desc);

create table if not exists public.agent_evaluations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  finding_id uuid references public.agent_findings(id) on delete cascade,
  evaluator_id uuid not null default auth.uid() references public.profiles(id),
  usefulness smallint not null check (usefulness between 1 and 5),
  correctness smallint not null check (correctness between 1 and 5),
  actionability smallint not null check (actionability between 1 and 5),
  outcome text not null default 'reviewed' check (outcome in ('reviewed','used','ignored','corrected')),
  correction_notes text,
  corrected_output jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists agent_evaluations_unique_idx
on public.agent_evaluations(run_id, coalesce(finding_id, '00000000-0000-0000-0000-000000000000'::uuid), evaluator_id);

create table if not exists public.agent_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null default current_date,
  agent_key text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(snapshot_date, agent_key)
);

create or replace view public.agent_performance_metrics as
select
  r.agent_key,
  count(*)::bigint as total_runs,
  count(*) filter (where r.status = 'approved')::bigint as approved_runs,
  count(*) filter (where r.status = 'rejected')::bigint as rejected_runs,
  count(*) filter (where r.status = 'failed')::bigint as failed_runs,
  count(*) filter (where r.status = 'completed')::bigint as completed_runs,
  count(*) filter (where r.status = 'needs_review')::bigint as pending_review_runs,
  avg(r.confidence)::numeric as avg_confidence,
  avg(extract(epoch from (r.finished_at - r.started_at))) filter (where r.finished_at is not null and r.started_at is not null)::numeric as avg_duration_seconds,
  case when count(*) filter (where r.status in ('approved','rejected')) > 0
    then count(*) filter (where r.status = 'approved')::numeric / count(*) filter (where r.status in ('approved','rejected'))
    else 0 end as approval_rate,
  case when count(*) > 0
    then count(*) filter (where r.status not in ('failed','cancelled'))::numeric / count(*)
    else 0 end as success_rate,
  count(e.id)::bigint as evaluation_count,
  avg(e.usefulness)::numeric as avg_usefulness,
  avg(e.correctness)::numeric as avg_correctness,
  avg(e.actionability)::numeric as avg_actionability,
  count(e.id) filter (where e.outcome = 'used')::bigint as used_count,
  count(e.id) filter (where e.outcome = 'ignored')::bigint as ignored_count,
  count(e.id) filter (where e.outcome = 'corrected')::bigint as corrected_count
from public.agent_runs r
left join public.agent_evaluations e on e.run_id = r.id
group by r.agent_key;

alter table public.agent_notifications enable row level security;
alter table public.agent_evaluations enable row level security;
alter table public.agent_metric_snapshots enable row level security;

drop policy if exists agent_runs_read_authenticated on public.agent_runs;
drop policy if exists agent_runs_read_authorized on public.agent_runs;
create policy agent_runs_read_authorized on public.agent_runs for select to authenticated
using (public.current_profile_role() = any (array['admin','ceo','director','analyst']));

drop policy if exists agent_sources_read_authenticated on public.agent_sources;
drop policy if exists agent_sources_read_authorized on public.agent_sources;
create policy agent_sources_read_authorized on public.agent_sources for select to authenticated
using (public.current_profile_role() = any (array['admin','ceo','director','analyst']));

drop policy if exists agent_findings_read_authenticated on public.agent_findings;
drop policy if exists agent_findings_read_authorized on public.agent_findings;
create policy agent_findings_read_authorized on public.agent_findings for select to authenticated
using (public.current_profile_role() = any (array['admin','ceo','director','analyst']));

drop policy if exists agent_approvals_read_authenticated on public.agent_approvals;
drop policy if exists agent_approvals_read_authorized on public.agent_approvals;
create policy agent_approvals_read_authorized on public.agent_approvals for select to authenticated
using (public.current_profile_role() = any (array['admin','ceo','director','analyst']));

drop policy if exists agent_artifacts_read_authenticated on public.agent_artifacts;
drop policy if exists agent_artifacts_read_authorized on public.agent_artifacts;
create policy agent_artifacts_read_authorized on public.agent_artifacts for select to authenticated
using (public.current_profile_role() = any (array['admin','ceo','director','analyst']));

drop policy if exists agent_schedules_read_authenticated on public.agent_schedules;
drop policy if exists agent_schedules_read_authorized on public.agent_schedules;
create policy agent_schedules_read_authorized on public.agent_schedules for select to authenticated
using (public.current_profile_role() = any (array['admin','ceo','director']));

drop policy if exists agent_notifications_read_own on public.agent_notifications;
create policy agent_notifications_read_own on public.agent_notifications for select to authenticated
using (recipient_id = auth.uid());

drop policy if exists agent_notifications_update_own on public.agent_notifications;
create policy agent_notifications_update_own on public.agent_notifications for update to authenticated
using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

drop policy if exists agent_notifications_insert_authorized on public.agent_notifications;
create policy agent_notifications_insert_authorized on public.agent_notifications for insert to authenticated
with check (public.current_profile_role() = any (array['admin','ceo','director','analyst']));

drop policy if exists agent_evaluations_insert_authenticated on public.agent_evaluations;
create policy agent_evaluations_insert_authenticated on public.agent_evaluations for insert to authenticated
with check (evaluator_id = auth.uid());

drop policy if exists agent_evaluations_update_own on public.agent_evaluations;
create policy agent_evaluations_update_own on public.agent_evaluations for update to authenticated
using (evaluator_id = auth.uid()) with check (evaluator_id = auth.uid());

drop policy if exists agent_evaluations_read_authenticated on public.agent_evaluations;
drop policy if exists agent_evaluations_read_authorized on public.agent_evaluations;
create policy agent_evaluations_read_authorized on public.agent_evaluations for select to authenticated
using (evaluator_id = auth.uid() or public.current_profile_role() = any (array['admin','ceo','director','analyst']));

drop policy if exists agent_metric_snapshots_read_authenticated on public.agent_metric_snapshots;
drop policy if exists agent_metric_snapshots_read_authorized on public.agent_metric_snapshots;
create policy agent_metric_snapshots_read_authorized on public.agent_metric_snapshots for select to authenticated
using (public.current_profile_role() = any (array['admin','ceo','director','analyst']));

drop policy if exists agent_metric_snapshots_write_executive on public.agent_metric_snapshots;
create policy agent_metric_snapshots_write_executive on public.agent_metric_snapshots for all to authenticated
using (public.current_profile_role() = any (array['admin','ceo']))
with check (public.current_profile_role() = any (array['admin','ceo']));
