create or replace function public.current_user_visible_profile_ids()
returns table(profile_id uuid)
language sql
stable
security invoker
set search_path = public, private
as $$
  select profile_id
  from private.current_user_visible_profile_ids();
$$;

revoke all on function public.current_user_visible_profile_ids() from public, anon;
grant execute on function public.current_user_visible_profile_ids() to authenticated, service_role;

comment on function public.current_user_visible_profile_ids() is
  'Compatibility RPC wrapper delegating to private.current_user_visible_profile_ids().';
