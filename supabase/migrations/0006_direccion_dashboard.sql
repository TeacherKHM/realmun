-- RealMUN — panel de dirección (presidente o encargado general del modelo)
--
-- 1. Rol en profiles: 'encargado' (una cuenta por comité) o 'direccion'.
-- 2. RPC direccion_stats(): radiografía de TODOS los comités en un solo llamado.
--    Es security definer (el RLS de las tablas está atado al comité de la cuenta)
--    y se niega a sí misma si la cuenta que llama no es de dirección.

alter table public.profiles
  add column if not exists role text not null default 'encargado';

do $$
begin
  alter table public.profiles
    add constraint profiles_role_check check (role in ('encargado', 'direccion'));
exception when duplicate_object then null;
end $$;

create or replace function public.direccion_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'direccion'
  ) then
    raise exception 'Este panel es solo para la dirección de RealMUN'
      using errcode = '42501';
  end if;

  return jsonb_build_object(
    'now', now(),
    'committees', coalesce((
      select jsonb_agg(x.data order by x.sort_order)
      from (
        select
          c.sort_order,
          jsonb_build_object(
            'code', c.code,
            'sigla', c.sigla,
            'name', c.name,
            'topic', c.topic,
            'accent', c.accent,
            'session', (
              select jsonb_build_object(
                'id', s.id, 'title', s.title, 'date', s.session_date, 'status', s.status
              )
              from public.sessions s where s.id = c.active_session_id
            ),
            'sessions_total', (
              select count(*) from public.sessions s2 where s2.committee_id = c.id
            ),
            'delegates_total', (
              select count(*) from public.delegates d where d.committee_id = c.id and d.active
            ),
            'presence', coalesce((
              select jsonb_object_agg(y.status, y.total)
              from (
                select a.status::text as status, count(*)::int as total
                from public.attendance a
                where a.session_id = c.active_session_id
                group by a.status
              ) y
            ), '{}'::jsonb),
            'sanctions', coalesce((
              select jsonb_object_agg(z.type, z.total)
              from (
                select s.type::text as type, count(*)::int as total
                from public.sanctions s
                where s.committee_id = c.id
                  and (c.active_session_id is null or s.session_id = c.active_session_id)
                group by s.type
              ) z
            ), '{}'::jsonb),
            'resolutions', (
              select count(*) from public.resolutions r
              where r.committee_id = c.id
                and (c.active_session_id is null or r.session_id = c.active_session_id)
            ),
            -- Avance de la rúbrica: delegados evaluados y promedio del comité.
            'rubric', (
              select jsonb_build_object(
                'evaluated', count(*),
                'average', round(avg(w.row_average), 1)
              )
              from (
                select avg((elem->>'score')::numeric) as row_average
                from public.rubric_scores r
                cross join lateral jsonb_array_elements(r.scores) elem
                where r.committee_id = c.id
                  and (c.active_session_id is null or r.session_id = c.active_session_id)
                group by r.id
              ) w
            ),
            'timer', (
              select jsonb_build_object(
                'committee_id', t.committee_id, 'mode', t.mode, 'running', t.running,
                'label', t.label, 'speaker', t.speaker, 'ends_at', t.ends_at,
                'remaining_ms', t.remaining_ms, 'started_at', t.started_at,
                'elapsed_ms', t.elapsed_ms, 'updated_at', t.updated_at
              )
              from public.timer_state t where t.committee_id = c.id
            )
          ) as data
        from public.committees c
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

-- Solo cuentas autenticadas y con rol de dirección (el propio chequeo va dentro).
revoke execute on function public.direccion_stats() from public, anon;
grant execute on function public.direccion_stats() to authenticated;
