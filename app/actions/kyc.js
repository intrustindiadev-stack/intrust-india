'use server';

/**
 * Server Actions for KYC (Know Your Customer) Verification
 * 
 * These actions handle KYC record creation, updates, and retrieval
 * with proper authentication, validation, and security.
 * 
 * @module app/actions/kyc
 */

import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { validateKYCForm, sanitizeKYCData } from '@/app/types/kyc';
import { sprintVerify } from '@/lib/sprintVerify';


// Helper to upload file to Supabase Storage
async function uploadFile(supabase, userId, file, bucket = 'kyc-documents') {
    if (!file || typeof file === 'string') return null; // Skip if already a string (URL) or empty

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

    if (error) {
        console.error('Storage upload error:', error);
        throw error;
    }

    return data.path;
}

/**
 * Submits or updates a KYC record for the authenticated user
 * 
 * @param {FormData} formData - Form data from KYC form
 * @returns {Promise<{success: boolean, error?: string, data?: Object}>} Result object
 */
export async function submitKYC(formData) {
    console.log('SERVER ACTION: submitKYC started');
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { success: false, error: 'Unauthorized' };
        }

        // 1. Handle File Uploads (ID Document only — selfie removed)
        const docFrontFile = formData.get('idDocumentFront');

        let docFrontPath = null;

        try {
            if (docFrontFile && docFrontFile.size > 0) {
                docFrontPath = await uploadFile(supabase, user.id, docFrontFile);
            }
        } catch (uploadErr) {
            return { success: false, error: 'Failed to upload documents. Please try again.' };
        }

        // 2. Extract Text Data
        const rawData = {
            fullName: formData.get('fullName'),
            phoneNumber: formData.get('phoneNumber'),
            dateOfBirth: formData.get('dateOfBirth'),
            panNumber: formData.get('panNumber'),
            fullAddress: formData.get('fullAddress'),
            bankGradeSecurity: formData.get('bankGradeSecurity') === 'true'
        };

        const sanitizedData = sanitizeKYCData(rawData);
        const validation = validateKYCForm(sanitizedData);

        if (!validation.valid) {
            return { success: false, error: Object.values(validation.errors)[0] };
        }

        // 3. Perform SprintVerify PAN Verification (API-Only Approach)
        let verificationStatus = 'rejected'; // Default to rejected
        let sprintVerifyData = {};
        let rejectionReason = null;

        try {
            console.log('Starting SprintVerify PAN verification...');
            const panResult = await sprintVerify.verifyPAN(sanitizedData.panNumber);
            sprintVerifyData.pan_check = panResult;

            if (panResult.valid === true) {
                // Strict equality — 'manual_review' is truthy but not === true
                verificationStatus = 'verified';
                console.log('SprintVerify PAN verification successful');
            } else if (panResult.valid === 'manual_review') {
                // Network/API failure — queue for manual review, don't reject
                verificationStatus = 'pending';
                rejectionReason = null;
                console.warn('SprintVerify PAN check returned manual_review:', panResult.message);
            } else {
                verificationStatus = 'rejected';
                rejectionReason = `PAN verification failed: ${panResult.message}`;
                console.warn('SprintVerify PAN check failed:', panResult.message);
            }
        } catch (svError) {
            console.error('SprintVerify API error:', svError);
            // On unexpected errors, queue for manual review instead of hard rejecting
            verificationStatus = 'pending';
            rejectionReason = null;
            sprintVerifyData.error = svError.message;
        }

        // 4. Set Final Status based purely on SprintVerify results
        let finalStatus;
        if (verificationStatus === 'verified') {
            finalStatus = 'verified';
        } else if (verificationStatus === 'pending') {
            finalStatus = 'pending';
        } else {
            finalStatus = 'rejected';
        }
        const isVerified = verificationStatus === 'verified';

        // 5. Save to Database
        const kycRecord = {
            user_id: user.id,

            // Personal Info
            full_legal_name: sanitizedData.fullName,
            date_of_birth: sanitizedData.dateOfBirth,
            phone_number: sanitizedData.phoneNumber,

            // ID Details (Schema Requirements)
            id_type: 'pan',
            id_number_encrypted: sanitizedData.panNumber, // Storing raw for now (encryption recommended)
            id_number_last4: sanitizedData.panNumber.slice(-4),
            pan_number: sanitizedData.panNumber,

            // Address Details (Schema Requirements)
            address_line1: sanitizedData.fullAddress,
            address_line2: '',
            city: 'Not Provided',
            state: 'Not Provided',
            postal_code: '000000',
            country: 'IN',
            full_address: sanitizedData.fullAddress,

            // Security
            bank_grade_security: sanitizedData.bankGradeSecurity,

            // Files (selfie removed — only ID document kept)
            selfie_url: null,
            id_document_front_url: docFrontPath || null,

            // Status Logic (Pure API-driven)
            status: finalStatus,
            verification_status: verificationStatus,
            rejection_reason: rejectionReason,

            // Review Details (Auto-reviewed by system)
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            verified_by: isVerified ? user.id : null,
            verified_at: isVerified ? new Date().toISOString() : null,

            // SprintVerify Data
            sprint_verify_ref_id: sprintVerifyData.pan_check?.data?.ref_id || null,
            sprint_verify_status: verificationStatus,
            sprint_verify_data: sprintVerifyData,
            sprint_verify_timestamp: new Date().toISOString(),

            updated_at: new Date().toISOString()
        };

        // Upsert Logic
        const { data: existing, error: checkError } = await supabase.from('kyc_records').select('id').eq('user_id', user.id).maybeSingle();

        let result;
        if (existing) {
            const { data: updated, error: updateError } = await supabase
                .from('kyc_records')
                .update(kycRecord)
                .eq('user_id', user.id)
                .select().maybeSingle();
            if (updateError) throw updateError;
            result = updated || kycRecord;
        } else {
            kycRecord.created_at = new Date().toISOString();
            const { data: inserted, error: insertError } = await supabase
                .from('kyc_records')
                .insert(kycRecord)
                .select().maybeSingle();
            if (insertError) throw insertError;
            result = inserted || kycRecord;
        }

        revalidatePath('/profile/kyc');

        let message;
        if (isVerified) {
            message = 'KYC Verified Successfully via SprintVerify';
        } else if (verificationStatus === 'pending') {
            message = 'KYC submitted. Verification is pending manual review.';
        } else {
            message = `KYC Verification Failed: ${rejectionReason}`;
        }

        return { success: true, data: result, message };

    } catch (error) {
        console.error('submitKYC error:', error);
        // Return specific error for known DB errors
        if (error.code === '23505') return { success: false, error: 'KYC record already exists' };
        if (error.code === '42501') return { success: false, error: 'Database permission error. Contact support.' };
        return { success: false, error: `Submission failed: ${error.message}` };
    }
}

