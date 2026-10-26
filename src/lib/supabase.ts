import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIGURATION
// ============================================

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey);
export const supabase = supabaseConfigured ? createClient(url!, anonKey!) : null;

// ============================================
// TYPE DEFINITIONS
// ============================================

export type ProjectEnquiry = {
  full_name: string;
  email: string;
  phone: string | null;
  client_category: string;
  organisation: string | null;
  service: string;
  project_title: string;
  details: string;
  deliverables: string | null;
  deadline: string | null;
  budget: string;
  preferred_contact: string;
};

export type Enquiry = {
  id: string;
  reference: string;
  full_name: string;
  email: string;
  phone: string | null;
  client_category: string;
  organisation: string | null;
  service: string;
  project_title: string;
  details: string;
  deliverables: string | null;
  deadline: string | null;
  budget: string;
  preferred_contact: string;
  status: string;
  admin_notes: string | null;
  quoted_amount: number | null;
  quoted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Contact = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  contact_reason: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

export type ProjectSubmission = {
  id: string;
  reference: string;
  full_name: string;
  email: string;
  phone: string | null;
  client_category: string;
  organisation: string | null;
  service: string;
  project_title: string;
  details: string;
  deliverables: string | null;
  deadline: string | null;
  budget: string;
  preferred_contact: string;
  status: string;
  admin_notes: string | null;
  quoted_amount: number | null;
  quoted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  reference: string;
  enquiry_id: string | null;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  title: string;
  service: string;
  description: string | null;
  status: string;
  agreed_deadline: string | null;
  total_fee: number | null;
  deposit_amount: number | null;
  balance_amount: number | null;
  deposit_paid: boolean;
  balance_paid: boolean;
  progress_percentage: number;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Milestone = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  display_order: number;
  created_at: string;
};

export type Payment = {
  id: string;
  project_id: string;
  payment_type: string;
  amount: number;
  payment_method: string | null;
  transaction_reference: string | null;
  payment_status: string;
  verified_by: string | null;
  verified_at: string | null;
  admin_notes: string | null;
  created_at: string;
};

export type ProjectFile = {
  id: string;
  project_id: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  storage_path: string;
  uploaded_by_type: string;
  file_category: string | null;
  description: string | null;
  visible_to_client: boolean;
  is_watermarked: boolean;
  is_downloadable: boolean;
  requires_balance_payment: boolean;
  created_at: string;
};

export type SubmissionFile = {
  id: string;
  submission_id: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  storage_path: string;
  description: string | null;
  created_at: string;
};

// ============================================
// PUBLIC FUNCTIONS (No Authentication Required)
// ============================================

// Submit Old-style Enquiry (Legacy - for backward compatibility)
export async function submitEnquiry(enquiry: ProjectEnquiry) {
  if (!supabase) throw new Error('Enquiry storage is not configured.');
  const { error } = await supabase.from('enquiries').insert(enquiry);
  if (error) throw error;
}

// Submit Contact Message (General inquiries)
export async function submitContact(contact: {
  full_name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  contact_reason?: string;
}) {
  if (!supabase) throw new Error('Contact storage is not configured.');
  const { error } = await supabase.from('contacts').insert(contact);
  if (error) throw error;
}

// Submit Project with Details (New primary submission method)
export async function submitProjectSubmission(submission: Omit<ProjectSubmission, 'id' | 'reference' | 'status' | 'admin_notes' | 'quoted_amount' | 'quoted_at' | 'created_at' | 'updated_at'>) {
  if (!supabase) throw new Error('Project submission storage is not configured.');
  
  const { data, error } = await supabase
    .from('project_submissions')
    .insert(submission)
    .select()
    .single();
  
  if (error) {
    console.error('Submission error:', error);
    throw new Error(error.message || 'Failed to submit project');
  }
  
  return data as ProjectSubmission;
}

// Create Submission File Record
export async function createSubmissionFile(file: Omit<SubmissionFile, 'id' | 'created_at'>) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('submission_files')
    .insert(file)
    .select()
    .single();
  if (error) throw error;
  return data as SubmissionFile;
}

// Upload File to Storage (for submissions)
export async function uploadSubmissionFile(file: File, submissionId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `submissions/${submissionId}/${fileName}`;
  
  const { error: uploadError } = await supabase.storage
    .from('project-files')
    .upload(filePath, file);
  
  if (uploadError) throw uploadError;
  
  return {
    path: filePath,
    name: file.name,
    size: file.size,
    type: file.type
  };
}

