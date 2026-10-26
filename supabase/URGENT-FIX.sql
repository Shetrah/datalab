-- ============================================
-- URGENT FIX - Run this NOW to fix submission error
-- ============================================
-- Error: "new row violates row-level security policy"
-- This script fixes the RLS policies immediately
-- ============================================

-- 1. DISABLE RLS temporarily to clean up
ALTER TABLE public.project_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts DISABLE ROW LEVEL SECURITY;

-- 2. DROP ALL existing policies
DROP POLICY IF EXISTS "Public can submit projects" ON public.project_submissions;
DROP POLICY IF EXISTS "Staff can view all submissions" ON public.project_submissions;
DROP POLICY IF EXISTS "Staff can update submissions" ON public.project_submissions;
DROP POLICY IF EXISTS "Public can upload submission files" ON public.submission_files;
DROP POLICY IF EXISTS "Staff can view submission files" ON public.submission_files;
DROP POLICY IF EXISTS "Staff can delete submission files" ON public.submission_files;
DROP POLICY IF EXISTS "Public can submit contacts" ON public.contacts;
DROP POLICY IF EXISTS "Staff can view all contacts" ON public.contacts;
DROP POLICY IF EXISTS "Staff can update contacts" ON public.contacts;

-- 3. REVOKE all permissions
REVOKE ALL ON public.project_submissions FROM anon, authenticated, public;
REVOKE ALL ON public.submission_files FROM anon, authenticated, public;
REVOKE ALL ON public.contacts FROM anon, authenticated, public;

-- 4. RE-ENABLE RLS
ALTER TABLE public.project_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. CREATE POLICIES FIRST (before grants)
-- ============================================

-- PROJECT SUBMISSIONS - Allow all inserts for anon/authenticated
CREATE POLICY "Enable insert for anon users" ON public.project_submissions
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- PROJECT SUBMISSIONS - Allow staff to view all
CREATE POLICY "Enable read for authenticated users" ON public.project_submissions
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_roles 
      WHERE user_id = auth.uid()
    )
  );

-- PROJECT SUBMISSIONS - Allow staff to update
CREATE POLICY "Enable update for staff" ON public.project_submissions
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_roles 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_roles 
      WHERE user_id = auth.uid()
    )
  );

-- SUBMISSION FILES - Allow all inserts
CREATE POLICY "Enable insert for file uploads" ON public.submission_files
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- SUBMISSION FILES - Allow staff to view
CREATE POLICY "Enable read for staff files" ON public.submission_files
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_roles 
      WHERE user_id = auth.uid()
    )
  );

-- SUBMISSION FILES - Allow staff to delete
CREATE POLICY "Enable delete for staff files" ON public.submission_files
  FOR DELETE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_roles 
      WHERE user_id = auth.uid()
    )
  );

-- CONTACTS - Allow all inserts
CREATE POLICY "Enable insert for contacts" ON public.contacts
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- CONTACTS - Allow staff to view
CREATE POLICY "Enable read for staff contacts" ON public.contacts
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_roles 
      WHERE user_id = auth.uid()
    )
  );

-- CONTACTS - Allow staff to update
CREATE POLICY "Enable update for staff contacts" ON public.contacts
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_roles 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_roles 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 6. GRANT PERMISSIONS (after policies)
-- ============================================

-- Grant specific column permissions for inserts
GRANT INSERT (
  full_name, email, phone, client_category, organisation, 
  service, project_title, details, deliverables, deadline, 
  budget, preferred_contact
) ON public.project_submissions TO anon, authenticated;

-- Grant select for authenticated users
GRANT SELECT ON public.project_submissions TO authenticated;

-- Grant update for authenticated users
GRANT UPDATE ON public.project_submissions TO authenticated;

-- Grant for submission files
GRANT INSERT (
  submission_id, file_name, file_size, file_type, 
  storage_path, description
) ON public.submission_files TO anon, authenticated;

GRANT SELECT ON public.submission_files TO authenticated;
GRANT DELETE ON public.submission_files TO authenticated;

-- Grant for contacts
GRANT INSERT (
  full_name, email, phone, subject, message, contact_reason
) ON public.contacts TO anon, authenticated;

GRANT SELECT ON public.contacts TO authenticated;
GRANT UPDATE ON public.contacts TO authenticated;

-- ============================================
-- 7. VERIFY - Check policies were created
-- ============================================

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

-- You should see 9 policies (3 for each table)
-- If you see them, the fix worked! ✅
