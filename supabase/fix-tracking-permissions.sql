-- ============================================
-- FIX: Project Tracking Permissions
-- ============================================
-- Allow anonymous users to track projects by reference number
-- This enables /track-project page to work without authentication
-- ============================================

-- Grant SELECT permission to anon users on projects table
-- (Only for tracking, limited columns)
GRANT SELECT (
  id, reference, title, service, status, progress_percentage, 
  total_fee, deposit_amount, balance_amount, deposit_paid, 
  balance_paid, agreed_deadline, created_at
) ON public.projects TO anon;

-- Create policy for anonymous users to view projects by reference
DROP POLICY IF EXISTS "Anyone can view projects by reference" ON public.projects;
CREATE POLICY "Anyone can view projects by reference" ON public.projects
  FOR SELECT TO anon, authenticated
  USING (true);

-- Grant SELECT on milestones for tracking
GRANT SELECT (
  id, title, description, completed, due_date
) ON public.project_milestones TO anon;

DROP POLICY IF EXISTS "Anyone can view milestones for tracking" ON public.project_milestones;
CREATE POLICY "Anyone can view milestones for tracking" ON public.project_milestones
  FOR SELECT TO anon, authenticated
  USING (true);

-- Grant SELECT on files for tracking (only visible to client files)
GRANT SELECT (
  id, file_name, file_size, file_category, description, 
  storage_path, is_watermarked, is_downloadable, 
  requires_balance_payment, created_at
) ON public.project_files TO anon;

DROP POLICY IF EXISTS "Anyone can view client-visible files" ON public.project_files;
CREATE POLICY "Anyone can view client-visible files" ON public.project_files
  FOR SELECT TO anon, authenticated
  USING (visible_to_client = true);

-- Grant INSERT on payments for client payment submissions
GRANT INSERT (
  project_id, payment_type, amount, payment_method, 
  transaction_reference, admin_notes
) ON public.payments TO anon;

DROP POLICY IF EXISTS "Anyone can submit payments" ON public.payments;
CREATE POLICY "Anyone can submit payments" ON public.payments
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Verify grants
SELECT 
  table_name,
  privilege_type,
  grantee
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
  AND table_name IN ('projects', 'project_milestones', 'project_files', 'payments')
  AND grantee = 'anon'
ORDER BY table_name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Project tracking permissions fixed!';
  RAISE NOTICE 'Anonymous users can now:';
  RAISE NOTICE '  - View projects by reference number';
  RAISE NOTICE '  - View milestones';
  RAISE NOTICE '  - View client-visible files';
  RAISE NOTICE '  - Submit payments';
END $$;
