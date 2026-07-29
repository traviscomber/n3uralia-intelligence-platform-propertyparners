-- Motor automático de alertas y snapshots de reportes contractuales.

create table if not exists management_report_runs (
  id uuid primary key default gen_random_uuid(),
  report_type text not null check (report_type in ('executive','office','partner','monthly','cumulative')),
  entity_id uuid references management_entities(id) on delete set null,
  period_start date not null,
  period_end date not null,
  status text not null default 'generated' check (status in ('generated','distributed','failed')),
  snapshot jsonb not null,
  generated_by uuid references profiles(id) on delete set null,
  generated_at timestamptz not null default now(),
  distributed_at timestamptz,
  distribution_reference text
);

create index if not exists management_report_runs_period_idx on management_report_runs(report_type,period_start,period_end,generated_at desc);

alter table management_report_runs enable row level security;
create policy "authenticated read management reports" on management_report_runs for select to authenticated using (true);
create policy "management leaders create management reports" on management_report_runs for insert to authenticated with check (lower(coalesce((select role from profiles where id=auth.uid()),'')) in ('admin','ceo','director','subdirector'));
create policy "management leaders update management reports" on management_report_runs for update to authenticated using (lower(coalesce((select role from profiles where id=auth.uid()),'')) in ('admin','ceo','director','subdirector')) with check (lower(coalesce((select role from profiles where id=auth.uid()),'')) in ('admin','ceo','director','subdirector'));

create or replace function evaluate_management_alerts(p_period_start date, p_period_end date)
returns table(created_count integer, resolved_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created integer := 0;
  v_resolved integer := 0;
  rec record;
  v_triggered boolean;
begin
  for rec in
    select r.id as rule_id,r.code,r.label,r.metric_code,r.comparison,r.threshold,r.severity,r.scope_type,r.responsible_role,
           e.id as entity_id,e.name as entity_name,e.entity_type,m.value
    from management_alert_rules r
    join management_entities e on e.active = true and (r.scope_type='all' or r.scope_type=e.entity_type)
    left join management_metric_values m on m.entity_id=e.id and m.metric_code=r.metric_code and m.period_start=p_period_start and m.period_end=p_period_end
    where r.active=true
  loop
    v_triggered := false;
    if rec.value is not null then
      v_triggered := case rec.comparison
        when 'lt' then rec.value < rec.threshold
        when 'lte' then rec.value <= rec.threshold
        when 'gt' then rec.value > rec.threshold
        when 'gte' then rec.value >= rec.threshold
        else false
      end;
    end if;

    if v_triggered then
      if not exists (
        select 1 from management_alerts a
        where a.rule_id=rec.rule_id and a.entity_id=rec.entity_id and a.metric_code=rec.metric_code
          and a.period_start=p_period_start and a.period_end=p_period_end and a.status in ('open','acknowledged')
      ) then
        insert into management_alerts(rule_id,entity_id,metric_code,period_start,period_end,severity,status,title,detail,metric_value,threshold_value)
        values(rec.rule_id,rec.entity_id,rec.metric_code,p_period_start,p_period_end,rec.severity,'open',rec.label,
          rec.entity_name || ': valor ' || rec.value || ' frente a umbral ' || rec.threshold || '.',rec.value,rec.threshold);
        v_created := v_created + 1;
      end if;
    else
      update management_alerts
      set status='resolved',resolved_at=now(),resolution_notes='Resuelta automáticamente: la condición dejó de cumplirse.'
      where rule_id=rec.rule_id and entity_id=rec.entity_id and metric_code=rec.metric_code
        and period_start=p_period_start and period_end=p_period_end and status in ('open','acknowledged');
      get diagnostics v_resolved = v_resolved + row_count;
    end if;
  end loop;
  return query select v_created,v_resolved;
end;
$$;

revoke all on function evaluate_management_alerts(date,date) from public;
grant execute on function evaluate_management_alerts(date,date) to authenticated;
