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
<<<<<<< HEAD
=======
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

    // Get public URL (or signed URL if private - assume private for KYC)
    // For now returning the path, we can construct URL or use createSignedUrl later
    // But typically for admin viewing we might just store the path or a constrained URL

    // Let's get a public URL for simplicity if bucket is public, else path.
    // If bucket is private (recommended), we should store the path and generate signed URLs on view.
    // For this implementation, we'll store the full path to be safe.
    return data.path;
}
>>>>>>> origin/yogesh

/**
 * Submits or updates a KYC record for the authenticated user
 * 
<<<<<<< HEAD
 * @param {FormData | Object} formData - Form data from KYC form
=======
 * @param {FormData} formData - Form data from KYC form
>>>>>>> origin/yogesh
 * @returns {Promise<{success: boolean, error?: string, data?: Object}>} Result object
 */
export async function submitKYC(formData) {
    console.log('SERVER ACTION: submitKYC started');
    try {
<<<<<<< HEAD
        // Create Supabase client with SSR
        const supabase = await createServerSupabaseClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        console.log('SERVER ACTION: submitKYC auth check', { userId: user?.id, error: authError });

        if (authError || !user) {
            return {
                success: false,
                error: 'You must be logged in to submit KYC verification'
            };
        }

        // Extract form data (works with both FormData and plain objects)
        const data = formData instanceof FormData ? {
=======
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { success: false, error: 'Unauthorized' };
        }

        // 1. Handle File Uploads
        const selfieFile = formData.get('selfieImage');
        const docFrontFile = formData.get('idDocumentFront');

        // We need converting FormData Entry to Buffer/Blob if it's a file
        // IN Next.js Server Actions, File objects are passed as is.

        let selfiePath = null;
        let docFrontPath = null;

        try {
            if (selfieFile && selfieFile.size > 0) {
                selfiePath = await uploadFile(supabase, user.id, selfieFile);
            }
            if (docFrontFile && docFrontFile.size > 0) {
                docFrontPath = await uploadFile(supabase, user.id, docFrontFile);
            }
        } catch (uploadErr) {
            return { success: false, error: 'Failed to upload documents. Please try again.' };
        }

        // 2. Extract Text Data
        const rawData = {
>>>>>>> origin/yogesh
            fullName: formData.get('fullName'),
            phoneNumber: formData.get('phoneNumber'),
            dateOfBirth: formData.get('dateOfBirth'),
            panNumber: formData.get('panNumber'),
            fullAddress: formData.get('fullAddress'),
<<<<<<< HEAD
            bankGradeSecurity: formData.get('bankGradeSecurity') === 'true' || formData.get('bankGradeSecurity') === true
        } : formData;

        console.log('SERVER ACTION: submitKYC data received', { ...data, panNumber: 'REDACTED' });

        // Sanitize input data
        const sanitizedData = sanitizeKYCData(data);

        // Validate form data
        const validation = validateKYCForm(sanitizedData);
        if (!validation.valid) {
            console.warn('SERVER ACTION: Validation failed', validation.errors);
            return {
                success: false,
                error: Object.values(validation.errors)[0] || 'Validation failed',
                errors: validation.errors
            };
        }

        // Check if user already has a KYC record
        const { data: existingRecord, error: fetchError } = await supabase
            .from('kyc_records')
            .select('id, status')
            .eq('user_id', user.id)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching existing KYC record:', fetchError);
            return {
                success: false,
                error: 'Failed to check existing KYC record',
                dbError: fetchError
            };
        }

        // Prepare KYC record data matching the ACTUAL database schema
        // Based on Supabase Snippet Public Schema Column Inventory.csv
        const kycRecord = {
            user_id: user.id,
            full_legal_name: sanitizedData.fullName,
            phone_number: sanitizedData.phoneNumber, // Added in migration
            pan_number: sanitizedData.panNumber, // Added in migration
            date_of_birth: sanitizedData.dateOfBirth,

            // Mapping for existing required columns
            status: 'pending', // Enum: likely pending, verified, rejected
            verification_status: 'pending', // Enum added in migration

            // Required columns from original schema - mapping best effort
            id_type: 'pan',
            id_number_encrypted: sanitizedData.panNumber, // Ideally should be encrypted, but verified schema says text
            id_number_last4: sanitizedData.panNumber.slice(-4),

            // Address parsing (simple split for now, user provides full address string)
            address_line1: sanitizedData.fullAddress.substring(0, 100),
            address_line2: sanitizedData.fullAddress.length > 100 ? sanitizedData.fullAddress.substring(100) : null,
            city: 'Unknown', // Placeholder as form doesn't check this yet
            state: 'Unknown', // Placeholder
            postal_code: '000000', // Placeholder
            country: 'India',

            // Required URLs - placeholders for now as file upload is not yet implemented
            id_document_front_url: 'placeholder_front.jpg',
            selfie_url: 'placeholder_selfie.jpg',

            full_address: sanitizedData.fullAddress, // Added in migration
            bank_grade_security: sanitizedData.bankGradeSecurity, // Added in migration
=======
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

            if (panResult.valid) {
                verificationStatus = 'verified';
                console.log('SprintVerify PAN verification successful');
            } else {
                verificationStatus = 'rejected';
                rejectionReason = `PAN verification failed: ${panResult.message}`;
                console.warn('SprintVerify PAN check failed:', panResult.message);
            }
        } catch (svError) {
            console.error('SprintVerify API error:', svError);
            verificationStatus = 'rejected';
            // Show the actual error message for better debugging
            rejectionReason = `Verification failed: ${svError.message}`;
            sprintVerifyData.error = svError.message;
        }

        // 4. Set Final Status based purely on SprintVerify results
        const isVerified = verificationStatus === 'verified';
        const finalStatus = isVerified ? 'approved' : 'rejected';

        // 4. Save to Database
        // NOTE: The schema requires specific address fields and ID details. 
        // We map 'fullAddress' to 'address_line1' and provide defaults for others 
        // to satisfy NOT NULL constraints.
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
            city: 'Not Provided', // Placeholder to satisfy NOT NULL
            state: 'Not Provided',
            postal_code: '000000',
            country: 'IN',
            full_address: sanitizedData.fullAddress,

            // Security
            bank_grade_security: sanitizedData.bankGradeSecurity,

            // Files
            selfie_url: selfiePath,
            id_document_front_url: docFrontPath,

            // Status Logic (Pure API-driven)
            status: finalStatus,
            verification_status: verificationStatus,
            rejection_reason: rejectionReason,

            // Review Details (Auto-reviewed by system)
            reviewed_by: user.id, // System auto-review
            reviewed_at: new Date().toISOString(),
            verified_by: isVerified ? user.id : null,
            verified_at: isVerified ? new Date().toISOString() : null,

            // SprintVerify Data
            sprint_verify_ref_id: sprintVerifyData.pan_check?.data?.ref_id || null,
            sprint_verify_status: verificationStatus,
            sprint_verify_data: sprintVerifyData,
            sprint_verify_timestamp: new Date().toISOString(),
>>>>>>> origin/yogesh

            updated_at: new Date().toISOString()
        };

