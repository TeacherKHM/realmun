-- RealMUN — esquema inicial
-- 4 comités, sesiones múltiples, asistencia, sanciones, hojas de resolución,
-- rúbrica de evaluación y estado del cronómetro (sincronizado con la TV).

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table if not exists public.committees (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique,          -- comite-1 … comite-4 (slug de ruta)
  sigla             text not null,                 -- COM I
  name              text not null,                 -- Comité I
  topic             text,
  accent            text not null default '#4B92DB',
  sort_order        integer not null default 0,
  active_session_id uuid,                          -- FK agregada después de sessions
  created_at        timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  committee_id uuid not null references public.committees(id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

create table if not exists public.sessions (
  id           uuid primary key default gen_random_uuid(),
  committee_id uuid not null references public.committees(id) on delete cascade,
  title        text not null default 'Sesión',
  session_date date not null default current_date,
  status       text not null default 'activa' check (status in ('activa', 'finalizada')),
  created_at   timestamptz not null default now()
);

alter table public.committees
  drop constraint if exists committees_active_session_fk;
alter table public.committees
  add constraint committees_active_session_fk
  foreign key (active_session_id) references public.sessions(id) on delete set null;

create table if not exists public.delegates (
  id           uuid primary key default gen_random_uuid(),
  committee_id uuid not null references public.committees(id) on delete cascade,
  name         text not null,                      -- nombre del delegado
  delegation   text,                               -- país / entidad representada
  active       boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

do $$ begin
  create type public.attendance_status as enum ('presente', 'ausente', 'justificado', 'retardo');
exception when duplicate_object then null; end $$;

create table if not exists public.attendance (
  id           uuid primary key default gen_random_uuid(),
  committee_id uuid not null references public.committees(id) on delete cascade,
  session_id   uuid not null references public.sessions(id) on delete cascade,
  delegate_id  uuid not null references public.delegates(id) on delete cascade,
  status       public.attendance_status not null,
  note         text,
  updated_at   timestamptz not null default now(),
  unique (session_id, delegate_id)
);

do $$ begin
  create type public.sanction_type as enum ('amonestacion', 'advertencia', 'disciplina');
exception when duplicate_object then null; end $$;

create table if not exists public.sanctions (
  id           uuid primary key default gen_random_uuid(),
  committee_id uuid not null references public.committees(id) on delete cascade,
  session_id   uuid references public.sessions(id) on delete set null,
  delegate_id  uuid not null references public.delegates(id) on delete cascade,
  type         public.sanction_type not null,
  reason       text not null,
  created_at   timestamptz not null default now()
);

create table if not exists public.resolutions (
  id           uuid primary key default gen_random_uuid(),
  committee_id uuid not null references public.committees(id) on delete cascade,
  session_id   uuid references public.sessions(id) on delete set null,
  delegate_id  uuid not null references public.delegates(id) on delete cascade,
  version      integer not null default 1,
  received_at  timestamptz not null default now(),
  notes        text,
  unique (session_id, delegate_id, version)
);

create table if not exists public.rubric_scores (
  id           uuid primary key default gen_random_uuid(),
  committee_id uuid not null references public.committees(id) on delete cascade,
  session_id   uuid not null references public.sessions(id) on delete cascade,
  delegate_id  uuid not null references public.delegates(id) on delete cascade,
  scores       jsonb not null default '[]'::jsonb,  -- [{ key, label, score }]
  comment      text,
  updated_at   timestamptz not null default now(),
  unique (session_id, delegate_id)
);

create table if not exists public.timer_state (
  committee_id uuid primary key references public.committees(id) on delete cascade,
  mode         text not null default 'countdown' check (mode in ('countdown', 'countup')),
  running      boolean not null default false,
  label        text,
  speaker      text,
  ends_at      timestamptz,
  remaining_ms bigint,
  started_at   timestamptz,
  elapsed_ms   bigint,
  updated_at   timestamptz not null default now()
);

create index if not exists sessions_committee_idx on public.sessions (committee_id);
create index if not exists delegates_committee_idx on public.delegates (committee_id);
create index if not exists attendance_session_idx on public.attendance (session_id);
create index if not exists sanctions_committee_idx on public.sanctions (committee_id);
create index if not exists resolutions_committee_idx on public.resolutions (committee_id);
create index if not exists rubric_committee_idx on public.rubric_scores (committee_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

-- Comité del usuario autenticado (una cuenta por comité).
create or replace function public.current_committee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select committee_id from public.profiles where user_id = auth.uid()
$$;

grant execute on function public.current_committee_id() to authenticated;

alter table public.committees     enable row level security;
alter table public.profiles       enable row level security;
alter table public.sessions       enable row level security;
alter table public.delegates      enable row level security;
alter table public.attendance     enable row level security;
alter table public.sanctions      enable row level security;
alter table public.resolutions    enable row level security;
alter table public.rubric_scores  enable row level security;
alter table public.timer_state    enable row level security;

-- committees: catálogo público (sigla, nombre, tema) — sin datos sensibles.
drop policy if exists committees_public_read on public.committees;
create policy committees_public_read on public.committees
  for select to anon, authenticated using (true);

-- profiles: cada quien ve y edita su propia fila.
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array[
    'sessions', 'delegates', 'attendance', 'sanctions', 'resolutions', 'rubric_scores'
  ] loop
    execute format('drop policy if exists %I_committee on public.%I', t, t);
    execute format($f$
      create policy %I_committee on public.%I
        for all to authenticated
        using (committee_id = public.current_committee_id())
        with check (committee_id = public.current_committee_id())
    $f$, t, t);
  end loop;
end $$;

-- timer_state: lectura pública (la TV no tiene sesión), escritura solo del comité.
drop policy if exists timer_state_public_read on public.timer_state;
create policy timer_state_public_read on public.timer_state
  for select to anon, authenticated using (true);

drop policy if exists timer_state_committee_write on public.timer_state;
create policy timer_state_committee_write on public.timer_state
  for all to authenticated
  using (committee_id = public.current_committee_id())
  with check (committee_id = public.current_committee_id());

-- ---------------------------------------------------------------------------
-- Marcador público para la pantalla de TV (evita exponer motivos de sanción)
-- ---------------------------------------------------------------------------

create or replace function public.committee_tv_stats(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'committee', jsonb_build_object(
      'code', c.code, 'sigla', c.sigla, 'name', c.name,
      'topic', c.topic, 'accent', c.accent
    ),
    'session', (
      select jsonb_build_object('id', s.id, 'title', s.title, 'date', s.session_date, 'status', s.status)
      from public.sessions s where s.id = c.active_session_id
    ),
    'delegates_total', (
      select count(*) from public.delegates d where d.committee_id = c.id and d.active
    ),
    'presence', coalesce((
      select jsonb_object_agg(x.status, x.total)
      from (
        select a.status::text as status, count(*)::int as total
        from public.attendance a
        where a.session_id = c.active_session_id
        group by a.status
      ) x
    ), '{}'::jsonb),
    'sanctions', coalesce((
      select jsonb_object_agg(y.type, y.total)
      from (
        select s.type::text as type, count(*)::int as total
        from public.sanctions s
        where s.committee_id = c.id
          and (c.active_session_id is null or s.session_id = c.active_session_id)
        group by s.type
      ) y
    ), '{}'::jsonb),
    'resolutions', (
      select count(*) from public.resolutions r
      where r.committee_id = c.id
        and (c.active_session_id is null or r.session_id = c.active_session_id)
    )
  )
  from public.committees c
  where c.code = p_code
$$;

grant execute on function public.committee_tv_stats(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime para el cronómetro
-- ---------------------------------------------------------------------------

do $$ begin
  alter publication supabase_realtime add table public.timer_state;
exception when duplicate_object then null; end $$;
