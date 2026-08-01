-- Keep read and write policies separate so Postgres evaluates only the
-- permission checks required for each operation.
drop policy "owners manage memberships" on public.organization_members;
drop policy "members manage projects" on public.projects;
drop policy "members manage tasks" on public.tasks;

create policy "owners add memberships"
on public.organization_members for insert
to authenticated
with check (
  exists (
    select 1 from public.organizations o
    where o.id = organization_id
      and o.owner_id = (select auth.uid())
  )
);

create policy "owners update memberships"
on public.organization_members for update
to authenticated
using (
  exists (
    select 1 from public.organizations o
    where o.id = organization_id
      and o.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.organizations o
    where o.id = organization_id
      and o.owner_id = (select auth.uid())
  )
);

create policy "owners remove memberships"
on public.organization_members for delete
to authenticated
using (
  exists (
    select 1 from public.organizations o
    where o.id = organization_id
      and o.owner_id = (select auth.uid())
  )
);

create policy "members add projects"
on public.projects for insert
to authenticated
with check ((select private.is_organization_member(organization_id)));

create policy "members update projects"
on public.projects for update
to authenticated
using ((select private.is_organization_member(organization_id)))
with check ((select private.is_organization_member(organization_id)));

create policy "members remove projects"
on public.projects for delete
to authenticated
using ((select private.is_organization_member(organization_id)));

create policy "members add tasks"
on public.tasks for insert
to authenticated
with check (
  exists (
    select 1 from public.projects p
    where p.id = project_id
      and (select private.is_organization_member(p.organization_id))
  )
);

create policy "members update tasks"
on public.tasks for update
to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = project_id
      and (select private.is_organization_member(p.organization_id))
  )
)
with check (
  exists (
    select 1 from public.projects p
    where p.id = project_id
      and (select private.is_organization_member(p.organization_id))
  )
);

create policy "members remove tasks"
on public.tasks for delete
to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = project_id
      and (select private.is_organization_member(p.organization_id))
  )
);

