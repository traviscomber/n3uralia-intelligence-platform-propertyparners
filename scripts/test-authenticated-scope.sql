-- Reproducible authenticated RLS scope checks.
-- Run each block independently in Supabase SQL editor.
-- Every block uses SET LOCAL ROLE authenticated and rolls back.

-- CEO: global scope.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"09e1d747-5e3d-4e78-8cbb-829eafaa3e02","role":"authenticated"}', true);
select
  'ceo' as actor,
  (select count(*) from public.current_user_visible_profile_ids()) as visible_profiles,
  (select count(*) from public.current_user_visible_entity_ids()) as visible_entities,
  (select count(*) from public.valuation_cases) as visible_valuations,
  (select count(*) from public.property_assignments) as visible_assignments,
  (select count(*) from public.management_tasks) as visible_tasks;
rollback;

-- Director Lo Beltran: office scope.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"32ffd398-e99b-4b31-8ab2-3fb3b0471e7e","role":"authenticated"}', true);
select
  'director_lo_beltran' as actor,
  (select count(*) from public.current_user_visible_profile_ids()) as visible_profiles,
  (select count(*) from public.current_user_visible_entity_ids()) as visible_entities,
  (select count(*) from public.valuation_cases) as visible_valuations,
  (select count(*) from public.property_assignments) as visible_assignments,
  (select count(*) from public.management_tasks) as visible_tasks;
rollback;

-- Seller Lo Beltran: self scope.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"774cddcd-3fd4-4f2b-a470-a8316908bb7a","role":"authenticated"}', true);
select
  'seller_lo_beltran' as actor,
  (select count(*) from public.current_user_visible_profile_ids()) as visible_profiles,
  (select count(*) from public.current_user_visible_entity_ids()) as visible_entities,
  (select count(*) from public.valuation_cases) as visible_valuations,
  (select count(*) from public.property_assignments) as visible_assignments,
  (select count(*) from public.management_tasks) as visible_tasks;
rollback;

-- Seller Nueva Costanera: self scope.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c243addb-8de9-4ed5-90a6-ed83598dbcaa","role":"authenticated"}', true);
select
  'seller_nueva_costanera' as actor,
  (select count(*) from public.current_user_visible_profile_ids()) as visible_profiles,
  (select count(*) from public.current_user_visible_entity_ids()) as visible_entities,
  (select count(*) from public.valuation_cases) as visible_valuations,
  (select count(*) from public.property_assignments) as visible_assignments,
  (select count(*) from public.management_tasks) as visible_tasks;
rollback;

-- Seller Santa Maria: self scope.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"379bf5ef-6686-4107-b7ee-4fc1c32c9da1","role":"authenticated"}', true);
select
  'seller_santa_maria' as actor,
  (select count(*) from public.current_user_visible_profile_ids()) as visible_profiles,
  (select count(*) from public.current_user_visible_entity_ids()) as visible_entities,
  (select count(*) from public.valuation_cases) as visible_valuations,
  (select count(*) from public.property_assignments) as visible_assignments,
  (select count(*) from public.management_tasks) as visible_tasks;
rollback;
