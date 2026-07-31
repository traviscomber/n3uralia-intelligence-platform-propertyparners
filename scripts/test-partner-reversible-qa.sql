-- Reversible QA matrix for seller scope.
-- Run each block independently. Every block ends with ROLLBACK and leaves no QA data.
-- Replace only the seller UUID, office and labels when extending the matrix.

-- Expected result per seller:
-- own_tasks = 1, own_valuations = 1, foreign_tasks = 0, foreign_valuations = 0.

begin;
with ids as (select gen_random_uuid() as task_id, gen_random_uuid() as valuation_id),
inserted_task as (
  insert into public.management_tasks (id, source_key, title, detail, severity, status, office, subject_profile_id, assigned_to, created_by, due_date, priority)
  select task_id, 'qa-reversible-' || task_id::text, '[QA reversible] seller task', 'Temporary scope test.', 'info', 'open', :'office', :'seller_id'::uuid, :'seller_id'::uuid, :'seller_id'::uuid, current_date + 7, 'medium' from ids returning id
),
inserted_valuation as (
  insert into public.valuation_cases (id, requested_by, status, valuation_date, property_type, address, neighborhood, methodology_version, evidence, assumptions, warnings, qualitative_factors, version_number)
  select valuation_id, :'seller_id'::uuid, 'draft', current_date, 'Departamento', '[QA reversible] seller valuation', 'Vitacura', 'valuation-contract-v1', '{}'::jsonb, '{}'::jsonb, array[]::text[], '{}'::jsonb, 1 from ids returning id
)
select 1;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'seller_id', 'role', 'authenticated')::text, true);
select
  count(*) filter (where title = '[QA reversible] seller task') as own_tasks,
  (select count(*) from public.valuation_cases where address = '[QA reversible] seller valuation') as own_valuations,
  (select count(*) from public.management_tasks where title like '[QA reversible]%' and assigned_to <> auth.uid()) as foreign_tasks,
  (select count(*) from public.valuation_cases where address like '[QA reversible]%' and requested_by <> auth.uid()) as foreign_valuations
from public.management_tasks;
rollback;
