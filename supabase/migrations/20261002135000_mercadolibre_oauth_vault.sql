create or replace function public.get_mercadolibre_oauth_credentials_v1()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'client_id',
    (select decrypted_secret from vault.decrypted_secrets where name = 'mercadolibre_client_id' order by created_at desc limit 1),
    'client_secret',
    (select decrypted_secret from vault.decrypted_secrets where name = 'mercadolibre_client_secret' order by created_at desc limit 1)
  );
$$;

revoke all on function public.get_mercadolibre_oauth_credentials_v1() from public;
revoke all on function public.get_mercadolibre_oauth_credentials_v1() from anon;
revoke all on function public.get_mercadolibre_oauth_credentials_v1() from authenticated;
grant execute on function public.get_mercadolibre_oauth_credentials_v1() to service_role;
