-- Valuation comparables are operational data: owner, CEO, or same-office direction only.
-- Technical administrators retain platform administration but are not business operators.

begin;

create or replace function public.protect_valuation_comparable_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  viewer uuid := auth.uid();
  case_id uuid := coalesce(new.valuation_case_id, old.valuation_case_id);
  case_owner uuid;
  case_status text;
  viewer_role text;
  viewer_team text;
  owner_team text;
begin
  if viewer is null then
    return coalesce(new, old);
  end if;

  select requested_by, status
    into case_owner, case_status
  from public.valuation_cases
  where id = case_id;

  if case_owner is null then
    raise exception 'Caso de valorización inexistente';
  end if;

  select lower(coalesce(role, '')), team
    into viewer_role, viewer_team
  from public.profiles
  where id = viewer;

  select team into owner_team
  from public.profiles
  where id = case_owner;

  if not (
    case_owner = viewer
    or viewer_role = 'ceo'
    or (
      viewer_role = any(array['director','subdirector'])
      and coalesce(viewer_team, '') <> ''
      and public.normalize_management_text(viewer_team) = public.normalize_management_text(owner_team)
    )
  ) then
    raise exception 'No autorizado para operar comparables de esta valorización' using errcode = '42501';
  end if;

  if case_status <> all(array['draft','returned','observed']) then
    raise exception 'Los comparables están bloqueados en el estado actual';
  end if;

  return coalesce(new, old);
end;
$function$;

revoke all on function public.protect_valuation_comparable_mutation() from public, anon, authenticated;

commit;
