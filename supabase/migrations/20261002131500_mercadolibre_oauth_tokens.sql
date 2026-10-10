create table if not exists public.mercadolibre_oauth_tokens (
  singleton boolean primary key default true check (singleton),
  user_id bigint,
  access_token text not null,
  refresh_token text not null,
  token_type text not null default 'bearer',
  scope text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mercadolibre_oauth_tokens enable row level security;

revoke all on table public.mercadolibre_oauth_tokens from public;
revoke all on table public.mercadolibre_oauth_tokens from anon;
revoke all on table public.mercadolibre_oauth_tokens from authenticated;
grant all on table public.mercadolibre_oauth_tokens to service_role;

comment on table public.mercadolibre_oauth_tokens is
  'Server-only Mercado Libre OAuth token store. Refresh tokens are rotated atomically by the integration.';
