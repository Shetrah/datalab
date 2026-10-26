-- ============================================
-- Add Watermark and Payment Workflow Fields
-- ============================================
-- Run this to add new columns to project_files for watermark workflow

-- Add new columns to project_files table
ALTER TABLE public.project_files 
ADD COLUMN IF NOT EXISTS is_watermarked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_downloadable boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS requires_balance_payment boolean DEFAULT false;

-- Update file_category enum to include new categories
ALTER TABLE public.project_files 
DROP CONSTRAINT IF EXISTS project_files_file_category_check;

ALTER TABLE public.project_files 
ADD CONSTRAINT project_files_file_category_check 
CHECK (file_category IN ('requirement', 'deliverable', 'reference', 'revision', 'draft_watermarked', 'final', 'other'));

-- Add new project status values
ALTER TABLE public.projects 
DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE public.projects 
ADD CONSTRAINT projects_status_check 
CHECK (status IN (
  'awaiting_deposit', 'deposit_confirmed', 'in_progress', 'awaiting_draft_review',
  'revision_requested', 'draft_approved', 'awaiting_balance_payment',
  'payment_verification_pending', 'final_deliverables_available', 
  'completed', 'on_hold', 'cancelled'
));

-- Verify changes
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'project_files' 
  AND column_name IN ('is_watermarked', 'is_downloadable', 'requires_balance_payment');
