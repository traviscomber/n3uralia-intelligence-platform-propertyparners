-- Contractual invariant: a valuation needs at least three accepted comparables
-- before entering review and must retain them through approval and issuance.

create or replace function enforce_valuation_minimum_comparables()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  accepted_count integer;
begin
  if new.status in ('review','approved','issued')
     and (old.status is distinct from new.status or tg_op = 'INSERT') then
    select count(*)::integer
    into accepted_count
    from valuation_comparables vc
    where vc.valuation_case_id = new.id
      and vc.selected = true
      and vc.match_status = 'accepted';

    if accepted_count < 3 then
      raise exception using
        errcode = '23514',
        message = 'La valorización requiere al menos 3 comparables aceptados antes de revisión.',
        detail = format('Caso %s tiene %s comparables aceptados.', new.id, accepted_count),
        hint = 'Seleccione y acepte al menos tres comparables trazables.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists valuation_minimum_comparables_guard on valuation_cases;
create trigger valuation_minimum_comparables_guard
before insert or update of status on valuation_cases
for each row
execute function enforce_valuation_minimum_comparables();

-- Prevent removal or rejection of comparables that would invalidate an active case.
create or replace function protect_active_valuation_comparables()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_case_id uuid;
  current_status text;
  accepted_count integer;
begin
  target_case_id := coalesce(new.valuation_case_id, old.valuation_case_id);

  select status into current_status
  from valuation_cases
  where id = target_case_id;

  if current_status in ('review','approved','issued') then
    select count(*)::integer
    into accepted_count
    from valuation_comparables vc
    where vc.valuation_case_id = target_case_id
      and vc.selected = true
      and vc.match_status = 'accepted'
      and (
        tg_op <> 'DELETE'
        or vc.id <> old.id
      );

    if tg_op = 'UPDATE'
       and old.selected = true
       and old.match_status = 'accepted'
       and not (new.selected = true and new.match_status = 'accepted') then
      accepted_count := accepted_count - 1;
    end if;

    if accepted_count < 3 then
      raise exception using
        errcode = '23514',
        message = 'No se puede dejar una valorización activa con menos de 3 comparables aceptados.',
        hint = 'Devuelva primero el caso a borrador o reemplace el comparable.';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists valuation_comparables_active_guard on valuation_comparables;
create trigger valuation_comparables_active_guard
before update or delete on valuation_comparables
for each row
execute function protect_active_valuation_comparables();
