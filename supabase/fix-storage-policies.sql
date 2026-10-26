-- ============================================
-- FIX: Storage Bucket Policies for File Uploads
-- ============================================
-- This creates the storage bucket and sets up proper policies
-- for client and admin file uploads
-- ============================================

-- Note: Buckets must be created via Supabase Dashboard or Storage API
-- This script assumes bucket 'project-files' exists
-- If not, create it first:
-- 1. Go to Supabase Dashboard → Storage
-- 2. Create new bucket: 'project-files'
-- 3. Set to Private
-- 4. Then run this script

-- ============================================
-- CLIENT SUBMISSION FILE UPLOADS (Anonymous)
-- ============================================

-- Policy: Allow anonymous users to upload to submissions folder
DROP POLICY IF EXISTS "Anyone can upload submission files" ON storage.objects;
CREATE POLICY "Anyone can upload submission files"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'project-files' 
  AND (storage.foldername(name))[1] = 'submissions'
);

-- Policy: Allow anonymous users to read their uploaded files
DROP POLICY IF EXISTS "Anyone can view submission files" ON storage.objects;
CREATE POLICY "Anyone can view submission files"
ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'project-files'
  AND (storage.foldername(name))[1] = 'submissions'
);

-- ============================================
-- ADMIN PROJECT FILE UPLOADS (Authenticated)
-- ============================================

-- Policy: Allow authenticated users (staff) to upload project files
DROP POLICY IF EXISTS "Staff can upload project files" ON storage.objects;
CREATE POLICY "Staff can upload project files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.staff_roles 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Allow authenticated users (staff) to read all project files
DROP POLICY IF EXISTS "Staff can view all project files" ON storage.objects;
CREATE POLICY "Staff can view all project files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.staff_roles 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Allow authenticated users (staff) to delete project files
DROP POLICY IF EXISTS "Staff can delete project files" ON storage.objects;
CREATE POLICY "Staff can delete project files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.staff_roles 
    WHERE user_id = auth.uid()
  )
);

-- ============================================
-- CLIENT PROJECT FILE ACCESS (for tracking)
-- ============================================

-- Policy: Allow anyone to view client-visible files (with signed URLs)
DROP POLICY IF EXISTS "Anyone can view public project files" ON storage.objects;
CREATE POLICY "Anyone can view public project files"
ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'project-files'
  -- Files in project folders (not submissions) can be viewed
  AND (storage.foldername(name))[1] != 'submissions'
);

-- ============================================
-- VERIFICATION
-- ============================================

-- Check if bucket exists
SELECT 
  name as bucket_name,
  public as is_public
FROM storage.buckets 
WHERE name = 'project-files';

-- List storage policies
SELECT 
  policyname,
  cmd as operation,
  qual as using_expression
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%project%' OR policyname LIKE '%submission%'
ORDER BY policyname;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Storage policies configured!';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Make sure bucket exists!';
  RAISE NOTICE 'If you see "bucket not found" errors:';
  RAISE NOTICE '1. Go to Supabase Dashboard → Storage';
  RAISE NOTICE '2. Create bucket: project-files';
  RAISE NOTICE '3. Set to Private';
  RAISE NOTICE '4. Policies are already configured above';
  RAISE NOTICE '';
  RAISE NOTICE 'File uploads now work for:';
  RAISE NOTICE '  - Clients: submission files';
  RAISE NOTICE '  - Staff: all project files';
END $$;
