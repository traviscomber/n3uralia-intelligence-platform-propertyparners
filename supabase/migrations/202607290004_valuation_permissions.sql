-- Permisos de escritura del Módulo II.

drop policy if exists "valuation cases insert own" on valuation_cases;
create policy "valuation cases insert own" on valuation_cases
for insert to authenticated
with check (requested_by = auth.uid());

drop policy if exists "valuation cases update own or executive" on valuation_cases;
create policy "valuation cases update own or executive" on valuation_cases
for update to authenticated
using (
  requested_by = auth.uid()
  or exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and lower(p.role::text) in ('admin','ceo','director','subdirector')
  )
)
with check (
  requested_by = auth.uid()
  or exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and lower(p.role::text) in ('admin','ceo','director','subdirector')
  )
);

drop policy if exists "valuation comparables insert authenticated" on valuation_comparables;
create policy "valuation comparables insert authenticated" on valuation_comparables
for insert to authenticated
with check (
  exists (
    select 1 from valuation_cases vc
    where vc.id = valuation_case_id
      and (
        vc.requested_by = auth.uid()
        or exists (
          select 1 from profiles p
          where p.id = auth.uid()
            and lower(p.role::text) in ('admin','ceo','director','subdirector')
        )
      )
  )
);

drop policy if exists "valuation comparables update authenticated" on valuation_comparables;
create policy "valuation comparables update authenticated" on valuation_comparables
for update to authenticated
using (
  exists (
    select 1 from valuation_cases vc
    where vc.id = valuation_case_id
      and (
        vc.requested_by = auth.uid()
        or exists (
          select 1 from profiles p
          where p.id = auth.uid()
            and lower(p.role::text) in ('admin','ceo','director','subdirector')
        )
      )
  )
)
with check (true);

drop policy if exists "valuation comparables delete authenticated" on valuation_comparables;
create policy "valuation comparables delete authenticated" on valuation_comparables
for delete to authenticated
using (
  exists (
    select 1 from valuation_cases vc
    where vc.id = valuation_case_id
      and (
        vc.requested_by = auth.uid()
        or exists (
          select 1 from profiles p
          where p.id = auth.uid()
            and lower(p.role::text) in ('admin','ceo','director','subdirector')
        )
      )
  )
);

drop policy if exists "valuation versions insert authorized" on valuation_case_versions;
create policy "valuation versions insert authorized" on valuation_case_versions
for insert to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1 from valuation_cases vc
    where vc.id = valuation_case_id
      and (
        vc.requested_by = auth.uid()
        or exists (
          select 1 from profiles p
          where p.id = auth.uid()
            and lower(p.role::text) in ('admin','ceo','director','subdirector')
        )
      )
  )
);
