-- 0008_login_throttle.sql
-- Registro de intentos de acceso para frenar la fuerza bruta desde la app.
-- La tabla queda cerrada: RLS activo y sin políticas, de modo que anon y
-- authenticated no pueden leerla ni escribirla. Solo la usa el servidor con la
-- clave secreta (service_role), que ignora RLS.

create table if not exists public.login_attempts (
  id bigint generated always as identity primary key,
  account text not null,
  ip_hash text not null,
  ok boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists login_attempts_lookup
  on public.login_attempts (account, ip_hash, created_at desc);

create index if not exists login_attempts_ip
  on public.login_attempts (ip_hash, created_at desc);

create index if not exists login_attempts_created
  on public.login_attempts (created_at);

alter table public.login_attempts enable row level security;

revoke all on public.login_attempts from anon, authenticated;
revoke all on sequence public.login_attempts_id_seq from anon, authenticated;

comment on table public.login_attempts is
  'Intentos de acceso (cuenta + IP hasheada). Solo accesible con la clave secreta del servidor.';
