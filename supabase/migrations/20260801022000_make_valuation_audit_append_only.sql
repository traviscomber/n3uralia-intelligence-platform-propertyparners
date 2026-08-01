-- Valuation versions and decision logs are evidentiary records.
-- They may be appended through authorized workflows, but never edited or deleted.

create or replace function public.reject_valuation_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Los registros históricos de valorización son inmutables'
    using errcode = '42501';
end;
$$;

revoke update, delete, truncate on table public.valuation_case_versions from anon, authenticated;
revoke update, delete, truncate on table public.valuation_decision_log from anon, authenticated;
revoke insert on table public.valuation_case_versions from anon;
revoke insert on table public.valuation_decision_log from anon;

drop policy if exists "valuation versions delete scoped" on public.valuation_case_versions;

drop trigger if exists protect_valuation_case_version_mutation on public.valuation_case_versions;
create trigger protect_valuation_case_version_mutation
before update or delete on public.valuation_case_versions
for each row execute function public.reject_valuation_audit_mutation();

drop trigger if exists protect_valuation_decision_log_mutation on public.valuation_decision_log;
create trigger protect_valuation_decision_log_mutation
before update or delete on public.valuation_decision_log
for each row execute function public.reject_valuation_audit_mutation();

create or replace function public.validate_valuation_case_version_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  current_case public.valuation_cases;
begin
  if viewer is null then
    raise exception 'Autenticación requerida' using errcode = '42501';
  end if;

  if new.created_by is distinct from viewer then
    raise exception 'El creador de la versión debe ser el usuario autenticado' using errcode = '42501';
  end if;

  select * into current_case
  from public.valuation_cases
  where id = new.valuation_case_id;

  if current_case.id is null then
    raise exception 'Valorización inexistente';
  end if;

  if not public.has_valuation_case_scope(new.valuation_case_id, viewer) then
    raise exception 'Caso no autorizado' using errcode = '42501';
  end if;

  if new.version_number is distinct from current_case.version_number then
    raise exception 'La versión histórica no coincide con la versión vigente del caso';
  end if;

  if new.status is distinct from current_case.status then
    raise exception 'El estado histórico no coincide con el estado vigente del caso';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_valuation_case_version_insert on public.valuation_case_versions;
create trigger validate_valuation_case_version_insert
before insert on public.valuation_case_versions
for each row execute function public.validate_valuation_case_version_insert();
