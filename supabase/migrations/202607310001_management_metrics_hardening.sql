-- Harden Módulo III without deleting existing operational data.

-- 1. Metric definitions: make calculation semantics explicit and versionable.
alter table management_metric_definitions
  add column if not exists formula_version integer not null default 1,
  add column if not exists aggregation_config jsonb not null default '{}'::jsonb,
  add column if not exists evaluation_policy jsonb not null default '{}'::jsonb;

alter table management_metric_definitions drop constraint if exists management_metric_definitions_aggregation_check;
alter table management_metric_definitions add constraint management_metric_definitions_aggregation_check
  check (aggregation in (
    'sum',
    'average',
    'ratio',
    'last',
    'ratio_of_totals',
    'average_of_individual_scores',
    'weighted_average',
    'ending_balance',
    'attributed_credit_sum',
    'unique_operation_sum'
  ));

-- 2. Metric values: absence is not zero. Preserve current rows and allow explicit non-evaluable records.
alter table management_metric_values alter column value drop not null;
alter table management_metric_values
  add column if not exists evaluation_status text not null default 'evaluable',
  add column if not exists formula_version integer not null default 1,
  add column if not exists evaluated_at timestamptz;

alter table management_metric_values drop constraint if exists management_metric_values_quality_status_check;
alter table management_metric_values add constraint management_metric_values_quality_status_check
  check (quality_status in ('verified','provisional','missing','rejected','not_applicable','not_evaluable'));

alter table management_metric_values drop constraint if exists management_metric_values_evaluation_status_check;
alter table management_metric_values add constraint management_metric_values_evaluation_status_check
  check (evaluation_status in ('evaluable','missing_source','not_applicable','not_evaluable','rejected'));

alter table management_metric_values drop constraint if exists management_metric_values_value_state_check;
alter table management_metric_values add constraint management_metric_values_value_state_check
  check (
    (evaluation_status = 'evaluable' and value is not null)
    or
    (evaluation_status <> 'evaluable' and value is null)
  ) not valid;

-- Existing rows are evaluable because the old schema required a value.
update management_metric_values
set evaluation_status = 'evaluable', evaluated_at = coalesce(evaluated_at, updated_at, created_at)
where value is not null and evaluation_status <> 'evaluable';

alter table management_metric_values validate constraint management_metric_values_value_state_check;

-- 3. Goals: distinguish absence, provisional values and approved zero targets.
alter table management_goals alter column target_value drop not null;
alter table management_goals
  add column if not exists status text not null default 'assigned',
  add column if not exists approval_note text,
  add column if not exists formula_version integer not null default 1;

alter table management_goals drop constraint if exists management_goals_status_check;
alter table management_goals add constraint management_goals_status_check
  check (status in ('not_assigned','provisional','assigned','approved','cancelled'));

alter table management_goals drop constraint if exists management_goals_target_state_check;
alter table management_goals add constraint management_goals_target_state_check
  check (
    (status in ('provisional','assigned','approved') and target_value is not null)
    or
    (status in ('not_assigned','cancelled') and target_value is null)
  ) not valid;

update management_goals
set status = case when approved_at is not null then 'approved' else 'assigned' end
where target_value is not null;

alter table management_goals validate constraint management_goals_target_state_check;

-- 4. Alerts: retain data availability state and previous values used for variation rules.
alter table management_alerts
  add column if not exists data_status text not null default 'available',
  add column if not exists previous_metric_value numeric,
  add column if not exists evaluated_at timestamptz;

alter table management_alerts drop constraint if exists management_alerts_data_status_check;
alter table management_alerts add constraint management_alerts_data_status_check
  check (data_status in ('available','provisional','unavailable','rejected'));

-- 5. Metric definitions: separate cohort conversion from the operational six-month snapshot.
update management_metric_definitions
set
  label = 'Conversión de cohorte',
  description = 'Ventas confirmadas derivadas de leads válidos creados en la misma cohorte.',
  aggregation = 'ratio_of_totals',
  methodology = 'Ventas confirmadas atribuidas a la cohorte / leads válidos creados en esa misma cohorte * 100. No mezclar cohortes ni períodos.',
  formula_version = greatest(formula_version, 2),
  evaluation_policy = jsonb_build_object(
    'zeroDenominator', 'not_evaluable',
    'missingDenominator', 'not_evaluable',
    'acceptedQuality', jsonb_build_array('verified')
  )
where code = 'conversion';

