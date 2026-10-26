-- Datalab Research Consulting - Enhanced Order Management System
-- Apply in a Supabase SQL editor or migration after reviewing the deployment setup.
-- Includes: Client intake, Project management, File uploads, Payment tracking, Admin controls

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
  admin_notes text,
  quoted_amount numeric(12,2),
  quoted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
  enquiry_id uuid references public.enquiries(id) on delete set null,
  client_name text not null,
  client_email text not null,
  client_phone text,
  title text not null,
  service text not null,
  description text,
  status text not null default 'awaiting_deposit' check (status in (
    'awaiting_deposit', 'deposit_confirmed', 'in_progress', 'awaiting_draft_review',
    'revision_requested', 'draft_approved', 'awaiting_balance_payment',
    'payment_verification_pending', 'final_deliverables_available', 'completed', 'on_hold', 'cancelled'
  )),
  agreed_deadline date,
  total_fee numeric(12,2) check (total_fee is null or total_fee >= 0),
  deposit_amount numeric(12,2) check (deposit_amount is null or deposit_amount >= 0),
  balance_amount numeric(12,2) check (balance_amount is null or balance_amount >= 0),
  deposit_paid boolean default false,
  balance_paid boolean default false,
  progress_percentage integer default 0 check (progress_percentage between 0 and 100),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.projects enable row level security;
revoke all on public.projects from anon, authenticated;

-- Grant permissions to authenticated users (staff) for project management
grant select, insert, update on public.projects to authenticated;

create table if not exists public.project_access_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  requested_email text not null,
  created_at timestamptz not null default now()
);
alter table public.project_access_requests enable row level security;
revoke all on public.project_access_requests from anon, authenticated;

-- Project milestones for tracking progress
create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  completed boolean default false,
  completed_at timestamptz,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.project_milestones enable row level security;
revoke all on public.project_milestones from anon, authenticated;

-- Payment records
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  payment_type text not null check (payment_type in ('deposit', 'balance', 'full', 'partial')),
  amount numeric(12,2) not null check (amount > 0),
  payment_method text check (payment_method in ('M-Pesa', 'Bank Transfer', 'Cash', 'Cheque', 'Card', 'Other')),
  transaction_reference text,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'verified', 'failed', 'refunded')),
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now()
);
alter table public.payments enable row level security;
revoke all on public.payments from anon, authenticated;

-- Project communications/updates
create table if not exists public.project_communications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  message text not null,
  sender_type text not null check (sender_type in ('admin', 'client')),
  sender_name text,
  visible_to_client boolean default true,
  created_at timestamptz not null default now()
);
alter table public.project_communications enable row level security;
revoke all on public.project_communications from anon, authenticated;

-- Project files (linked to Supabase Storage)
create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  file_name text not null,
  file_size bigint,
  file_type text,
  storage_path text not null,
  uploaded_by_type text not null check (uploaded_by_type in ('admin', 'client')),
  file_category text check (file_category in ('requirement', 'deliverable', 'reference', 'revision', 'draft_watermarked', 'final', 'other')),
  description text,
  visible_to_client boolean default true,
  is_watermarked boolean default false,
  is_downloadable boolean default true,
  requires_balance_payment boolean default false,
  created_at timestamptz not null default now()
);
alter table public.project_files enable row level security;
revoke all on public.project_files from anon, authenticated;

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

-- Admin policies for managing enquiries
drop policy if exists "Staff can view all enquiries" on public.enquiries;
create policy "Staff can view all enquiries" on public.enquiries
  for select to authenticated
  using (exists(select 1 from public.staff_roles r where r.user_id = auth.uid()));

drop policy if exists "Staff can update enquiries" on public.enquiries;
create policy "Staff can update enquiries" on public.enquiries
  for update to authenticated
  using (exists(select 1 from public.staff_roles r where r.user_id = auth.uid()))
  with check (exists(select 1 from public.staff_roles r where r.user_id = auth.uid()));

-- Admin policies for managing projects
drop policy if exists "Staff can view all projects" on public.projects;
create policy "Staff can view all projects" on public.projects
  for select to authenticated
  using (exists(select 1 from public.staff_roles r where r.user_id = auth.uid()));

drop policy if exists "Staff can insert projects" on public.projects;
create policy "Staff can insert projects" on public.projects
  for insert to authenticated
  with check (exists(select 1 from public.staff_roles r where r.user_id = auth.uid()));

drop policy if exists "Staff can update projects" on public.projects;
create policy "Staff can update projects" on public.projects
  for update to authenticated
  using (exists(select 1 from public.staff_roles r where r.user_id = auth.uid()))
  with check (exists(select 1 from public.staff_roles r where r.user_id = auth.uid()));

-- Admin policies for milestones
drop policy if exists "Staff can manage milestones" on public.project_milestones;
create policy "Staff can manage milestones" on public.project_milestones
  for all to authenticated
  using (exists(select 1 from public.staff_roles r where r.user_id = auth.uid()))
  with check (exists(select 1 from public.staff_roles r where r.user_id = auth.uid()));

-- Admin policies for payments
drop policy if exists "Staff can manage payments" on public.payments;
create policy "Staff can manage payments" on public.payments
  for all to authenticated
  using (exists(select 1 from public.staff_roles r where r.user_id = auth.uid()))
  with check (exists(select 1 from public.staff_roles r where r.user_id = auth.uid()));

-- Admin policies for communications
drop policy if exists "Staff can manage communications" on public.project_communications;
create policy "Staff can manage communications" on public.project_communications
  for all to authenticated
  using (exists(select 1 from public.staff_roles r where r.user_id = auth.uid()))
  with check (exists(select 1 from public.staff_roles r where r.user_id = auth.uid()));

