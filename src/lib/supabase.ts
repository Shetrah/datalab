import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey);
export const supabase = supabaseConfigured ? createClient(url!, anonKey!) : null;

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

export async function submitEnquiry(enquiry: ProjectEnquiry) {
  if (!supabase) throw new Error('Enquiry storage is not configured.');
  const { error } = await supabase.from('enquiries').insert(enquiry);
  if (error) throw error;
}

export async function requestProjectLink(reference: string, emailAddress: string) {
  if (!supabase) throw new Error('Project tracking is not configured.');
  const { error } = await supabase.rpc('request_project_access_link', {
    project_reference: reference.trim(),
    client_email: emailAddress.trim().toLowerCase(),
  });
  if (error) throw error;
}

export async function getStaffRole(userId: string) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('staff_roles').select('role').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data?.role === 'admin' || data?.role === 'editor' ? data.role : null;
}

export async function saveSiteContent(key: string, value: Record<string, string>, userId: string) {
  if (!supabase) throw new Error('Website content storage is not configured.');
  const { error } = await supabase.from('site_content').upsert({ content_key: key, content_value: value, updated_at: new Date().toISOString(), updated_by: userId });
  if (error) throw error;
}

export async function getSiteContent(key: string) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('site_content').select('content_value').eq('content_key', key).maybeSingle();
  if (error) throw error;
  return data?.content_value as Record<string, string> | undefined;
}

export async function getPublicSiteContent(key: string) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('site_content').select('content_value').eq('content_key', key).maybeSingle();
  if (error) return null;
  return data?.content_value as Record<string, string> | undefined;
}