// Request Project Access Link
export async function requestProjectLink(reference: string, emailAddress: string) {
  if (!supabase) throw new Error('Project tracking is not configured.');
  const { error } = await supabase.rpc('request_project_access_link', {
    project_reference: reference.trim(),
    client_email: emailAddress.trim().toLowerCase(),
  });
  if (error) throw error;
}

// Get Public Site Content (for editable content on public pages)
export async function getPublicSiteContent(key: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('site_content')
    .select('content_value')
    .eq('content_key', key)
    .maybeSingle();
  if (error) return null;
  return data?.content_value as Record<string, string> | undefined;
}

// ============================================
// ADMIN FUNCTIONS (Authentication Required)
// ============================================

// Get Staff Role
export async function getStaffRole(userId: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('staff_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.role === 'admin' || data?.role === 'editor' ? data.role : null;
}

// Save Site Content (Admin only)
export async function saveSiteContent(key: string, value: Record<string, string>, userId: string) {
  if (!supabase) throw new Error('Website content storage is not configured.');
  const { error } = await supabase
    .from('site_content')
    .upsert({ 
      content_key: key, 
      content_value: value, 
      updated_at: new Date().toISOString(), 
      updated_by: userId 
    });
  if (error) throw error;
}

// Get Site Content (Admin - for editing)
export async function getSiteContent(key: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('site_content')
    .select('content_value')
    .eq('content_key', key)
    .maybeSingle();
  if (error) throw error;
  return data?.content_value as Record<string, string> | undefined;
}

// ============================================
// CONTACT MANAGEMENT
// ============================================

export async function getAllContacts() {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Contact[];
}

export async function updateContact(id: string, updates: Partial<Contact>) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('contacts')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

// ============================================
// PROJECT SUBMISSION MANAGEMENT
// ============================================

export async function getAllProjectSubmissions() {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('project_submissions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as ProjectSubmission[];
}

export async function getProjectSubmissionById(id: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('project_submissions')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as ProjectSubmission;
}

export async function updateProjectSubmission(id: string, updates: Partial<ProjectSubmission>) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('project_submissions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function getSubmissionFiles(submissionId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('submission_files')
    .select('*')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as SubmissionFile[];
}

export async function deleteSubmissionFile(id: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('submission_files')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ============================================
// ENQUIRY MANAGEMENT (Legacy)
// ============================================

export async function getAllEnquiries() {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('enquiries')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Enquiry[];
}

export async function updateEnquiry(id: string, updates: Partial<Enquiry>) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('enquiries')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// Convert Submission to Project
export async function convertSubmissionToProject(submission: ProjectSubmission, projectData: {
  total_fee: number;
  deposit_amount: number;
  balance_amount: number;
  agreed_deadline?: string;
  admin_notes?: string;
}) {
  if (!supabase) throw new Error('Supabase not configured');
  
  // Generate project reference
  const projectRef = `DRC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  
  // Create project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      reference: projectRef,
      client_name: submission.full_name,
      client_email: submission.email,
      client_phone: submission.phone,
      title: submission.project_title,
      service: submission.service,
      description: submission.details,
      status: 'awaiting_deposit',
      total_fee: projectData.total_fee,
      deposit_amount: projectData.deposit_amount,
      balance_amount: projectData.balance_amount,
      agreed_deadline: projectData.agreed_deadline || null,
      admin_notes: projectData.admin_notes || `Converted from submission ${submission.reference}`
    })
    .select()
    .single();
  
  if (projectError) throw projectError;
  
  // Update submission status
  await updateProjectSubmission(submission.id, {
    status: 'converted',
    quoted_amount: projectData.total_fee,
    quoted_at: new Date().toISOString()
  });
  
  // Copy submission files to project files
  const submissionFiles = await getSubmissionFiles(submission.id);
  for (const file of submissionFiles) {
    await createProjectFile({
      project_id: project.id,
      file_name: file.file_name,
      file_size: file.file_size,
      file_type: file.file_type,
      storage_path: file.storage_path,
      uploaded_by_type: 'client',
      file_category: 'requirement',
      description: file.description || 'Uploaded with submission',
      visible_to_client: true,
      is_watermarked: false,
      is_downloadable: true,
      requires_balance_payment: false
    });
  }
  
  return project;
}

// Get Project by Reference
export async function getProjectByReference(reference: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('reference', reference.trim().toUpperCase())
    .single();
  if (error) throw error;
  return data as Project;
}

// ============================================
// PROJECT MANAGEMENT
// ============================================

export async function getAllProjects() {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Project[];
}

export async function getProjectById(id: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Project;
}

export async function createProject(project: Partial<Project>) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('projects')
    .insert(project)
    .select()
    .single();
  if (error) throw error;
  return data as Project;
}

export async function updateProject(id: string, updates: Partial<Project>) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ============================================
// MILESTONE MANAGEMENT
// ============================================

export async function getProjectMilestones(projectId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('project_milestones')
    .select('*')
    .eq('project_id', projectId)
    .order('display_order', { ascending: true });
  if (error) throw error;
  return data as Milestone[];
}

export async function createMilestone(milestone: Omit<Milestone, 'id' | 'created_at'>) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('project_milestones')
    .insert(milestone)
    .select()
    .single();
  if (error) throw error;
  return data as Milestone;
}

export async function updateMilestone(id: string, updates: Partial<Milestone>) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('project_milestones')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteMilestone(id: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('project_milestones')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ============================================
// PAYMENT MANAGEMENT
// ============================================

export async function getProjectPayments(projectId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Payment[];
}

export async function createPayment(payment: Omit<Payment, 'id' | 'created_at'>) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('payments')
    .insert(payment)
    .select()
    .single();
  if (error) throw error;
  return data as Payment;
}

export async function updatePayment(id: string, updates: Partial<Payment>) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('payments')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

// ============================================
// FILE MANAGEMENT
// ============================================

export async function getProjectFiles(projectId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('project_files')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as ProjectFile[];
}

export async function createProjectFile(file: Omit<ProjectFile, 'id' | 'created_at'>) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('project_files')
    .insert(file)
    .select()
    .single();
  if (error) throw error;
  return data as ProjectFile;
}

export async function deleteProjectFile(id: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('project_files')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ============================================
// STORAGE MANAGEMENT
// ============================================

// Upload Project File (Admin uploads)
export async function uploadFile(file: File, projectId: string, category: string) {
  if (!supabase) throw new Error('Supabase not configured');
  
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${projectId}/${category}/${fileName}`;
  
  const { error: uploadError } = await supabase.storage
    .from('project-files')
    .upload(filePath, file);
  
  if (uploadError) throw uploadError;
  
  return {
    path: filePath,
    name: file.name,
    size: file.size,
    type: file.type
  };
}

// Get Signed URL for File Download
export async function getFileUrl(path: string, expiresIn: number = 3600) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data } = await supabase.storage
    .from('project-files')
    .createSignedUrl(path, expiresIn); // Default 1 hour
  return data?.signedUrl || null;
}

// Delete File from Storage
export async function deleteFile(path: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.storage
    .from('project-files')
    .remove([path]);
  if (error) throw error;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  return supabaseConfigured;
}

// Get current authenticated user
export async function getCurrentUser() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Sign out user
export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

// ============================================
// EXPORTS
// ============================================

export default {
  // Configuration
  supabase,
  supabaseConfigured,
  isSupabaseConfigured,
  
  // Public Functions
  submitEnquiry,
  submitContact,
  submitProjectSubmission,
  createSubmissionFile,
  uploadSubmissionFile,
  requestProjectLink,
  getPublicSiteContent,
  
  // Admin Functions
  getStaffRole,
  saveSiteContent,
  getSiteContent,
  
  // Contact Management
  getAllContacts,
  updateContact,
  
  // Project Submission Management
  getAllProjectSubmissions,
  getProjectSubmissionById,
  updateProjectSubmission,
  getSubmissionFiles,
  deleteSubmissionFile,
  convertSubmissionToProject,
  
  // Enquiry Management
  getAllEnquiries,
  updateEnquiry,
  
  // Project Management
  getAllProjects,
  getProjectById,
  getProjectByReference,
  createProject,
  updateProject,
  
  // Milestone Management
  getProjectMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  
  // Payment Management
  getProjectPayments,
  createPayment,
  updatePayment,
  
  // File Management
  getProjectFiles,
  createProjectFile,
  deleteProjectFile,
  uploadFile,
  getFileUrl,
  deleteFile,
  
  // Utility
  getCurrentUser,
  signOut
};