/**
 * Standalone PAN Verification Action
 */
export async function verifyPANAction(panNumber) {
    try {
        const result = await sprintVerify.verifyPAN(panNumber);
        return { success: result.valid === true, message: result.message, data: result.data };
    } catch (error) {
        return { success: false, error: 'Verification service unavailable' };
    }
}

/**
 * Retrieves KYC record for the authenticated user or specified user (admin only)
 * 
 * @param {string} [userId] - Optional user ID (for admin use)
 * @returns {Promise<{data?: Object, error?: string}>} KYC record or error
 */
export async function getKYCRecord(userId = null) {
    console.log('SERVER ACTION: getKYCRecord started', { userId });
    try {
        const supabase = await createServerSupabaseClient();
        console.log('SERVER ACTION: supabase client created');

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        console.log('SERVER ACTION: auth check result', { userId: user?.id, error: authError });

        if (authError || !user) {
            console.error('SERVER ACTION: Auth failed');
            return {
                error: 'You must be logged in to view KYC records'
            };
        }

        // Determine which user's record to fetch
        const targetUserId = userId || user.id;

        // If requesting another user's record, verify admin status
        if (userId && userId !== user.id) {
            console.log('SERVER ACTION: Admin check required');
            const { data: adminCheck } = await supabase
                .from('app_admins')
                .select('user_id')
                .eq('user_id', user.id)
                .single();

            if (!adminCheck) {
                console.warn('SERVER ACTION: Unauthorized admin access attempt');
                return {
                    error: 'Unauthorized: Admin access required'
                };
            }
        }

        console.log('SERVER ACTION: Fetching KYC record for user', targetUserId);
        // Fetch KYC record
        const { data, error } = await supabase
            .from('kyc_records')
            .select('*')
            .eq('user_id', targetUserId)
            .single();

        console.log('SERVER ACTION: Fetch result', { dataFound: !!data, error });

        if (error) {
            if (error.code === 'PGRST116') {
                // No record found
                return { data: null };
            }
            console.error('Error fetching KYC record:', error);
            return {
                error: 'Failed to fetch KYC record'
            };
        }

        return { data };

    } catch (error) {
        console.error('Unexpected error in getKYCRecord:', error);
        return {
            error: 'An unexpected error occurred'
        };
    }
}

/**
 * Gets the KYC verification status for the authenticated user
 * Useful for quick status checks without fetching full record
 * 
 * @returns {Promise<{status?: string, error?: string}>} Status or error
 */
export async function getKYCStatus() {
    try {
        const supabase = await createServerSupabaseClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { error: 'Not authenticated' };
        }

        const { data, error } = await supabase
            .from('kyc_records')
            .select('verification_status')
            .eq('user_id', user.id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return { status: null }; // No record
            }
            return { error: 'Failed to fetch status' };
        }

        return { status: data.verification_status };

    } catch (error) {
        console.error('Error in getKYCStatus:', error);
        return { error: 'An unexpected error occurred' };
    }
}