insert into management_metric_definitions (
  code,label,description,unit,aggregation,numerator_code,denominator_code,active,sort_order,methodology,formula_version,aggregation_config,evaluation_policy
) values (
  'conversion_6m_operational',
  'Conversión operacional 6 meses',
  'Cierres atribuidos durante seis meses divididos por el universo operacional de leads del corte.',
  'percent',
  'ratio_of_totals',
  'sales_6m_attributed',
  'active_leads_snapshot',
  true,
  65,
  'Cierres atribuidos de los últimos seis meses / snapshot de leads activos usado por el informe * 100. Esta métrica no representa una cohorte.',
  1,
  '{}'::jsonb,
  jsonb_build_object('zeroDenominator','not_evaluable','missingDenominator','not_evaluable','acceptedQuality',jsonb_build_array('verified'))
)
on conflict (code) do update set
  label = excluded.label,
  description = excluded.description,
  aggregation = excluded.aggregation,
  numerator_code = excluded.numerator_code,
  denominator_code = excluded.denominator_code,
  methodology = excluded.methodology,
  formula_version = excluded.formula_version,
  evaluation_policy = excluded.evaluation_policy,
  active = true;

-- 6. Evaluate alerts safely. Missing or rejected data never resolves an existing alert.
create or replace function evaluate_management_alerts(p_period_start date, p_period_end date)
returns table(created_count integer, resolved_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created integer := 0;
  v_resolved integer := 0;
  v_rows integer := 0;
  rec record;
  v_triggered boolean;
  v_previous numeric;
  v_change_pct numeric;
begin
  for rec in
    select
      r.id as rule_id,
      r.code,
      r.label,
      r.metric_code,
      r.comparison,
      r.threshold,
      r.severity,
      r.scope_type,
      r.responsible_role,
      e.id as entity_id,
      e.name as entity_name,
      e.entity_type,
      m.value,
      m.quality_status,
      m.evaluation_status
    from management_alert_rules r
    join management_entities e
      on e.active = true
     and (r.scope_type = 'all' or r.scope_type = e.entity_type)
    left join management_metric_values m
      on m.entity_id = e.id
     and m.metric_code = r.metric_code
     and m.period_start = p_period_start
     and m.period_end = p_period_end
    where r.active = true
  loop
    -- Absence, rejection and non-evaluable data preserve current alert state.
    if rec.value is null
       or coalesce(rec.evaluation_status, 'missing_source') <> 'evaluable'
       or coalesce(rec.quality_status, 'missing') not in ('verified','provisional') then
      update management_alerts
      set data_status = case
          when rec.quality_status = 'rejected' then 'rejected'
          else 'unavailable'
        end,
        evaluated_at = now()
      where rule_id = rec.rule_id
        and entity_id = rec.entity_id
        and metric_code = rec.metric_code
        and period_start = p_period_start
        and period_end = p_period_end
        and status in ('open','acknowledged');
      continue;
    end if;

    v_triggered := false;
    v_previous := null;
    v_change_pct := null;

    if rec.comparison in ('drop_pct','increase_pct') then
      select mv.value
      into v_previous
      from management_metric_values mv
      where mv.entity_id = rec.entity_id
        and mv.metric_code = rec.metric_code
        and mv.period_end < p_period_start
        and mv.value is not null
        and mv.evaluation_status = 'evaluable'
        and mv.quality_status = 'verified'
      order by mv.period_end desc, mv.updated_at desc
      limit 1;

      if v_previous is null or v_previous = 0 then
        -- No valid baseline means no evaluation and no automatic resolution.
        update management_alerts
        set data_status = 'unavailable', evaluated_at = now()
        where rule_id = rec.rule_id
          and entity_id = rec.entity_id
          and metric_code = rec.metric_code
          and period_start = p_period_start
          and period_end = p_period_end
          and status in ('open','acknowledged');
        continue;
      end if;

      v_change_pct := ((rec.value - v_previous) / abs(v_previous)) * 100.0;
    end if;

    v_triggered := case rec.comparison
      when 'lt' then rec.value < rec.threshold
      when 'lte' then rec.value <= rec.threshold
      when 'gt' then rec.value > rec.threshold
      when 'gte' then rec.value >= rec.threshold
      when 'drop_pct' then v_change_pct <= -abs(rec.threshold)
      when 'increase_pct' then v_change_pct >= abs(rec.threshold)
      else false
    end;

    if v_triggered then
      if not exists (
        select 1
        from management_alerts a
        where a.rule_id = rec.rule_id
          and a.entity_id = rec.entity_id
          and a.metric_code = rec.metric_code
          and a.period_start = p_period_start
          and a.period_end = p_period_end
          and a.status in ('open','acknowledged')
      ) then
        insert into management_alerts (
          rule_id,entity_id,metric_code,period_start,period_end,severity,status,title,detail,
          metric_value,previous_metric_value,threshold_value,data_status,evaluated_at
        ) values (
          rec.rule_id,rec.entity_id,rec.metric_code,p_period_start,p_period_end,rec.severity,'open',rec.label,
          case
            when rec.comparison in ('drop_pct','increase_pct') then
              rec.entity_name || ': variación ' || round(v_change_pct, 2) || '% frente a umbral ' || rec.threshold || '%.'
            else
              rec.entity_name || ': valor ' || rec.value || ' frente a umbral ' || rec.threshold || '.'
          end,
          rec.value,v_previous,rec.threshold,
          case when rec.quality_status = 'provisional' then 'provisional' else 'available' end,
          now()
        );
        v_created := v_created + 1;
      else
        update management_alerts
        set metric_value = rec.value,
            previous_metric_value = v_previous,
            data_status = case when rec.quality_status = 'provisional' then 'provisional' else 'available' end,
            evaluated_at = now()
        where rule_id = rec.rule_id
          and entity_id = rec.entity_id
          and metric_code = rec.metric_code
          and period_start = p_period_start
          and period_end = p_period_end
          and status in ('open','acknowledged');
      end if;
    else
      -- Only verified data can close an alert automatically.
      if rec.quality_status = 'verified' then
        update management_alerts
        set status = 'resolved',
            resolved_at = now(),
            resolution_notes = 'Resuelta automáticamente con dato verificado: la condición dejó de cumplirse.',
            data_status = 'available',
            metric_value = rec.value,
            previous_metric_value = v_previous,
            evaluated_at = now()
        where rule_id = rec.rule_id
          and entity_id = rec.entity_id
          and metric_code = rec.metric_code
          and period_start = p_period_start
          and period_end = p_period_end
          and status in ('open','acknowledged');
        get diagnostics v_rows = row_count;
        v_resolved := v_resolved + v_rows;
      end if;
    end if;
  end loop;

  return query select v_created, v_resolved;
end;
$$;

revoke all on function evaluate_management_alerts(date,date) from public;
grant execute on function evaluate_management_alerts(date,date) to authenticated;

-- 7. Restrict reads according to business scope while retaining technical-admin access.
create table if not exists management_entity_assignments (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references management_entities(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  assignment_role text not null check (assignment_role in ('owner','leader','viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (entity_id, profile_id, assignment_role)
);

create index if not exists management_entity_assignments_profile_idx
  on management_entity_assignments(profile_id, active, entity_id);

alter table management_entity_assignments enable row level security;

create or replace function can_access_management_entity(target_entity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with recursive ancestors as (
    select e.id, e.parent_id, e.profile_id, e.metadata
    from management_entities e
    where e.id = target_entity_id
    union all
    select parent.id, parent.parent_id, parent.profile_id, parent.metadata
    from management_entities parent
    join ancestors child on child.parent_id = parent.id
  ), current_profile as (
    select lower(coalesce(p.role,'')) as role, p.team
    from profiles p
    where p.id = auth.uid()
  )
  select coalesce((
    select
      cp.role in ('admin','ceo')
      or exists (select 1 from ancestors a where a.profile_id = auth.uid())
      or exists (
        select 1
        from management_entity_assignments mea
        join ancestors a on a.id = mea.entity_id
        where mea.profile_id = auth.uid() and mea.active = true
      )
      or (
        cp.role in ('director','subdirector')
        and exists (
          select 1 from ancestors a
          where nullif(a.metadata->>'team','') = cp.team
             or nullif(a.metadata->>'office','') = cp.team
        )
      )
    from current_profile cp
  ), false);
$$;

revoke all on function can_access_management_entity(uuid) from public;
grant execute on function can_access_management_entity(uuid) to authenticated;

create policy "users read own management assignments"
on management_entity_assignments for select to authenticated
using (
  profile_id = auth.uid()
  or lower(coalesce((select role from profiles where id = auth.uid()),'')) in ('admin','ceo')
);

create policy "executives manage management assignments"
on management_entity_assignments for all to authenticated
using (lower(coalesce((select role from profiles where id = auth.uid()),'')) in ('admin','ceo'))
with check (lower(coalesce((select role from profiles where id = auth.uid()),'')) in ('admin','ceo'));

-- Replace broad read policies with scope-aware policies.
drop policy if exists "authenticated read management entities" on management_entities;
drop policy if exists "authenticated read management metrics" on management_metric_values;
drop policy if exists "authenticated read management goals" on management_goals;
drop policy if exists "authenticated read management alerts" on management_alerts;

create policy "scoped read management entities"
on management_entities for select to authenticated
using (can_access_management_entity(id));

create policy "scoped read management metrics"
on management_metric_values for select to authenticated
using (can_access_management_entity(entity_id));

create policy "scoped read management goals"
on management_goals for select to authenticated
using (can_access_management_entity(entity_id));

create policy "scoped read management alerts"
on management_alerts for select to authenticated
using (can_access_management_entity(entity_id));