<<<<<<< HEAD
        let result;

        if (existingRecord) {
            console.log('SERVER ACTION: Updating existing record', existingRecord.id);
            // Check if existing record can be updated
            // Note: unexpected column name 'status' vs 'verification_status'. checking both.
            const status = existingRecord.verification_status || existingRecord.status;

            if (status === 'verified') {
                return {
                    success: false,
                    error: 'Your KYC is already verified and cannot be modified'
                };
            }

            if (status === 'rejected') {
                // Allow updating rejected records, but reset to pending
                kycRecord.status = 'pending';
                kycRecord.verification_status = 'pending';
                kycRecord.reviewed_by = null; // unexpected column 'reviewed_by' vs 'verified_by'
                kycRecord.verified_by = null;
                kycRecord.verified_at = null;
                kycRecord.rejection_reason = null;
            }

            // Update existing record
            const { data: updatedRecord, error: updateError } = await supabase
                .from('kyc_records')
                .update(kycRecord)
                .eq('id', existingRecord.id)
                .eq('user_id', user.id) // Extra safety check
                .select()
                .single();

            if (updateError) {
                console.error('Error updating KYC record:', updateError);
                return {
                    success: false,
                    error: 'Failed to update KYC record. Please try again.',
                    dbError: updateError
                };
            }

            result = updatedRecord;
        } else {
            console.log('SERVER ACTION: Creating new record');
            // Create new record
            kycRecord.created_at = new Date().toISOString();
            kycRecord.submitted_at = new Date().toISOString(); // From inventory

            const { data: newRecord, error: insertError } = await supabase
                .from('kyc_records')
                .insert([kycRecord])
                .select()
                .single();

            if (insertError) {
                console.error('Error inserting KYC record:', insertError);
                return {
                    success: false,
                    error: 'Failed to submit KYC record. Please try again.',
                    dbError: insertError
                };
            }

            result = newRecord;
        }

        // Revalidate relevant paths
        revalidatePath('/profile/kyc');
        revalidatePath('/merchant-apply');

        console.log('SERVER ACTION: submitKYC success');
        return {
            success: true,
            data: result,
            message: 'KYC verification submitted successfully. Your request is pending admin approval.'
        };

    } catch (error) {
        console.error('Unexpected error in submitKYC:', error);
        return {
            success: false,
            error: 'An unexpected error occurred. Please try again later.',
            details: error.message
        };
=======
        // ... (Existing Upsert Logic) ...
        // Check existing
        const { data: existing } = await supabase.from('kyc_records').select('id').eq('user_id', user.id).single();

        let result;
        if (existing) {
            const { data: updated, error: updateError } = await supabase
                .from('kyc_records')
                .update(kycRecord)
                .eq('id', existing.id)
                .select().single();
            if (updateError) throw updateError;
            result = updated;
        } else {
            kycRecord.created_at = new Date().toISOString();
            const { data: inserted, error: insertError } = await supabase
                .from('kyc_records')
                .insert(kycRecord)
                .select().single();
            if (insertError) throw insertError;
            result = inserted;
        }

        revalidatePath('/profile/kyc');
        
        const message = isVerified 
            ? 'KYC Verified Successfully via SprintVerify' 
            : `KYC Verification Failed: ${rejectionReason}`;
            
        return { success: true, data: result, message };

    } catch (error) {
        console.error('submitKYC error:', error);
        return { success: false, error: 'Internal Server Error' };
    }
}

/**
 * Standalone PAN Verification Action
 */
export async function verifyPANAction(panNumber) {
    try {
        const result = await sprintVerify.verifyPAN(panNumber);
        return { success: result.valid, message: result.message, data: result.data };
    } catch (error) {
        return { success: false, error: 'Verification service unavailable' };
>>>>>>> origin/yogesh
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
