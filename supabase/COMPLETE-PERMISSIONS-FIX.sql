-- ============================================
-- COMPLETE PERMISSIONS FIX FOR PROJECT WORKFLOW
-- ============================================
-- Run this to fix all permission issues
-- This ensures authenticated staff can manage the entire workflow
-- ============================================

-- ============================================
-- 1. PROJECTS TABLE
-- ============================================

-- Grant full permissions to authenticated users for projects
GRANT SELECT, INSERT, UPDATE ON public.projects TO authenticated;

-- Ensure policies allow staff to manage projects
DROP POLICY IF EXISTS "Staff can view all projects" ON public.projects;
CREATE POLICY "Staff can view all projects" ON public.projects
  FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.staff_roles r WHERE r.user_id = auth.uid()));

DROP POLICY IF EXISTS "Staff can insert projects" ON public.projects;
CREATE POLICY "Staff can insert projects" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS(SELECT 1 FROM public.staff_roles r WHERE r.user_id = auth.uid()));

DROP POLICY IF EXISTS "Staff can update projects" ON public.projects;
CREATE POLICY "Staff can update projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (EXISTS(SELECT 1 FROM public.staff_roles r WHERE r.user_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.staff_roles r WHERE r.user_id = auth.uid()));

-- ============================================
-- 2. PROJECT FILES TABLE
-- ============================================

-- Grant permissions for file management
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_files TO authenticated;

-- Update policies
DROP POLICY IF EXISTS "Staff can manage files" ON public.project_files;
CREATE POLICY "Staff can manage files" ON public.project_files
  FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.staff_roles r WHERE r.user_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.staff_roles r WHERE r.user_id = auth.uid()));

-- ============================================
-- 3. PROJECT MILESTONES TABLE
-- ============================================

-- Grant permissions for milestone management
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_milestones TO authenticated;

-- Update policies
DROP POLICY IF EXISTS "Staff can manage milestones" ON public.project_milestones;
CREATE POLICY "Staff can manage milestones" ON public.project_milestones
  FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.staff_roles r WHERE r.user_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.staff_roles r WHERE r.user_id = auth.uid()));

-- ============================================
-- 4. PAYMENTS TABLE
-- ============================================

-- Grant permissions for payment management
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;

-- Update policies
DROP POLICY IF EXISTS "Staff can manage payments" ON public.payments;
CREATE POLICY "Staff can manage payments" ON public.payments
  FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.staff_roles r WHERE r.user_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.staff_roles r WHERE r.user_id = auth.uid()));

-- ============================================
-- 5. PROJECT COMMUNICATIONS TABLE
-- ============================================

-- Grant permissions for communications
GRANT SELECT, INSERT, UPDATE ON public.project_communications TO authenticated;

-- Update policies
DROP POLICY IF EXISTS "Staff can manage communications" ON public.project_communications;
CREATE POLICY "Staff can manage communications" ON public.project_communications
  FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.staff_roles r WHERE r.user_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.staff_roles r WHERE r.user_id = auth.uid()));

-- ============================================
-- 6. PROJECT SUBMISSIONS (for converting)
-- ============================================

-- Ensure authenticated can update submissions (when converting to projects)
GRANT UPDATE ON public.project_submissions TO authenticated;

-- Policy already exists but ensuring it's correct
DROP POLICY IF EXISTS "Staff can update submissions" ON public.project_submissions;
CREATE POLICY "Staff can update submissions" ON public.project_submissions
  FOR UPDATE TO authenticated
  USING (EXISTS(SELECT 1 FROM public.staff_roles r WHERE r.user_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.staff_roles r WHERE r.user_id = auth.uid()));

-- ============================================
-- 7. SUBMISSION FILES (for copying to project files)
-- ============================================

-- Ensure authenticated can read submission files
GRANT SELECT ON public.submission_files TO authenticated;

-- Policy already exists
DROP POLICY IF EXISTS "Staff can view submission files" ON public.submission_files;
CREATE POLICY "Staff can view submission files" ON public.submission_files
  FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.staff_roles r WHERE r.user_id = auth.uid()));

-- ============================================
-- 8. VERIFY PERMISSIONS
-- ============================================

-- Check all grants for authenticated role
SELECT 
  table_name,
  string_agg(privilege_type, ', ' ORDER BY privilege_type) as privileges
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
  AND grantee = 'authenticated'
  AND table_name IN (
    'projects', 'project_files', 'project_milestones', 
    'payments', 'project_communications', 'project_submissions', 'submission_files'
  )
GROUP BY table_name
ORDER BY table_name;

-- Expected output:
-- projects                  | INSERT, SELECT, UPDATE
-- project_files             | DELETE, INSERT, SELECT, UPDATE
-- project_milestones        | DELETE, INSERT, SELECT, UPDATE
-- payments                  | INSERT, SELECT, UPDATE
-- project_communications    | INSERT, SELECT, UPDATE
-- project_submissions       | INSERT, SELECT, UPDATE
-- submission_files          | INSERT, SELECT

-- ============================================
-- 9. CHECK YOUR STAFF ROLE
-- ============================================

-- Verify your user has a staff role assigned
SELECT 
  sr.user_id,
  sr.role,
  au.email,
  sr.created_at
FROM public.staff_roles sr
JOIN auth.users au ON au.id = sr.user_id
ORDER BY sr.created_at DESC;

-- If your user is NOT listed, run:
-- INSERT INTO public.staff_roles (user_id, role) 
-- VALUES ('YOUR-USER-ID-HERE', 'admin');

-- To get your user ID:
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Permissions fixed successfully!';
  RAISE NOTICE 'Staff users can now:';
  RAISE NOTICE '  - Create projects from submissions';
  RAISE NOTICE '  - Upload and manage files';
  RAISE NOTICE '  - Track payments';
  RAISE NOTICE '  - Manage milestones';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Make sure your user has a staff_roles entry!';
END $$;
