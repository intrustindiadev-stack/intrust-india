'use server';

/**
 * Server Actions for KYC (Know Your Customer) Verification
 * 
 * These actions handle KYC record creation, updates, and retrieval
 * with proper authentication, validation, and security.
 * 
 * @module app/actions/kyc
 */

import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { validateKYCForm, sanitizeKYCData } from '@/app/types/kyc';
import { sprintVerify } from '@/lib/sprintVerify';
import { encryptCouponCode as encryptData } from '@/lib/encryption';
import { logRewardRpcResult } from '@/lib/rewardRpcResult';



/**
 * Submits or updates a KYC record for the authenticated user
 * 
 * @param {FormData} formData - Form data from KYC form
 * @returns {Promise<{success: boolean, error?: string, data?: Object}>} Result object
 */
export async function submitKYC(formData) {
    if (process.env.NODE_ENV !== 'production') console.log('[KYC] submitKYC called');
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { success: false, error: 'Unauthorized' };
        }

        // 1. Extract Text Data
        const rawData = {
            fullName: formData.get('fullName'),
            phoneNumber: formData.get('phoneNumber'),
            dateOfBirth: formData.get('dateOfBirth'),
            panNumber: formData.get('panNumber'),
            gender: formData.get('gender'),
            fatherName: formData.get('fatherName'),
            fullAddress: formData.get('fullAddress'),
            city: formData.get('city'),
            state: formData.get('state'),
            pinCode: formData.get('pinCode'),
            bankGradeSecurity: formData.get('bankGradeSecurity') === 'true'
        };

        const sanitizedData = sanitizeKYCData(rawData);
        const validation = validateKYCForm(sanitizedData);

        if (!validation.valid) {
            return { success: false, error: Object.values(validation.errors)[0] };
        }

        // Check if there is an existing record
        const adminSupabase = createAdminClient();
        const { data: existingList, error: checkError } = await adminSupabase
            .from('kyc_records')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1);

        const existing = existingList && existingList.length > 0 ? existingList[0] : null;

        // 3. Perform SprintVerify PAN Verification (API-Only Approach)
        let verificationStatus = 'rejected'; // Default to rejected
        let sprintVerifyData = {};
        let rejectionReason = null;
        let isMaskedPanReuse = false;

        if (sanitizedData.panNumber.includes('*') && existing) {
            // Allow masked PAN reuse only when the existing row is already verified and the masked value matches
            if (existing.verification_status === 'verified' && sanitizedData.panNumber === existing.pan_number) {
                verificationStatus = 'verified';
                isMaskedPanReuse = true;
                console.log('Skipping SprintVerify for previously verified masked PAN');
            } else {
                return { success: false, error: 'Cannot update pending or rejected KYC with a masked PAN. Please provide full PAN.' };
            }
        } else {
            try {
                console.log('Starting SprintVerify PAN verification...');
                const panResult = await sprintVerify.verifyPAN(sanitizedData.panNumber);
                sprintVerifyData.pan_check = panResult;

                if (panResult.valid === true) {
                    verificationStatus = 'verified';
                    console.log('SprintVerify PAN verification successful');
                } else if (panResult.valid === 'manual_review') {
                    verificationStatus = 'pending';
                    rejectionReason = null;
                    console.warn('SprintVerify PAN check returned manual_review:', panResult.message);
                } else {
                    verificationStatus = 'pending';
                    rejectionReason = `PAN verification failed: ${panResult.message}`;
                    console.warn('SprintVerify PAN check failed, queued for manual review:', panResult.message);
                }
            } catch (svError) {
                console.error('SprintVerify API error:', svError.message);
                verificationStatus = 'pending';
                rejectionReason = null;
                sprintVerifyData.error = svError.message;
            }
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

        // Get encrypted PAN value to use
        let idNumberEncrypted;
        if (sanitizedData.panNumber.includes('*') && existing) {
            idNumberEncrypted = existing.id_number_encrypted;
        } else {
            idNumberEncrypted = encryptData(sanitizedData.panNumber);
        }

        // 5. Save to Database
        const kycRecord = {
            user_id: user.id,

            // Personal Info
            full_legal_name: sanitizedData.fullName,
            date_of_birth: sanitizedData.dateOfBirth,
            phone_number: sanitizedData.phoneNumber,
            gender: sanitizedData.gender,
            father_name: sanitizedData.fatherName,

            // ID Details (Schema Requirements)
            id_type: 'pan',
            id_number_encrypted: idNumberEncrypted,
            id_number_last4: isMaskedPanReuse ? existing.pan_number.slice(-4) : sanitizedData.panNumber.slice(-4),
            pan_number: isMaskedPanReuse ? existing.pan_number : sanitizedData.panNumber,

            // Address Details (Schema Requirements)
            address_line1: sanitizedData.fullAddress,
            address_line2: '',
            city: sanitizedData.city || 'Not Provided',
            state: sanitizedData.state || 'Not Provided',
            postal_code: sanitizedData.pinCode || '000000',
            country: 'IN',
            full_address: sanitizedData.fullAddress,

            // Security
            bank_grade_security: sanitizedData.bankGradeSecurity,

            // Files (disabled — no document upload)
            selfie_url: null,
            id_document_front_url: null,

            // Status Logic (Pure API-driven)
            status: finalStatus,
            verification_status: verificationStatus,
            rejection_reason: rejectionReason,

            // Review Details (Auto-reviewed by system)
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            verified_by: isMaskedPanReuse ? existing.verified_by : (isVerified ? user.id : null),
            verified_at: isMaskedPanReuse ? existing.verified_at : (isVerified ? new Date().toISOString() : null),

            // SprintVerify Data
            sprint_verify_ref_id: sprintVerifyData.pan_check?.data?.ref_id || existing?.sprint_verify_ref_id || null,
            sprint_verify_status: verificationStatus,
            sprint_verify_data: sprintVerifyData,
            sprint_verify_timestamp: new Date().toISOString(),

            updated_at: new Date().toISOString()
        };

        let result;

        // Preserve created_at if existing, otherwise set it
        if (!existing) {
            kycRecord.created_at = new Date().toISOString();
        } else {
            kycRecord.created_at = existing.created_at;
        }

        let upserted;
        let upsertError;

        if (existing) {
            const { data, error } = await adminSupabase
                .from('kyc_records')
                .update(kycRecord)
                .eq('id', existing.id)
                .select()
                .maybeSingle();
            upserted = data;
            upsertError = error;
        } else {
            const { data, error } = await adminSupabase
                .from('kyc_records')
                .insert(kycRecord)
                .select()
                .maybeSingle();
            upserted = data;
            upsertError = error;
        }

        if (upsertError) throw upsertError;
        result = upserted || kycRecord;

        // Keep user_profiles in sync with the new KYC status
        const { error: profileError } = await adminSupabase
            .from('user_profiles')
            .update({ kyc_status: finalStatus })
            .eq('id', user.id);

        if (profileError) {
            console.warn('Failed to sync user_profiles.kyc_status:', profileError);
        }

        const previousVerificationStatus = existing?.verification_status || existing?.status || null;
        const transitionedToVerified = finalStatus === 'verified' && previousVerificationStatus !== 'verified';

        if (transitionedToVerified && result?.id) {
            const { data: rewardData, error: rewardError } = await adminSupabase.rpc('calculate_and_distribute_rewards', {
                p_event_type: 'kyc_complete',
                p_source_user_id: user.id,
                p_reference_id: result.id,
                p_reference_type: 'kyc_record'
            });

            if (rewardError) {
                console.error('[KYC] kyc_complete reward RPC failed (non-fatal):', rewardError);
            } else {
                logRewardRpcResult({
                    event_type: 'kyc_complete',
                    source_user_id: user.id,
                    reference_id: result.id,
                    reference_type: 'kyc_record',
                }, rewardData);
            }
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
        console.error('submitKYC error:', error.message);
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
        const mode = result.valid === true ? 'verified' : (result.valid === 'manual_review' ? 'manual_review' : 'failed');
        return {
            success: result.valid === true || result.valid === 'manual_review',
            mode: mode,
            message: result.message,
            data: result.data ? {
                ...result.data,
                father_name: result.data.father_name || null,
            } : null
        };
    } catch (error) {
        return { success: false, mode: 'failed', message: 'Verification service unavailable' };
    }
}

