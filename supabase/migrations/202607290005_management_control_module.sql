-- Módulo III: Control de Gestión Comercial contractual.

create table if not exists management_entities (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('company','office','team','partner','agent')),
  name text not null,
  parent_id uuid references management_entities(id) on delete set null,
  profile_id uuid references profiles(id) on delete set null,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists management_metric_definitions (
  code text primary key,
  label text not null,
  description text not null,
  unit text not null check (unit in ('count','uf','percent','days','score')),
  aggregation text not null check (aggregation in ('sum','average','ratio','last')),
  numerator_code text,
  denominator_code text,
  active boolean not null default true,
  sort_order integer not null default 0,
  methodology text not null,
  created_at timestamptz not null default now()
);

create table if not exists management_metric_values (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references management_entities(id) on delete cascade,
  metric_code text not null references management_metric_definitions(code),
  period_start date not null,
  period_end date not null,
  value numeric not null,
  source_name text not null,
  source_reference text,
  source_cutoff_at timestamptz,
  quality_status text not null default 'verified' check (quality_status in ('verified','provisional','missing','rejected')),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_id, metric_code, period_start, period_end, source_name)
);

create table if not exists management_goals (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references management_entities(id) on delete cascade,
  metric_code text not null references management_metric_definitions(code),
  period_start date not null,
  period_end date not null,
  target_value numeric not null,
  source_name text not null,
  approved_by uuid references profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_id, metric_code, period_start, period_end)
);

create table if not exists management_alert_rules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  metric_code text not null references management_metric_definitions(code),
  comparison text not null check (comparison in ('lt','lte','gt','gte','drop_pct','increase_pct')),
  threshold numeric not null,
  severity text not null check (severity in ('info','warning','critical')),
  scope_type text not null check (scope_type in ('company','office','team','partner','agent','all')),
  active boolean not null default true,
  responsible_role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists management_alerts (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid references management_alert_rules(id) on delete set null,
  entity_id uuid not null references management_entities(id) on delete cascade,
  metric_code text not null references management_metric_definitions(code),
  period_start date not null,
  period_end date not null,
  severity text not null check (severity in ('info','warning','critical')),
  status text not null default 'open' check (status in ('open','acknowledged','resolved','dismissed')),
  title text not null,
  detail text not null,
  metric_value numeric,
  threshold_value numeric,
  assigned_to uuid references profiles(id) on delete set null,
  acknowledged_by uuid references profiles(id) on delete set null,
  acknowledged_at timestamptz,
  resolved_by uuid references profiles(id) on delete set null,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default now()
);

insert into management_metric_definitions (code,label,description,unit,aggregation,numerator_code,denominator_code,sort_order,methodology) values
('listings','Captaciones','Número de propiedades captadas durante el período.','count','sum',null,null,10,'Conteo de captaciones con fecha dentro del período y entidad responsable asignada.'),
('sales','Ventas','Número de cierres de compraventa durante el período.','count','sum',null,null,20,'Conteo de ventas confirmadas con fecha de cierre dentro del período.'),
('sales_uf','Volumen vendido','Suma del valor de ventas confirmadas en UF.','uf','sum',null,null,30,'Suma del valor UF de ventas confirmadas en el período.'),
('leads','Leads','Número de leads ingresados durante el período.','count','sum',null,null,40,'Conteo de leads con fecha de creación dentro del período.'),
('followups','Seguimientos','Actividades de seguimiento completadas durante el período.','count','sum',null,null,50,'Conteo de actividades de seguimiento completadas y atribuibles.'),
('conversion','Conversión','Ventas confirmadas divididas por leads válidos del mismo período.','percent','ratio','sales','leads',60,'Ventas confirmadas / leads válidos * 100. No se mezclan cohortes ni períodos.'),
('productivity','Productividad','Puntaje compuesto normalizado de captaciones, ventas y seguimiento.','score','average',null,null,70,'Promedio ponderado configurable de cumplimiento de captaciones, ventas y seguimiento.'),
('goal_compliance','Cumplimiento de metas','Resultado real dividido por meta aprobada.','percent','ratio',null,null,80,'Valor real / meta aprobada * 100 para la misma entidad, métrica y período.'),
('sales_velocity','Velocidad de venta','Mediana de días entre publicación inicial y venta confirmada.','days','average',null,null,90,'Mediana de días en mercado de propiedades vendidas durante el período.')
on conflict (code) do update set label=excluded.label,description=excluded.description,unit=excluded.unit,aggregation=excluded.aggregation,numerator_code=excluded.numerator_code,denominator_code=excluded.denominator_code,sort_order=excluded.sort_order,methodology=excluded.methodology,active=true;

create index if not exists management_entities_parent_idx on management_entities(parent_id);
create index if not exists management_entities_profile_idx on management_entities(profile_id);
create index if not exists management_metric_values_entity_period_idx on management_metric_values(entity_id,period_start,period_end);
create index if not exists management_metric_values_metric_period_idx on management_metric_values(metric_code,period_start,period_end);
create index if not exists management_goals_entity_period_idx on management_goals(entity_id,period_start,period_end);
create index if not exists management_alerts_entity_status_idx on management_alerts(entity_id,status,severity);

alter table management_entities enable row level security;
alter table management_metric_definitions enable row level security;
alter table management_metric_values enable row level security;
alter table management_goals enable row level security;
alter table management_alert_rules enable row level security;
alter table management_alerts enable row level security;

create policy "authenticated read management entities" on management_entities for select to authenticated using (true);
create policy "authenticated read management definitions" on management_metric_definitions for select to authenticated using (true);
create policy "authenticated read management metrics" on management_metric_values for select to authenticated using (true);
create policy "authenticated read management goals" on management_goals for select to authenticated using (true);
create policy "authenticated read management alert rules" on management_alert_rules for select to authenticated using (true);
create policy "authenticated read management alerts" on management_alerts for select to authenticated using (true);

create policy "executive manage management entities" on management_entities for all to authenticated using (lower(coalesce((select role from profiles where id=auth.uid()),'')) in ('admin','ceo')) with check (lower(coalesce((select role from profiles where id=auth.uid()),'')) in ('admin','ceo'));
create policy "management leaders write metrics" on management_metric_values for all to authenticated using (lower(coalesce((select role from profiles where id=auth.uid()),'')) in ('admin','ceo','director','subdirector')) with check (lower(coalesce((select role from profiles where id=auth.uid()),'')) in ('admin','ceo','director','subdirector'));
create policy "management leaders write goals" on management_goals for all to authenticated using (lower(coalesce((select role from profiles where id=auth.uid()),'')) in ('admin','ceo','director','subdirector')) with check (lower(coalesce((select role from profiles where id=auth.uid()),'')) in ('admin','ceo','director','subdirector'));
create policy "executive manage alert rules" on management_alert_rules for all to authenticated using (lower(coalesce((select role from profiles where id=auth.uid()),'')) in ('admin','ceo')) with check (lower(coalesce((select role from profiles where id=auth.uid()),'')) in ('admin','ceo'));
create policy "management leaders update alerts" on management_alerts for all to authenticated using (lower(coalesce((select role from profiles where id=auth.uid()),'')) in ('admin','ceo','director','subdirector')) with check (lower(coalesce((select role from profiles where id=auth.uid()),'')) in ('admin','ceo','director','subdirector'));
