-- Profiles are created only by the invitation trigger or trusted server code.
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;

REVOKE INSERT ON TABLE public.profiles FROM anon, authenticated;
GRANT INSERT ON TABLE public.profiles TO service_role;