/**
 * Retrieves KYC record for the authenticated user or specified user (admin only)
 * 
 * @param {string} [userId] - Optional user ID (for admin use)
 * @returns {Promise<{data?: Object, error?: string}>} KYC record or error
 */
export async function getKYCRecord(userId = null) {
    if (process.env.NODE_ENV !== 'production') console.log('[KYC] getKYCRecord called');
    try {
        const supabase = await createServerSupabaseClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return {
                error: 'You must be logged in to view KYC records'
            };
        }

        // Determine which user's record to fetch
        const targetUserId = userId || user.id;

        // If requesting another user's record, verify admin status
        if (userId && userId !== user.id) {
            const { data: adminCheck } = await supabase
                .from('user_profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (!adminCheck || !['admin', 'super_admin'].includes(adminCheck?.role)) {
                console.warn('[KYC] Unauthorized admin access attempt');
                return {
                    error: 'Unauthorized: Admin access required'
                };
            }
        }

        // Fetch KYC record
        const { data, error } = await supabase
            .from('kyc_records')
            .select('*')
            .eq('user_id', targetUserId)
            .order('updated_at', { ascending: false })
            .limit(1);

        const record = data && data.length > 0 ? data[0] : null;

        if (error) {
            console.error('Error fetching KYC record:', error);
            return {
                error: 'Failed to fetch KYC record'
            };
        }

        return { data: record || null };

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
            .order('updated_at', { ascending: false })
            .limit(1);

        if (error) {
            return { error: 'Failed to fetch status' };
        }

        const record = data && data.length > 0 ? data[0] : null;

        if (!record) {
            return { status: null }; // No record
        }

        return { status: record.verification_status };

    } catch (error) {
        console.error('Error in getKYCStatus:', error);
        return { error: 'An unexpected error occurred' };
    }
}
