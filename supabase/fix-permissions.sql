-- Quick Fix for Permissions Issues
-- Run this in Supabase SQL Editor if you're getting "permission denied" errors

-- Fix project_submissions permissions
revoke all on public.project_submissions from anon, authenticated, public;

grant insert (full_name, email, phone, client_category, organisation, service, project_title, details, deliverables, deadline, budget, preferred_contact)
  on public.project_submissions to anon, authenticated;

grant select on public.project_submissions to authenticated;

drop policy if exists "Public can submit projects" on public.project_submissions;
create policy "Public can submit projects" on public.project_submissions
  for insert to anon, authenticated
  with check (
    length(trim(full_name)) between 2 and 160
    and length(trim(email)) between 5 and 320
    and length(trim(project_title)) between 2 and 240
    and length(trim(details)) between 10 and 12000
  );

-- Fix submission_files permissions
revoke all on public.submission_files from anon, authenticated, public;

grant insert (submission_id, file_name, file_size, file_type, storage_path, description)
  on public.submission_files to anon, authenticated;

grant select on public.submission_files to authenticated;

drop policy if exists "Public can upload submission files" on public.submission_files;
create policy "Public can upload submission files" on public.submission_files
  for insert to anon, authenticated
  with check (true);

drop policy if exists "Staff can view submission files" on public.submission_files;
create policy "Staff can view submission files" on public.submission_files
  for select to authenticated
  using (exists(select 1 from public.staff_roles r where r.user_id = auth.uid()));

-- Fix contacts permissions
revoke all on public.contacts from anon, authenticated, public;

grant insert (full_name, email, phone, subject, message, contact_reason) 
  on public.contacts to anon, authenticated;

grant select on public.contacts to authenticated;

drop policy if exists "Public can submit contacts" on public.contacts;
create policy "Public can submit contacts" on public.contacts
  for insert to anon, authenticated
  with check (
    length(trim(full_name)) between 2 and 160
    and length(trim(email)) between 5 and 320
    and length(trim(message)) between 10 and 5000
  );

-- Verify permissions (optional - just to check)
SELECT 
  schemaname, 
  tablename, 
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('project_submissions', 'submission_files', 'contacts')
ORDER BY tablename, policyname;
