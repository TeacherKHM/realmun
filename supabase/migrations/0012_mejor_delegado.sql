-- 0012_mejor_delegado.sql
-- Panel global para el presidente: mejor delegado y mejor postura por comité
create or replace function public.mun_awards()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb := '[]'::jsonb;
begin
  if not exists (select 1 from public.profiles where user_id = auth.uid() and role = 'direccion') then
    raise exception 'Solo el presidente/dirección puede acceder a este recurso' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.promedio desc nulls last), '[]'::jsonb)
    into result
  from (
    select
      c.code, c.sigla, c.name, c.accent,
      d.id as delegate_id, d.name as delegate_name, d.delegation,
      count(rs.id) as evaluaciones,
      round(avg((score->>'score')::numeric), 2) as promedio
    from public.committees c
    join public.delegates d on d.committee_id = c.id and d.active = true
    left join public.rubric_scores rs on rs.delegate_id = d.id
    left join lateral jsonb_array_elements(rs.scores) score on true
    group by c.code, c.sigla, c.name, c.accent, d.id, d.name, d.delegation
  ) t;

  return result;
end;
$$;

grant execute on function public.mun_awards() to authenticated;
