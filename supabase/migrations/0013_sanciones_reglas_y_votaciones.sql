-- 0013_sanciones_reglas_y_votaciones.sql
-- Reglas de disciplina, puntos acumulados y acceso a las votaciones por alianza.

-- ---------------------------------------------------------------------------
-- Puntos de sanción
-- ---------------------------------------------------------------------------
create or replace function public.sanction_points(p_type public.sanction_type)
returns integer
language sql
immutable
as $$
  select case p_type
    when 'advertencia'      then 3
    when 'amonestacion'     then 5
    when 'disciplina'       then 5
    when 'expulsion_sesion' then 10
    when 'expulsion_dia'    then 10
    when 'expulsion_mun'    then 10
  end
$$;

alter table public.sanctions
  add column if not exists points integer not null default 0,
  add column if not exists automatic boolean not null default false;

update public.sanctions
set points = public.sanction_points(type)
where points = 0;

create index if not exists sanctions_delegate_type_idx
  on public.sanctions (committee_id, delegate_id, type);

-- ---------------------------------------------------------------------------
-- Registro atómico de una sanción + reglas de escalamiento
--   3 advertencias  -> 1 amonestación automática
--   2 amonestaciones -> expulsión del MUN + delegado inactivo
-- ---------------------------------------------------------------------------
create or replace function public.register_sanction(
  p_committee_id uuid,
  p_session_id uuid,
  p_delegate_id uuid,
  p_type public.sanction_type,
  p_reason text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_points integer := public.sanction_points(p_type);
  v_warnings integer;
  v_reprimands integer;
  v_has_expulsion boolean;
begin
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'El motivo es obligatorio';
  end if;

  if not exists (
    select 1 from public.delegates d
    where d.id = p_delegate_id and d.committee_id = p_committee_id
  ) then
    raise exception 'El delegado no pertenece al comité';
  end if;

  if p_session_id is not null and not exists (
    select 1 from public.sessions s
    where s.id = p_session_id and s.committee_id = p_committee_id
  ) then
    raise exception 'La sesión no pertenece al comité';
  end if;

  insert into public.sanctions
    (committee_id, session_id, delegate_id, type, reason, points, automatic)
  values
    (p_committee_id, p_session_id, p_delegate_id, p_type, p_reason, v_points, false);

  -- Tres advertencias se convierten en una amonestación automática.
  if p_type = 'advertencia' then
    select count(*) into v_warnings
    from public.sanctions
    where committee_id = p_committee_id
      and delegate_id = p_delegate_id
      and type = 'advertencia';

    if v_warnings > 0 and v_warnings % 3 = 0 then
      insert into public.sanctions
        (committee_id, session_id, delegate_id, type, reason, points, automatic)
      values
        (p_committee_id, p_session_id, p_delegate_id, 'amonestacion',
         'Conversión automática: 3 advertencias',
         public.sanction_points('amonestacion'), true);
    end if;
  end if;

  select count(*) into v_reprimands
  from public.sanctions
  where committee_id = p_committee_id
    and delegate_id = p_delegate_id
    and type = 'amonestacion';

  select exists (
    select 1 from public.sanctions
    where committee_id = p_committee_id
      and delegate_id = p_delegate_id
      and type = 'expulsion_mun'
  ) into v_has_expulsion;

  if v_reprimands >= 2 and not v_has_expulsion then
    insert into public.sanctions
      (committee_id, session_id, delegate_id, type, reason, points, automatic)
    values
      (p_committee_id, p_session_id, p_delegate_id, 'expulsion_mun',
       'Expulsión automática: 2 amonestaciones',
       public.sanction_points('expulsion_mun'), true);

    update public.delegates
    set active = false
    where id = p_delegate_id and committee_id = p_committee_id;
  elsif p_type = 'expulsion_mun' then
    update public.delegates
    set active = false
    where id = p_delegate_id and committee_id = p_committee_id;
  end if;

  return jsonb_build_object('ok', true, 'points', v_points);
end;
$$;

revoke execute on function public.register_sanction(uuid, uuid, uuid, public.sanction_type, text) from public, anon;
grant execute on function public.register_sanction(uuid, uuid, uuid, public.sanction_type, text) to authenticated;
grant execute on function public.sanction_points(public.sanction_type) to authenticated;

-- ---------------------------------------------------------------------------
-- Votaciones por alianza: faltaban las políticas por completo
-- ---------------------------------------------------------------------------
drop policy if exists resolution_groups_committee on public.resolution_groups;
create policy resolution_groups_committee on public.resolution_groups
  for all to authenticated
  using (committee_id = public.current_committee_id())
  with check (committee_id = public.current_committee_id());

drop policy if exists resolution_groups_direccion on public.resolution_groups;
create policy resolution_groups_direccion on public.resolution_groups
  for all to authenticated
  using (public.is_direccion())
  with check (public.is_direccion());

drop policy if exists resolution_votes_committee on public.resolution_votes;
create policy resolution_votes_committee on public.resolution_votes
  for all to authenticated
  using (committee_id = public.current_committee_id())
  with check (
    committee_id = public.current_committee_id()
    and exists (
      select 1 from public.resolution_groups g
      where g.id = resolution_group_id
        and g.committee_id = committee_id
    )
  );

drop policy if exists resolution_votes_direccion on public.resolution_votes;
create policy resolution_votes_direccion on public.resolution_votes
  for all to authenticated
  using (public.is_direccion())
  with check (
    public.is_direccion()
    and exists (
      select 1 from public.resolution_groups g
      where g.id = resolution_group_id
        and g.committee_id = committee_id
    )
  );

-- ---------------------------------------------------------------------------
-- La función de galardones también estaba expuesta a anon.
-- ---------------------------------------------------------------------------
revoke execute on function public.mun_awards() from public, anon;
grant execute on function public.mun_awards() to authenticated;
