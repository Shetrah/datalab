-- ============================================
-- FIX: Permission denied for table projects
-- ============================================
-- This grants authenticated users permission to insert projects
-- Run this in Supabase SQL Editor

-- Grant INSERT permission to authenticated users (staff)
GRANT INSERT ON public.projects TO authenticated;

-- Grant UPDATE permission (needed for converting submissions)
GRANT UPDATE ON public.projects TO authenticated;

-- Grant SELECT permission (already exists but ensuring)
GRANT SELECT ON public.projects TO authenticated;

-- Verify the grants
SELECT 
  grantee, 
  table_name, 
  privilege_type 
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
  AND table_name = 'projects'
  AND grantee = 'authenticated';

-- Should show:
-- authenticated | projects | SELECT
-- authenticated | projects | INSERT
-- authenticated | projects | UPDATE
