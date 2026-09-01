-- Harden management concurrency without deleting or rewriting existing business data.
-- The migration fails closed if a target environment already contains conflicting rows.

begin;

do $$
begin
  if exists (
    select 1
    from public.management_alerts
    where status in ('open', 'acknowledged')
    group by rule_id, entity_id, metric_code, period_start, period_end
    having count(*) > 1
  ) then
    raise exception 'Duplicate unresolved management alerts exist; reconcile them before applying concurrency hardening.';
  end if;

  if exists (
    select 1
    from public.report_subscriptions
    where active
    group by person_id, audience, channel, recipient, cadence
    having count(*) > 1
  ) then
    raise exception 'Duplicate active report subscriptions exist; reconcile them before applying concurrency hardening.';
  end if;
end;
$$;

create unique index if not exists management_alerts_unresolved_key_uq
  on public.management_alerts (rule_id, entity_id, metric_code, period_start, period_end)
  where status in ('open', 'acknowledged');

create unique index if not exists report_subscriptions_active_key_uq
  on public.report_subscriptions (person_id, audience, channel, recipient, cadence)
  where active;

create or replace function public.evaluate_management_alerts(
  p_period_start date,
  p_period_end date
)
returns table(created_count integer, resolved_count integer)
language plpgsql
security definer
set search_path to 'public', 'private'
as $function$
declare
  v_created int := 0;
  v_resolved int := 0;
  v_rows int := 0;
  rec record;
  v_triggered boolean;
  v_previous numeric;
  v_change numeric;
  v_role text;
begin
  select lower(coalesce(role, ''))
    into v_role
  from public.profiles
  where id = auth.uid();

  if v_role not in ('admin', 'ceo', 'director', 'subdirector') then
    raise exception 'Sin permiso para evaluar alertas' using errcode = '42501';
  end if;

  for rec in
    select
      r.id rule_id,
      r.label,
      r.metric_code,
      r.comparison,
      r.threshold,
      r.severity,
      e.id entity_id,
      e.name entity_name,
      m.value,
      m.quality_status,
      m.evaluation_status
    from public.management_alert_rules r
    join public.management_entities e
      on e.active
      and (r.scope_type = 'all' or r.scope_type = e.entity_type)
    left join public.management_metric_values m
      on m.entity_id = e.id
      and m.metric_code = r.metric_code
      and m.period_start = p_period_start
      and m.period_end = p_period_end
    where r.active
      and (v_role in ('admin', 'ceo') or private.can_access_management_entity(e.id))
  loop
    if rec.value is null
      or coalesce(rec.evaluation_status, 'missing_source') <> 'evaluable'
      or coalesce(rec.quality_status, 'missing') not in ('verified', 'provisional')
    then
      update public.management_alerts
      set data_status = case when rec.quality_status = 'rejected' then 'rejected' else 'unavailable' end,
          evaluated_at = now()
      where rule_id = rec.rule_id
        and entity_id = rec.entity_id
        and metric_code = rec.metric_code
        and period_start = p_period_start
        and period_end = p_period_end
        and status in ('open', 'acknowledged');
      continue;
    end if;

    v_previous := null;
    v_change := null;

    if rec.comparison in ('drop_pct', 'increase_pct') then
      select mv.value
        into v_previous
      from public.management_metric_values mv
      where mv.entity_id = rec.entity_id
        and mv.metric_code = rec.metric_code
        and mv.period_end < p_period_start
        and mv.value is not null
        and mv.evaluation_status = 'evaluable'
        and mv.quality_status = 'verified'
      order by mv.period_end desc, mv.updated_at desc
      limit 1;

      if v_previous is null or v_previous = 0 then
        continue;
      end if;

      v_change := ((rec.value - v_previous) / abs(v_previous)) * 100.0;
    end if;

    v_triggered := case rec.comparison
      when 'lt' then rec.value < rec.threshold
      when 'lte' then rec.value <= rec.threshold
      when 'gt' then rec.value > rec.threshold
      when 'gte' then rec.value >= rec.threshold
      when 'drop_pct' then v_change <= -abs(rec.threshold)
      when 'increase_pct' then v_change >= abs(rec.threshold)
      else false
    end;

    if v_triggered then
      insert into public.management_alerts(
        rule_id,
        entity_id,
        metric_code,
        period_start,
        period_end,
        severity,
        status,
        title,
        detail,
        metric_value,
        previous_metric_value,
        threshold_value,
        data_status,
        evaluated_at
      ) values (
        rec.rule_id,
        rec.entity_id,
        rec.metric_code,
        p_period_start,
        p_period_end,
        rec.severity,
        'open',
        rec.label,
        case
          when rec.comparison in ('drop_pct', 'increase_pct')
            then rec.entity_name || ': variación ' || round(v_change, 2) || '% frente a umbral ' || rec.threshold || '%.'
          else rec.entity_name || ': valor ' || rec.value || ' frente a umbral ' || rec.threshold || '.'
        end,
        rec.value,
        v_previous,
        rec.threshold,
        case when rec.quality_status = 'provisional' then 'provisional' else 'available' end,
        now()
      )
      on conflict do nothing;

      get diagnostics v_rows = row_count;
      v_created := v_created + v_rows;
    elsif rec.quality_status = 'verified' then
      update public.management_alerts
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
        and status in ('open', 'acknowledged');

      get diagnostics v_rows = row_count;
      v_resolved := v_resolved + v_rows;
    end if;
  end loop;

  return query select v_created, v_resolved;
end
$function$;

commit;
