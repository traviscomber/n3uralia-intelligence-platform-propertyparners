create or replace function public.current_user_visible_sellers()
returns table (
  id uuid,
  full_name text,
  team text
)
language sql
stable
security definer
set search_path = public, private
as $$
  select p.id, p.full_name, p.team
  from public.profiles p
  where auth.uid() is not null
    and lower(coalesce(p.role, '')) = 'seller'
    and private.has_management_profile_scope(p.id, auth.uid())
  order by p.full_name;
$$;

revoke all on function public.current_user_visible_sellers() from public;
revoke all on function public.current_user_visible_sellers() from anon;
grant execute on function public.current_user_visible_sellers() to authenticated;

comment on function public.current_user_visible_sellers() is
  'Returns only seller profiles visible to the authenticated management scope without broadening profiles RLS.';
