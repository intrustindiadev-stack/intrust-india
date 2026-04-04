'use server';

/**
 * Admin Server Actions for KYC Approval/Rejection
 * 
 * These actions allow admins to approve or reject pending KYC records
 * with proper tracking of who approved/rejected and when.
 * 
 * @module app/actions/admin-kyc
 */

import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

/**
 * Approves a pending KYC record
 * 
 * @param {string} kycId - UUID of the KYC record to approve
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function approveKYC(kycId) {
    try {
        const supabase = await createServerSupabaseClient();

        // Get authenticated admin user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return {
                success: false,
                error: 'You must be logged in as an admin to approve KYC'
            };
        }

        const adminClient = createAdminClient();

        console.log("Checking admin status for user:", user.id);
        // Verify user is an admin
        const { data: adminCheck, error: adminErr } = await adminClient
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        console.log("Admin check result:", adminCheck, adminErr);

        if (!adminCheck || !['admin', 'super_admin'].includes(adminCheck?.role)) {
            return {
                success: false,
                error: 'Unauthorized: Admin access required'
            };
        }

        // Ensure the record has a sprint_verify_ref_id to satisfy the automated_review_consistency constraint
        const { data: existingRecord } = await adminClient
            .from('kyc_records')
            .select('sprint_verify_ref_id')
            .eq('id', kycId)
            .single();

        const fallbackRefId = existingRecord?.sprint_verify_ref_id || `MANUAL_APPROVAL_${user.id}`;

        // Update KYC record — only if currently pending
        const { data, error: updateError } = await adminClient
            .from('kyc_records')
            .update({
                verification_status: 'verified',
                status: 'verified',
                verified_by: user.id,
                verified_at: new Date().toISOString(),
                sprint_verify_ref_id: fallbackRefId,
                updated_at: new Date().toISOString()
            })
            .eq('id', kycId)
            .eq('verification_status', 'pending')
            .select()
            .single();

        if (updateError) {
            console.error('Error approving KYC:', updateError);
            return {
                success: false,
                error: 'Failed to approve KYC. It may have already been processed.'
            };
        }

        if (!data) {
            return {
                success: false,
                error: 'KYC record not found or already processed'
            };
        }

        // Sync kyc_status on user_profiles
        await adminClient
            .from('user_profiles')
            .update({ kyc_status: 'verified' })
            .eq('id', data.user_id);

        revalidatePath('/admin/users');

        return {
            success: true,
            message: 'KYC approved successfully'
        };

    } catch (error) {
        console.error('Unexpected error in approveKYC:', error);
        return {
            success: false,
            error: 'An unexpected error occurred while approving KYC'
        };
    }
}

/**
 * Rejects a pending KYC record with a reason
 * 
 * @param {string} kycId - UUID of the KYC record to reject
 * @param {string} reason - Reason for rejection (required)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function rejectKYC(kycId, reason) {
    try {
        if (!reason || reason.trim().length === 0) {
            return { success: false, error: 'Rejection reason is required' };
        }

        const supabase = await createServerSupabaseClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return { success: false, error: 'You must be logged in as an admin to reject KYC' };
        }

        // Use admin client to bypass RLS
        const adminClient = createAdminClient();

        const { data: adminCheck } = await adminClient
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!adminCheck || !['admin', 'super_admin'].includes(adminCheck?.role)) {
            return { success: false, error: 'Unauthorized: Admin access required' };
        }

        const { data, error: updateError } = await adminClient
            .from('kyc_records')
            .update({
                verification_status: 'rejected',
                status: 'rejected',
                rejection_reason: reason.trim(),
                verified_by: user.id,
                verified_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', kycId)
            .eq('verification_status', 'pending')
            .select()
            .single();

        if (updateError) {
            console.error('Error rejecting KYC:', updateError);
            return { success: false, error: 'Failed to reject KYC. It may have already been processed.' };
        }

        if (!data) {
            return { success: false, error: 'KYC record not found or already processed' };
        }

        await adminClient
            .from('user_profiles')
            .update({ kyc_status: 'rejected' })
            .eq('id', data.user_id);

        revalidatePath('/admin/users');

        return { success: true, message: 'KYC rejected successfully' };

    } catch (error) {
        console.error('Unexpected error in rejectKYC:', error);
        return { success: false, error: 'An unexpected error occurred while rejecting KYC' };
    }
}

/**
 * Fetches a single KYC record with user details (admin only)
 * 
 * @param {string} userId - UUID of the user whose KYC to fetch
 * @returns {Promise<{data?: Object, error?: string}>}
 */
export async function getKYCForAdmin(userId) {
    try {
        const supabase = await createServerSupabaseClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { error: 'Authentication required' };

        const adminClient = createAdminClient();

        const { data: adminCheck } = await adminClient
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!adminCheck || !['admin', 'super_admin'].includes(adminCheck?.role)) return { error: 'Unauthorized: Admin access required' };

        const { data, error } = await adminClient
            .from('kyc_records')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return { data: null };
            console.error('Error fetching KYC:', error);
            return { error: 'Failed to fetch KYC record' };
        }

        return { data };

    } catch (error) {
        console.error('Unexpected error in getKYCForAdmin:', error);
        return { error: 'An unexpected error occurred' };
    }
}
