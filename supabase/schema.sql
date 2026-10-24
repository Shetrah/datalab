-- Datalab Research Consulting client intake and access-link request baseline.
-- Apply in a Supabase SQL editor or migration after reviewing the deployment setup.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('DRC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  full_name text not null,
  email text not null,
  phone text,
  client_category text not null check (client_category in ('Academic', 'Organisation', 'Other')),
  organisation text,
  service text not null,
  project_title text not null,
  details text not null,
  deliverables text,
  deadline date,
  budget text not null,
  preferred_contact text not null check (preferred_contact in ('Email', 'WhatsApp', 'Phone call')),
  status text not null default 'new' check (status in ('new', 'reviewing', 'quoted', 'accepted', 'declined', 'converted')),
  created_at timestamptz not null default now()
);

alter table public.enquiries enable row level security;
revoke all on public.enquiries from anon, authenticated;
grant insert (full_name, email, phone, client_category, organisation, service, project_title, details, deliverables, deadline, budget, preferred_contact)
  on public.enquiries to anon, authenticated;

drop policy if exists "Public can submit enquiries" on public.enquiries;
create policy "Public can submit enquiries" on public.enquiries
  for insert to anon, authenticated
  with check (
    length(trim(full_name)) between 2 and 160
    and length(trim(email)) between 5 and 320
    and length(trim(project_title)) between 2 and 240
    and length(trim(details)) between 10 and 12000
  );

-- Projects and tokens are deliberately not exposed to browser table access.
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  client_email text not null,
  title text not null,
  service text not null,
  status text not null default 'awaiting_deposit' check (status in (
    'awaiting_deposit', 'deposit_confirmed', 'in_progress', 'awaiting_draft_review',
    'revision_requested', 'draft_approved', 'awaiting_balance_payment',
    'payment_verification_pending', 'final_deliverables_available', 'completed', 'on_hold', 'cancelled'
  )),
  agreed_deadline date,
  total_fee numeric(12,2) check (total_fee is null or total_fee >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.projects enable row level security;
revoke all on public.projects from anon, authenticated;

create table if not exists public.project_access_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  requested_email text not null,
  created_at timestamptz not null default now()
);
alter table public.project_access_requests enable row level security;
revoke all on public.project_access_requests from anon, authenticated;

-- The browser may submit a generic access request. A trusted Edge Function or
-- database trigger must deliver a one-time link without revealing match status.
create or replace function public.request_project_access_link(project_reference text, client_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if length(trim(project_reference)) < 4 or length(trim(client_email)) < 5 then
    raise exception 'Invalid access request';
  end if;
  insert into public.project_access_requests (project_id, requested_email)
  select p.id, lower(trim(client_email))
  from public.projects p
  where lower(p.reference) = lower(trim(project_reference))
    and lower(p.client_email) = lower(trim(client_email));
  -- Always return normally, whether or not a matching project exists.
end;
$$;
revoke all on function public.request_project_access_link(text, text) from public;
grant execute on function public.request_project_access_link(text, text) to anon, authenticated;

-- Do not enable client-side file access here. Store project files in a private
-- Storage bucket with signed URLs issued only by an authorised server function.

-- Website content editor. Staff roles must be assigned by a trusted operator.
create table if not exists public.staff_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'editor')),
  created_at timestamptz not null default now()
);
alter table public.staff_roles enable row level security;
revoke all on public.staff_roles from anon, authenticated;
grant select on public.staff_roles to authenticated;
create policy "Staff can read own role" on public.staff_roles
  for select to authenticated using (user_id = (select auth.uid()));

create table if not exists public.site_content (
  content_key text primary key,
  content_value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.site_content enable row level security;
revoke all on public.site_content from anon, authenticated;
grant select on public.site_content to anon, authenticated;
grant insert, update on public.site_content to authenticated;
create policy "Public can read published website content" on public.site_content
  for select to anon, authenticated using (true);
create policy "Editors can update website content" on public.site_content
  for all to authenticated
  using (exists(select 1 from public.staff_roles r where r.user_id = (select auth.uid()) and r.role in ('admin','editor')))
  with check (exists(select 1 from public.staff_roles r where r.user_id = (select auth.uid()) and r.role in ('admin','editor')));

insert into public.site_content(content_key,content_value) values
('home', '{"heroTitle":"Turn your data into actionable insight.","heroDescription":"Research and data consulting for scholars, organisations and teams who need evidence they can trust — and findings they can put to work."}'::jsonb)
on conflict(content_key) do nothing;
