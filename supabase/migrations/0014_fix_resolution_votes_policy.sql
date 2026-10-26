-- 0014_fix_resolution_votes_policy.sql
-- La política de 0013 comparaba g.committee_id con la columna homónima del
-- propio subselect (tautología). Se califica la fila exterior para que la
-- alianza tenga que ser del mismo comité.

drop policy if exists resolution_votes_committee on public.resolution_votes;
create policy resolution_votes_committee on public.resolution_votes
  for all to authenticated
  using (committee_id = public.current_committee_id())
  with check (
    committee_id = public.current_committee_id()
    and exists (
      select 1 from public.resolution_groups g
      where g.id = resolution_votes.resolution_group_id
        and g.committee_id = resolution_votes.committee_id
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
      where g.id = resolution_votes.resolution_group_id
        and g.committee_id = resolution_votes.committee_id
    )
  );
