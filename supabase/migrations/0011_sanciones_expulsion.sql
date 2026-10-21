-- 0011_sanciones_expulsion.sql
do $$ begin
  create type public.sanction_type as enum ('amonestacion','advertencia','disciplina','expulsion_sesion','expulsion_dia','expulsion_mun');
exception
  when duplicate_object then null;
end $$;

-- Si la tabla ya usa el enum existente, lo ampliamos
alter type public.sanction_type add value if not exists 'expulsion_sesion';
alter type public.sanction_type add value if not exists 'expulsion_dia';
alter type public.sanction_type add value if not exists 'expulsion_mun';
