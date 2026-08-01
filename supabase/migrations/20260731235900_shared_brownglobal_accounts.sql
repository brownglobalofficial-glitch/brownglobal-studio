-- Shared BrownGlobal account, entitlement, and Reach workflow foundation.
-- Both Studio and Reach use this Supabase project so one login works everywhere.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "users view their profile"
on public.profiles for select
to authenticated
using (id = (select auth.uid()));

create policy "users update their profile"
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

revoke all on table public.profiles from public, anon;
grant select, update on table public.profiles to authenticated;

create or replace function private.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''));
  return new;
end;
$$;

revoke execute on function private.create_profile_for_new_user() from public, anon, authenticated;

create trigger create_profile_after_signup
after insert on auth.users
for each row execute function private.create_profile_for_new_user();

create table public.business_memberships (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'business')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_memberships enable row level security;

create policy "members view business membership"
on public.business_memberships for select
to authenticated
using ((select private.is_organization_member(organization_id)));

revoke all on table public.business_memberships from public, anon;
grant select on table public.business_memberships to authenticated;

create or replace function private.add_organization_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.organization_members (organization_id, user_id, role)
  values (new.id, new.owner_id, 'owner');

  insert into public.business_memberships (organization_id, plan, status)
  values (new.id, 'free', 'active');

  return new;
end;
$$;

revoke execute on function private.add_organization_owner_membership() from public, anon, authenticated;

create table public.campaign_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_name text not null,
  contact_name text not null,
  contact_email text not null,
  objective text not null,
  preferred_launch_date date,
  duration_months integer not null default 1 check (duration_months between 1 and 12),
  starting_estimate numeric(12,2) not null default 0,
  status text not null default 'new' check (status in ('new','reviewing','proposal','approved','declined','complete')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.campaign_request_placements (
  id uuid primary key default gen_random_uuid(),
  campaign_request_id uuid not null references public.campaign_requests(id) on delete cascade,
  property_key text not null,
  property_name text not null,
  starting_price numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create index campaign_requests_organization_id_idx on public.campaign_requests (organization_id);
create index campaign_requests_created_by_idx on public.campaign_requests (created_by);
create index campaign_request_placements_request_idx on public.campaign_request_placements (campaign_request_id);

alter table public.campaign_requests enable row level security;
alter table public.campaign_request_placements enable row level security;

create policy "members create campaign requests"
on public.campaign_requests for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (select private.is_organization_member(organization_id))
);

create policy "members view campaign requests"
on public.campaign_requests for select
to authenticated
using ((select private.is_organization_member(organization_id)));

create policy "members add campaign placements"
on public.campaign_request_placements for insert
to authenticated
with check (
  exists (
    select 1
    from public.campaign_requests r
    where r.id = campaign_request_id
      and (select private.is_organization_member(r.organization_id))
  )
);

create policy "members view campaign placements"
on public.campaign_request_placements for select
to authenticated
using (
  exists (
    select 1
    from public.campaign_requests r
    where r.id = campaign_request_id
      and (select private.is_organization_member(r.organization_id))
  )
);

revoke all on table public.campaign_requests from public, anon;
revoke all on table public.campaign_request_placements from public, anon;
grant select, insert on table public.campaign_requests to authenticated;
grant select, insert on table public.campaign_request_placements to authenticated;

comment on table public.business_memberships is
  'Organization-level BrownGlobal plan entitlement. Only trusted server-side billing workflows may change this record.';

comment on table public.campaign_requests is
  'Planning requests only. A campaign begins only after review, pricing, availability, and written approval.';
