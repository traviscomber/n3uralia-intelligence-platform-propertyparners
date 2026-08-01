-- Reproducible authenticated office-scope test for the QA director.
-- Expected for Isabel Steverlynck / Lo Beltrán:
-- foreign office tasks = 0 and foreign valuations = 0.
begin;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '32ffd398-e99b-4b31-8ab2-3fb3b0471e7e',
    'role', 'authenticated'
  )::text,
  true
);

select
  (select count(*) from public.management_tasks where office = 'Lo Beltrán') as own_office_tasks,
  (select count(*) from public.management_tasks where office in ('Nueva Costanera', 'Santa María')) as foreign_office_tasks,
  (select count(*) from public.valuation_cases where requested_by in (select * from public.current_user_visible_profile_ids())) as visible_valuations,
  (select count(*) from public.valuation_cases where requested_by not in (select * from public.current_user_visible_profile_ids())) as foreign_valuations;

rollback;
