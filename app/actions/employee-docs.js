'use server'

import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { revalidatePath } from 'next/cache'

// Get document requirements
export async function getDocumentRequirements() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('kyc_document_requirements')
    .select('*')
    .order('created_at', { ascending: true })
    
  if (error) return { success: false, error: error.message, data: [] }
  return { success: true, data }
}

// Generate Signed Upload URL
export async function generateUploadUrl(docType, submissionId, fileName) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Unauthorized' }

  const ext = fileName.split('.').pop()
  const uniqueId = crypto.randomUUID()
  const path = `${user.id}/${docType}/${submissionId}/${uniqueId}.${ext}`

  const { data, error } = await supabase.storage
    .from('employee-documents')
    .createSignedUploadUrl(path)
    
  if (error) return { success: false, error: error.message }
  return { success: true, url: data.signedUrl, path, token: data.token }
}

// Create Draft Submission
export async function createDraftSubmission(requirementId) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('kyc_submissions')
    .insert({
      user_id: user.id,
      requirement_id: requirementId,
      status: 'draft'
    })
    .select('id')
    .single()

  // Handle unique constraint violation (submission already exists)
  if (error) {
    if (error.code === '23505') {
       const { data: existing } = await supabase
        .from('kyc_submissions')
        .select('id')
        .eq('user_id', user.id)
        .eq('requirement_id', requirementId)
        .single()
       return { success: true, submissionId: existing.id }
    }
    return { success: false, error: error.message }
  }

  return { success: true, submissionId: data.id }
}

// Register File (after successful upload to storage)
export async function registerUploadedFile(submissionId, filePath, originalName, mimeType, sizeBytes) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('kyc_submission_files')
    .insert({
      submission_id: submissionId,
      file_path: filePath,
      original_name: originalName,
      mime_type: mimeType,
      size_bytes: sizeBytes
    })
    
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// Finalize Submission
export async function finalizeKycSubmission(submissionId, documentNumber) {
  const supabase = await createServerSupabaseClient()
  
  const { error } = await supabase
    .from('kyc_submissions')
    .update({ 
      status: 'pending',
      document_number: documentNumber,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', submissionId)
    .eq('status', 'draft') // Only draft can be finalized
    
  if (error) return { success: false, error: error.message }
  
  revalidatePath('/employee/documents')
  return { success: true }
}

// Re-open rejected submission (creates a new draft/pending flow using same submission_id)
export async function retryKycSubmission(submissionId) {
  const supabase = await createServerSupabaseClient()
  
  const { error } = await supabase
    .from('kyc_submissions')
    .update({ 
      status: 'draft',
      updated_at: new Date().toISOString()
    })
    .eq('id', submissionId)
    .eq('status', 'rejected') 
    
  if (error) return { success: false, error: error.message }
  
  // Optionally clean up old files or leave them (for now leave them, they are part of history or can be hard deleted by policy)
  const { error: deleteError } = await supabase
    .from('kyc_submission_files')
    .delete()
    .eq('submission_id', submissionId)
    
  revalidatePath('/employee/documents')
  return { success: true }
}

// Get Employee Submissions
export async function getEmployeeSubmissions() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, data: [] }

  const { data, error } = await supabase
    .from('kyc_submissions')
    .select(`
      *,
      kyc_document_requirements(*),
      kyc_submission_files(*)
    `)
    .eq('user_id', user.id)
    
  if (error) return { success: false, error: error.message, data: [] }
  return { success: true, data }
}

// HR: Get Submissions
export async function getEmployeeSubmissionsForHR() {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('kyc_submissions')
    .select(`
      *,
      kyc_document_requirements(*),
      kyc_submission_files(*),
      user_profiles:user_id(id, full_name, phone, role)
    `)
    .order('updated_at', { ascending: false })
    
  if (error) return { success: false, error: error.message, data: [] }
  return { success: true, data }
}

// HR: Approve
export async function approveKycSubmission(submissionId, version) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Optimistic lock check: update only if version matches
  const { data, error } = await supabase
    .from('kyc_submissions')
    .update({ 
      status: 'approved',
      version: version + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', submissionId)
    .eq('version', version)
    .select('id')
    
  if (error) return { success: false, error: error.message }
  if (data.length === 0) return { success: false, error: 'Document was already modified by another reviewer.' }
  
  // Audit log
  await supabase.from('kyc_document_reviews').insert({
    submission_id: submissionId,
    reviewer_id: user.id,
    previous_status: 'pending',
    new_status: 'approved'
  })

  revalidatePath('/hrm/documents')
  return { success: true }
}

// HR: Reject
export async function rejectKycSubmission(submissionId, version, reason) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('kyc_submissions')
    .update({ 
      status: 'rejected',
      version: version + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', submissionId)
    .eq('version', version)
    .select('id')
    
  if (error) return { success: false, error: error.message }
  if (data.length === 0) return { success: false, error: 'Document was already modified by another reviewer.' }
  
  // Audit log
  await supabase.from('kyc_document_reviews').insert({
    submission_id: submissionId,
    reviewer_id: user.id,
    previous_status: 'pending',
    new_status: 'rejected',
    rejection_reason: reason
  })

  revalidatePath('/hrm/documents')
  return { success: true }
}

// Get Signed URL
export async function getDocumentSignedUrl(filePath) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .storage
    .from('employee-documents')
    .createSignedUrl(filePath, 60 * 5)
    
  if (error) return { success: false, error: error.message }
  return { success: true, signedUrl: data.signedUrl }
}
