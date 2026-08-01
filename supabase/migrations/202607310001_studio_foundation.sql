-- BrownGlobal Studio foundation.
-- Apply only to the dedicated BrownGlobal Studio Supabase project.
create extension if not exists "pgcrypto";

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  handle text unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','manager','member','viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create or replace function private.add_organization_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.organization_members (organization_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

revoke execute on function private.add_organization_owner_membership() from public, anon, authenticated;

create trigger add_organization_owner_membership
after insert on public.organizations
for each row execute function private.add_organization_owner_membership();

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  status text not null default 'planned' check (status in ('planned','active','review','complete','archived')),
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  assignee_id uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create index organizations_owner_id_idx on public.organizations (owner_id);
create index organization_members_user_id_idx on public.organization_members (user_id);
create index projects_organization_id_idx on public.projects (organization_id);
create index tasks_project_id_idx on public.tasks (project_id);
create index tasks_assignee_id_idx on public.tasks (assignee_id);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;

create or replace function private.is_organization_member(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target
      and user_id = (select auth.uid())
  );
$$;

revoke execute on function private.is_organization_member(uuid) from public, anon;
grant execute on function private.is_organization_member(uuid) to authenticated;

create policy "owners create organizations"
on public.organizations for insert
to authenticated
with check (owner_id = (select auth.uid()));

create policy "members view organizations"
on public.organizations for select
to authenticated
using ((select private.is_organization_member(id)) or owner_id = (select auth.uid()));

create policy "members view memberships"
on public.organization_members for select
to authenticated
using (user_id = (select auth.uid()) or (select private.is_organization_member(organization_id)));

create policy "owners manage memberships"
on public.organization_members for all
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

create policy "members view projects"
on public.projects for select
to authenticated
using ((select private.is_organization_member(organization_id)));

create policy "members manage projects"
on public.projects for all
to authenticated
using ((select private.is_organization_member(organization_id)))
with check ((select private.is_organization_member(organization_id)));

create policy "members view tasks"
on public.tasks for select
to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = project_id
      and (select private.is_organization_member(p.organization_id))
  )
);

create policy "members manage tasks"
on public.tasks for all
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

revoke all on table public.organizations from public, anon;
revoke all on table public.organization_members from public, anon;
revoke all on table public.projects from public, anon;
revoke all on table public.tasks from public, anon;

grant select, insert on table public.organizations to authenticated;
grant select, insert, update, delete on table public.organization_members to authenticated;
grant select, insert, update, delete on table public.projects to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;

