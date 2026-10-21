-- 0010_resolutions_votaciones.sql
-- Las hojas de resolución pasan a ser por alianza y se votan en rondas (1a y 2a: a favor/en contra/abstención; 3a: a favor/en contra).
-- La 3ª votación se marca como definitiva.
create table if not exists public.resolution_groups (
  id           uuid primary key default gen_random_uuid(),
  committee_id uuid not null references public.committees(id) on delete cascade,
  session_id   uuid references public.sessions(id) on delete set null,
  name         text not null,
  sponsors     jsonb not null default '[]'::jsonb,
  notes        text,
  status       text not null default 'presentado' check (status in ('presentado','aprobado','rechazado')),
  created_at   timestamptz not null default now()
);

create table if not exists public.resolution_votes (
  id                uuid primary key default gen_random_uuid(),
  committee_id      uuid not null references public.committees(id) on delete cascade,
  session_id        uuid references public.sessions(id) on delete set null,
  resolution_group_id uuid not null references public.resolution_groups(id) on delete cascade,
  round             integer not null check (round in (1,2,3)),
  delegate_id       uuid not null references public.delegates(id) on delete cascade,
  vote              text not null check (vote in ('a_favor','en_contra','abstencion')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (resolution_group_id, round, delegate_id)
);

create index if not exists resolution_groups_committee_idx on public.resolution_groups (committee_id);
create index if not exists resolution_votes_group_round_idx on public.resolution_votes (resolution_group_id, round);

alter table public.resolution_groups enable row level security;
alter table public.resolution_votes enable row level security;
