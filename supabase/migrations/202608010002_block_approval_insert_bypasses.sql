-- Block direct-insert bypasses for valuation workflow and metric publication.

begin;

create or replace function public.protect_valuation_case_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  viewer uuid := auth.uid();
begin
  if viewer is null then
    return new;
  end if;

  if new.requested_by is distinct from viewer then
    raise exception 'La valorización debe pertenecer al usuario autenticado' using errcode='42501';
  end if;
  if new.status is distinct from 'draft' then
    raise exception 'Toda valorización debe crearse en borrador' using errcode='42501';
  end if;
  if new.reviewed_by is not null
     or new.reviewed_at is not null
     or new.approved_by is not null
     or new.approved_at is not null
     or new.issued_at is not null then
    raise exception 'Una valorización nueva no puede incluir revisión, aprobación o emisión' using errcode='42501';
  end if;

  return new;
end;
$function$;

revoke all on function public.protect_valuation_case_insert() from public, anon, authenticated;

drop trigger if exists protect_valuation_case_insert on public.valuation_cases;
create trigger protect_valuation_case_insert
before insert on public.valuation_cases
for each row execute function public.protect_valuation_case_insert();

create or replace function public.protect_management_reconciliation_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  viewer uuid := auth.uid();
  viewer_role text;
  was_approved boolean := false;
  approval_changed boolean := false;
begin
  if viewer is null then
    return new;
  end if;

  select lower(coalesce(role,'')) into viewer_role
  from public.profiles
  where id = viewer;

  if tg_op = 'UPDATE' then
    was_approved := old.publication_status = 'approved';
    approval_changed := old.publication_status is distinct from new.publication_status
      or old.approved_by is distinct from new.approved_by
      or old.approved_at is distinct from new.approved_at;
  else
    approval_changed := new.publication_status = 'approved'
      or new.approved_by is not null
      or new.approved_at is not null;
  end if;

  if new.publication_status = 'approved' and approval_changed then
    if viewer_role <> 'ceo' then
      raise exception 'Solo Dirección puede aprobar la publicación de métricas' using errcode='42501';
    end if;
    if new.approved_by is distinct from viewer then
      raise exception 'El aprobador debe coincidir con el CEO autenticado' using errcode='42501';
    end if;
    if new.approved_at is null then
      raise exception 'La aprobación requiere fecha de aprobación' using errcode='23514';
    end if;
  elsif new.publication_status <> 'approved'
        and (new.approved_by is not null or new.approved_at is not null) then
    raise exception 'Los metadatos de aprobación sólo corresponden a publicaciones aprobadas' using errcode='23514';
  end if;

  if was_approved and viewer_role <> 'ceo' then
    raise exception 'Solo Dirección puede modificar una reconciliación aprobada' using errcode='42501';
  end if;

  return new;
end;
$function$;

revoke all on function public.protect_management_reconciliation_approval() from public, anon, authenticated;

drop trigger if exists protect_management_reconciliation_approval on public.management_metric_reconciliations;
create trigger protect_management_reconciliation_approval
before insert or update on public.management_metric_reconciliations
for each row execute function public.protect_management_reconciliation_approval();

commit;
