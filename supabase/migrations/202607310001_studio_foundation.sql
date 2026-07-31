-- BrownGlobal Studio foundation. Apply after the project is connected to Supabase.
create extension if not exists "pgcrypto";

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

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;

create function public.is_organization_member(target uuid) returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from organization_members where organization_id = target and user_id = auth.uid()); $$;

create policy "owners create organizations" on public.organizations for insert to authenticated with check (owner_id = auth.uid());
create policy "members view organizations" on public.organizations for select to authenticated using (public.is_organization_member(id) or owner_id = auth.uid());
create policy "members view memberships" on public.organization_members for select to authenticated using (user_id = auth.uid() or public.is_organization_member(organization_id));
create policy "members view projects" on public.projects for select to authenticated using (public.is_organization_member(organization_id));
create policy "members manage projects" on public.projects for all to authenticated using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
create policy "members view tasks" on public.tasks for select to authenticated using (exists(select 1 from projects p where p.id = project_id and public.is_organization_member(p.organization_id)));
create policy "members manage tasks" on public.tasks for all to authenticated using (exists(select 1 from projects p where p.id = project_id and public.is_organization_member(p.organization_id))) with check (exists(select 1 from projects p where p.id = project_id and public.is_organization_member(p.organization_id)));

