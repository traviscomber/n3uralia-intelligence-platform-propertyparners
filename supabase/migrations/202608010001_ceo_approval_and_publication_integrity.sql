-- CEO-only business approvals and referentially safe canonical metric publication.
-- Direction is the CEO; office directors and technical admins cannot approve or issue.

begin;

create or replace function public.protect_valuation_case_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  viewer uuid := auth.uid();
  viewer_role text;
  office_reviewer boolean := false;
  approval_fields_changed boolean := false;
begin
  if viewer is null then
    return new;
  end if;

  select lower(coalesce(role,'')) into viewer_role
  from public.profiles
  where id = viewer;

  office_reviewer := viewer_role in ('director','subdirector')
    and public.has_management_profile_scope(old.requested_by, viewer);

  approval_fields_changed :=
    new.approved_by is distinct from old.approved_by
    or new.approved_at is distinct from old.approved_at
    or new.issued_at is distinct from old.issued_at;

  -- Approval, issuance and any mutation of their audit fields belong only to the CEO.
  if new.status in ('approved','issued')
     or old.status in ('approved','issued') and new.status is distinct from old.status
     or approval_fields_changed then
    if viewer_role <> 'ceo' then
      raise exception 'Solo Dirección puede aprobar o emitir valorizaciones' using errcode='42501';
    end if;
    return new;
  end if;

  -- The controlled submit RPC may only perform draft -> review.
  if current_setting('app.valuation_authorized_transition', true) = 'on' then
    if old.status = 'draft' and new.status = 'review' then
      return new;
    end if;
    raise exception 'Transición autorizada inválida' using errcode='42501';
  end if;

  -- CEO can review globally. Office direction can review and return cases in its scope.
  if viewer_role = 'ceo' or office_reviewer then
    if new.status is distinct from old.status
       and not (old.status = 'review' and new.status = 'draft') then
      raise exception 'La dirección de oficina sólo puede devolver casos en revisión a borrador' using errcode='42501';
    end if;
    return new;
  end if;

  if old.requested_by <> viewer then
    raise exception 'No autorizado para modificar esta valorización' using errcode='42501';
  end if;

  if old.status <> all(array['draft','returned','observed']) then
    raise exception 'La valorización no es editable en su estado actual';
  end if;

  if new.requested_by is distinct from old.requested_by
     or new.reviewed_by is distinct from old.reviewed_by
     or new.reviewed_at is distinct from old.reviewed_at
     or approval_fields_changed
     or new.status is distinct from old.status
     or new.version_number is distinct from old.version_number
     or new.methodology_version is distinct from old.methodology_version then
    raise exception 'Los campos de revisión, aprobación, emisión, estado, versión y metodología requieren una transición autorizada' using errcode='42501';
  end if;

  return new;
end;
$function$;

revoke all on function public.protect_valuation_case_update() from public, anon, authenticated;

create or replace function public.submit_valuation_for_review(target_case_id uuid, reason text default null)
returns public.valuation_cases
language plpgsql
security definer
set search_path = public
as $function$
declare
  viewer uuid := auth.uid();
  current_case public.valuation_cases;
  accepted_count integer;