-- Admin policies for files
drop policy if exists "Staff can manage files" on public.project_files;
create policy "Staff can manage files" on public.project_files
  for all to authenticated
  using (exists(select 1 from public.staff_roles r where r.user_id = auth.uid()))
  with check (exists(select 1 from public.staff_roles r where r.user_id = auth.uid()));

-- General Contact Messages (not project enquiries)
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  contact_reason text check (contact_reason in ('General Inquiry', 'Partnership', 'Feedback', 'Support', 'Other')),
  status text not null default 'new' check (status in ('new', 'read', 'replied', 'archived')),
  admin_notes text,
  created_at timestamptz not null default now()
);

alter table public.contacts enable row level security;

-- Revoke all first
revoke all on public.contacts from anon, authenticated, public;

-- Grant insert on specific columns
grant insert (full_name, email, phone, subject, message, contact_reason) 
  on public.contacts to anon, authenticated;

-- Grant select to authenticated (for admin)
grant select on public.contacts to authenticated;

drop policy if exists "Public can submit contacts" on public.contacts;
create policy "Public can submit contacts" on public.contacts
  for insert to anon, authenticated
  with check (
    length(trim(full_name)) between 2 and 160
    and length(trim(email)) between 5 and 320
    and length(trim(message)) between 10 and 5000
  );

drop policy if exists "Staff can view all contacts" on public.contacts;
create policy "Staff can view all contacts" on public.contacts
  for select to authenticated
  using (exists(select 1 from public.staff_roles r where r.user_id = auth.uid()));

drop policy if exists "Staff can update contacts" on public.contacts;
create policy "Staff can update contacts" on public.contacts
  for update to authenticated
  using (exists(select 1 from public.staff_roles r where r.user_id = auth.uid()))
  with check (exists(select 1 from public.staff_roles r where r.user_id = auth.uid()));

-- Project Submissions with File Uploads
create table if not exists public.project_submissions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('SUB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
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
  admin_notes text,
  quoted_amount numeric(12,2),
  quoted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_submissions enable row level security;

-- Important: Revoke all first, then grant specific columns
revoke all on public.project_submissions from anon, authenticated, public;

-- Grant insert on specific columns to anonymous and authenticated users
grant insert (full_name, email, phone, client_category, organisation, service, project_title, details, deliverables, deadline, budget, preferred_contact)
  on public.project_submissions to anon, authenticated;

-- Create insert policy for public submissions
drop policy if exists "Public can submit projects" on public.project_submissions;
create policy "Public can submit projects" on public.project_submissions
  for insert to anon, authenticated
  with check (
    length(trim(full_name)) between 2 and 160
    and length(trim(email)) between 5 and 320
    and length(trim(project_title)) between 2 and 240
    and length(trim(details)) between 10 and 12000
  );

-- Grant select to authenticated users (staff) for admin view
grant select on public.project_submissions to authenticated;

drop policy if exists "Staff can view all submissions" on public.project_submissions;
create policy "Staff can view all submissions" on public.project_submissions
  for select to authenticated
  using (exists(select 1 from public.staff_roles r where r.user_id = auth.uid()));

drop policy if exists "Staff can update submissions" on public.project_submissions;
create policy "Staff can update submissions" on public.project_submissions
  for update to authenticated
  using (exists(select 1 from public.staff_roles r where r.user_id = auth.uid()))
  with check (exists(select 1 from public.staff_roles r where r.user_id = auth.uid()));

-- Submission Files (uploaded by clients during submission)
create table if not exists public.submission_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.project_submissions(id) on delete cascade,
  file_name text not null,
  file_size bigint,
  file_type text,
  storage_path text not null,
  description text,
  created_at timestamptz not null default now()
);

alter table public.submission_files enable row level security;

-- Revoke all first
revoke all on public.submission_files from anon, authenticated, public;

-- Grant insert to authenticated users (after they create submission)
grant insert (submission_id, file_name, file_size, file_type, storage_path, description)
  on public.submission_files to anon, authenticated;

-- Grant select to authenticated (for admin)
grant select on public.submission_files to authenticated;

drop policy if exists "Public can upload submission files" on public.submission_files;
create policy "Public can upload submission files" on public.submission_files
  for insert to anon, authenticated
  with check (true);

drop policy if exists "Staff can view submission files" on public.submission_files;
create policy "Staff can view submission files" on public.submission_files
  for select to authenticated
  using (exists(select 1 from public.staff_roles r where r.user_id = auth.uid()));

drop policy if exists "Staff can delete submission files" on public.submission_files;
create policy "Staff can delete submission files" on public.submission_files
  for delete to authenticated
  using (exists(select 1 from public.staff_roles r where r.user_id = auth.uid()));

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
drop policy if exists "Staff can read own role" on public.staff_roles;
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
drop policy if exists "Public can read published website content" on public.site_content;
create policy "Public can read published website content" on public.site_content
  for select to anon, authenticated using (true);
drop policy if exists "Editors can update website content" on public.site_content;
create policy "Editors can update website content" on public.site_content
  for all to authenticated
  using (exists(select 1 from public.staff_roles r where r.user_id = (select auth.uid()) and r.role in ('admin','editor')))
  with check (exists(select 1 from public.staff_roles r where r.user_id = (select auth.uid()) and r.role in ('admin','editor')));

insert into public.site_content(content_key,content_value) values
('home', '{"heroTitle":"Turn your data into actionable insight.","heroDescription":"Research and data consulting for scholars, organisations and teams who need evidence they can trust — and findings they can put to work."}'::jsonb)
on conflict(content_key) do nothing;
