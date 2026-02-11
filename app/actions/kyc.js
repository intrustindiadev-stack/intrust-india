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

/**
 * Submits or updates a KYC record for the authenticated user
 * 
 * @param {FormData | Object} formData - Form data from KYC form
 * @returns {Promise<{success: boolean, error?: string, data?: Object}>} Result object
 */
export async function submitKYC(formData) {
    console.log('SERVER ACTION: submitKYC started');
    try {
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
            fullName: formData.get('fullName'),
            phoneNumber: formData.get('phoneNumber'),
            dateOfBirth: formData.get('dateOfBirth'),
            panNumber: formData.get('panNumber'),
            fullAddress: formData.get('fullAddress'),
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

            updated_at: new Date().toISOString()
        };

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
