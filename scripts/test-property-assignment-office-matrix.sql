-- Reversible authenticated matrix for property assignment scope.
-- Run against Supabase with RLS enabled. Every allowed write is rolled back.
-- QA director Lo Beltran: 32ffd398-e99b-4b31-8ab2-3fb3b0471e7e
-- Seller Lo Beltran: 774cddcd-3fd4-4f2b-a470-a8316908bb7a
-- Seller Nueva Costanera: c243addb-8de9-4ed5-90a6-ed83598dbcaa
-- Seller Santa Maria: 379bf5ef-6686-4107-b7ee-4fc1c32c9da1

begin;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"32ffd398-e99b-4b31-8ab2-3fb3b0471e7e","role":"authenticated"}',true);

-- Replace :property_id with an existing market_properties.id.
-- Expected: succeeds because the seller belongs to Lo Beltran.
insert into public.property_assignments (
  property_id, assigned_to, assigned_by, assignment_role, status, notes
) values (
  :'property_id',
  '774cddcd-3fd4-4f2b-a470-a8316908bb7a',
  '32ffd398-e99b-4b31-8ab2-3fb3b0471e7e',
  'support', 'active', '[QA ROLLBACK] own-office assignment'
);
rollback;

-- Execute each forbidden case in its own transaction. Expected result:
-- ERROR 42501 new row violates row-level security policy.
-- assigned_to Nueva Costanera: c243addb-8de9-4ed5-90a6-ed83598dbcaa
-- assigned_to Santa Maria: 379bf5ef-6686-4107-b7ee-4fc1c32c9da1
