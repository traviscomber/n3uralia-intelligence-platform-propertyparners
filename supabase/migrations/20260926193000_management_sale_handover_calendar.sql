create table if not exists public.management_sale_cases (
  id uuid primary key default gen_random_uuid(),
  source_record_id uuid references public.management_source_records(id) on delete set null,
  operation_key text,
  office text not null,
  seller_name text,
  property_address text,
  property_type text,
  amount_uf numeric,
  sale_date date not null,
  expected_handover_date date not null,
  actual_handover_date date,
  status text not null default 'active' check (status in ('active','delivered','cancelled')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expected_handover_date >= sale_date),
  check (actual_handover_date is null or actual_handover_date >= sale_date)
);

create unique index if not exists management_sale_cases_source_record_unique
on public.management_sale_cases(source_record_id)
where source_record_id is not null;

create index if not exists management_sale_cases_office_status_idx
on public.management_sale_cases(office,status,expected_handover_date);

alter table public.management_sale_cases enable row level security;
revoke all on table public.management_sale_cases from public,anon,authenticated;
grant all on table public.management_sale_cases to service_role;

alter table public.management_tasks
  add column if not exists sale_case_id uuid references public.management_sale_cases(id) on delete cascade,
  add column if not exists milestone_code text;

create unique index if not exists management_tasks_sale_case_milestone_unique
on public.management_tasks(sale_case_id,milestone_code)
where sale_case_id is not null and milestone_code is not null;

create index if not exists management_tasks_sale_case_due_idx
on public.management_tasks(sale_case_id,due_date,status);

create or replace function public.create_management_sale_case_v1(
  p_office text,
  p_sale_date date,
  p_expected_handover_date date,
  p_actor_id uuid,
  p_seller_name text default null,
  p_property_address text default null,
  p_property_type text default null,
  p_amount_uf numeric default null,
  p_operation_key text default null,
  p_source_record_id uuid default null,
  p_assigned_to uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $function$
declare
  v_case_id uuid;
  v_handover date;
  v_tasks integer := 0;
begin
  if p_actor_id is null or p_office is null or btrim(p_office)='' or p_sale_date is null then
    raise exception 'INVALID_SALE_CASE';
  end if;

  v_handover := coalesce(p_expected_handover_date,(p_sale_date + interval '4 months')::date);
  if v_handover < p_sale_date then
    raise exception 'INVALID_HANDOVER_DATE';
  end if;

  insert into public.management_sale_cases(
    source_record_id,operation_key,office,seller_name,property_address,property_type,
    amount_uf,sale_date,expected_handover_date,created_by
  ) values (
    p_source_record_id,
    nullif(btrim(coalesce(p_operation_key,'')),''),
    btrim(p_office),
    nullif(btrim(coalesce(p_seller_name,'')),''),
    nullif(btrim(coalesce(p_property_address,'')),''),
    nullif(btrim(coalesce(p_property_type,'')),''),
    p_amount_uf,
    p_sale_date,
    v_handover,
    p_actor_id
  )
  returning id into v_case_id;

  insert into public.management_tasks(
    source_key,title,detail,severity,status,priority,office,assigned_to,created_by,updated_by,
    due_date,sale_case_id,milestone_code
  )
  select
    'sale-lifecycle:'||v_case_id::text||':'||x.code,
    x.title,
    x.detail,
    case when x.code in ('document_pack','handover') then 'warning' else 'info' end,
    'open',
    case when x.code in ('document_pack','handover') then 'high' else 'medium' end,
    btrim(p_office),
    p_assigned_to,
    p_actor_id,
    p_actor_id,
    x.due_date,
    v_case_id,
    x.code
  from (
    values
      ('document_pack','Documentación de cierre completa','Reunir antecedentes, instrucciones y documentos iniciales del cierre.',least((p_sale_date + 4)::date,v_handover)),
      ('legal_instruction','Promesa e instrucciones legales','Confirmar promesa, condiciones, antecedentes y responsables legales.',least((p_sale_date + 7)::date,v_handover)),
      ('title_study','Estudio de títulos','Revisar títulos, observaciones y documentos pendientes.',least((p_sale_date + 21)::date,v_handover)),
      ('deed_draft','Escritura preparada','Coordinar borrador de escritura, banco y observaciones de las partes.',least((p_sale_date + 35)::date,v_handover)),
      ('deed_signing','Firma de escritura','Confirmar firma de las partes y documentación asociada.',least((p_sale_date + 50)::date,v_handover)),
      ('registration','Inscripción y seguimiento','Dar seguimiento a inscripción, pagos y condiciones para entrega.',least((p_sale_date + 75)::date,v_handover)),
      ('pre_handover','Preparación de entrega','Validar estado de la propiedad, llaves, documentos y coordinación final.',greatest(p_sale_date,(v_handover - 15))),
      ('handover','Entrega de la propiedad','Cerrar entrega, acta, llaves y confirmación de recepción.',v_handover)
  ) as x(code,title,detail,due_date);

  get diagnostics v_tasks = row_count;

  return jsonb_build_object(
    'caseId',v_case_id,
    'tasksCreated',v_tasks,
    'saleDate',p_sale_date,
    'expectedHandoverDate',v_handover
  );
end;
$function$;

revoke all on function public.create_management_sale_case_v1(text,date,date,uuid,text,text,text,numeric,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.create_management_sale_case_v1(text,date,date,uuid,text,text,text,numeric,text,uuid,uuid) to service_role;

comment on table public.management_sale_cases is
'Operational sale-to-handover cases. Sale date and expected handover are canonical operational planning inputs; milestone tasks are generated as editable workflow state.';
comment on function public.create_management_sale_case_v1(text,date,date,uuid,text,text,text,numeric,text,uuid,uuid) is
'Creates a sale-to-handover case and an eight-milestone planning template. Default handover horizon is four calendar months; actual contractual dates remain editable operational inputs.';
