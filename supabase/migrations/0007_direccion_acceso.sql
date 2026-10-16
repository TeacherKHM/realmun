-- RealMUN — la dirección entra a todos los comités
--
-- El panel de dirección ya veía la radiografía (direccion_stats). Ahora la
-- cuenta de dirección también puede ENTRAR a la consola de cualquier comité
-- (asistencia, cronómetro, sanciones, hojas, rúbrica, delegados y sesiones) y
-- editar el catálogo: nombres de comité, sigla, tema, acento y el nombre del
-- encargado de cada comité.
--
-- El RLS de cada tabla pasa de "solo mi comité" a "mi comité, o si soy
-- dirección". Las políticas son permisivas: se suman (OR) a las existentes,
-- así que un encargado sigue encerrado en su comité.

-- ¿La cuenta que llama es de la dirección?
create or replace function public.is_direccion()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'direccion'
  )
$$;

-- Solo las cuentas con sesión la necesitan (las políticas son `to authenticated`).
revoke all on function public.is_direccion() from public, anon;
grant execute on function public.is_direccion() to authenticated;

-- committees: además del catálogo público de lectura, la dirección puede editar.
drop policy if exists committees_direccion on public.committees;
create policy committees_direccion on public.committees
  for all to authenticated
  using (public.is_direccion())
  with check (public.is_direccion());

-- profiles: la dirección ve y renombra a los encargados de cada comité.
drop policy if exists profiles_direccion on public.profiles;
create policy profiles_direccion on public.profiles
  for all to authenticated
  using (public.is_direccion())
  with check (public.is_direccion());

-- Tablas por comité: la dirección puede leer y escribir en cualquiera.
do $$
declare t text;
begin
  foreach t in array array[
    'sessions', 'delegates', 'attendance', 'sanctions', 'resolutions', 'rubric_scores', 'timer_state'
  ] loop
    execute format('drop policy if exists %I_direccion on public.%I', t, t);
    execute format($f$
      create policy %I_direccion on public.%I
        for all to authenticated
        using (public.is_direccion())
        with check (public.is_direccion())
    $f$, t, t);
  end loop;
end $$;