begin
  if viewer is null then
    raise exception 'Autenticación requerida' using errcode='42501';
  end if;

  select * into current_case
  from public.valuation_cases
  where id = target_case_id
  for update;

  if current_case.id is null or current_case.requested_by <> viewer then
    raise exception 'Caso no autorizado' using errcode='42501';
  end if;
  if current_case.status <> 'draft' then
    raise exception 'El caso no puede enviarse a revisión desde su estado actual';
  end if;

  select count(*) into accepted_count
  from public.valuation_comparables
  where valuation_case_id = target_case_id
    and selected = true
    and match_status = 'accepted'
    and coalesce(price_uf_m2,0) > 0;

  if accepted_count < 3 then
    raise exception 'Se requieren al menos tres comparables aceptados';
  end if;

  perform set_config('app.valuation_authorized_transition','on',true);
  update public.valuation_cases
  set status = 'review',
      version_number = coalesce(version_number,1) + 1,
      updated_at = now()
  where id = target_case_id
  returning * into current_case;
  perform set_config('app.valuation_authorized_transition','off',true);

  insert into public.valuation_case_versions(valuation_case_id,version_number,status,snapshot,created_by)
  values(target_case_id,current_case.version_number,'review',jsonb_build_object('valuationCase',to_jsonb(current_case),'acceptedComparableCount',accepted_count),viewer);

  insert into public.valuation_decision_log(valuation_case_id,action,actor_id,previous_state,new_state,reason)
  values(target_case_id,'submitted_for_review',viewer,jsonb_build_object('status','draft'),jsonb_build_object('status','review','versionNumber',current_case.version_number,'acceptedComparableCount',accepted_count),reason);

  return current_case;
end;
$function$;

revoke execute on function public.submit_valuation_for_review(uuid,text) from public, anon;
grant execute on function public.submit_valuation_for_review(uuid,text) to authenticated;

alter table public.management_metric_reconciliations
  drop constraint if exists management_metric_reconciliations_approval_metadata_check;
alter table public.management_metric_reconciliations
  add constraint management_metric_reconciliations_approval_metadata_check
  check (
    publication_status <> 'approved'
    or (approved_by is not null and approved_at is not null and calculated_value_id is not null)
  );

create or replace function public.protect_management_reconciliation_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  viewer uuid := auth.uid();
  viewer_role text;
begin
  if viewer is null then
    return new;
  end if;

  select lower(coalesce(role,'')) into viewer_role
  from public.profiles
  where id = viewer;

  if new.publication_status = 'approved'
     and (old.publication_status is distinct from new.publication_status
          or old.approved_by is distinct from new.approved_by
          or old.approved_at is distinct from new.approved_at) then
    if viewer_role <> 'ceo' then
      raise exception 'Solo Dirección puede aprobar la publicación de métricas' using errcode='42501';
    end if;
    if new.approved_by is distinct from viewer then
      raise exception 'El aprobador debe coincidir con el CEO autenticado' using errcode='42501';
    end if;
  end if;

  if old.publication_status = 'approved' and viewer_role <> 'ceo' then
    raise exception 'Solo Dirección puede modificar una reconciliación aprobada' using errcode='42501';
  end if;

  return new;
end;
$function$;

revoke all on function public.protect_management_reconciliation_approval() from public, anon, authenticated;

drop trigger if exists protect_management_reconciliation_approval on public.management_metric_reconciliations;
create trigger protect_management_reconciliation_approval
before update on public.management_metric_reconciliations
for each row execute function public.protect_management_reconciliation_approval();

create or replace view public.management_approved_metric_values
with (security_invoker = true) as
select
  r.entity_id,
  r.metric_code,
  r.period_start,
  r.period_end,
  mv.id as metric_value_id,
  mv.value,
  mv.formula_version,
  r.reconciliation_status,
  r.publication_status,
  r.evidence,
  r.approved_by,
  r.approved_at
from public.management_metric_reconciliations r
join public.management_metric_values mv
  on mv.id = r.calculated_value_id
 and mv.entity_id = r.entity_id
 and mv.metric_code = r.metric_code
 and mv.period_start = r.period_start
 and mv.period_end = r.period_end
 and mv.formula_version = r.formula_version
where r.publication_status = 'approved'
  and r.reconciliation_status in ('exact','within_tolerance')
  and r.approved_by is not null
  and r.approved_at is not null
  and mv.source_name = 'canonical_calculated_v1'
  and mv.quality_status = 'verified'
  and mv.evaluation_status = 'evaluable'
  and mv.value is not null
  and mv.value is not distinct from r.calculated_value;

grant select on public.management_approved_metric_values to authenticated;

commit;
