'use server';

/**
 * Admin Server Actions for CRM Lead Assignment & User Role Management
 * 
 * These actions allow admins to:
 * - Fetch sales representatives for assignment dropdowns
 * - Reassign CRM leads to specific reps
 * - Change user roles with safeguards
 * - Fetch paginated users with roles
 * 
 * @module app/actions/admin-crm
 */

import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// ─── Zod Schemas ─────────────────────────────────────────────────────────

const uuidSchema = z.string().uuid('Invalid UUID format');

const VALID_ROLES = [
    'user', 'merchant', 'admin', 'super_admin',
    'hr_manager', 'relationship_exec', 'relationship_manager', 'employee'
];

const updateLeadAssignmentSchema = z.object({
    leadId: uuidSchema,
    newRepId: uuidSchema.nullable(),
});

const updateUserRoleSchema = z.object({
    userId: uuidSchema,
    newRole: z.enum(VALID_ROLES, {
        error: 'Invalid role. Must be one of: ' + VALID_ROLES.join(', ')
    }),
});

const paginationSchema = z.object({
    page: z.number().int().min(1).default(1),
    search: z.string().max(200).default(''),
    limit: z.number().int().min(1).max(100).default(20),
});


// ─── Helper: Verify admin caller ────────────────────────────────────────

async function verifyAdminCaller() {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { error: 'Authentication required', user: null, role: null };
    }

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
        return { error: 'Unauthorized: Admin access required', user, role: null };
    }

    return { error: null, user, role: profile.role, adminClient, supabase };
}


// ─── 1. Fetch Sales Reps ────────────────────────────────────────────────

/**
 * Fetches all users who can be assigned CRM leads
 * (relationship_exec, relationship_manager, admin, super_admin)
 * 
 * @returns {Promise<{data?: Array<{id: string, full_name: string, role: string, email: string}>, error?: string}>}
 */
export async function fetchSalesReps() {
    try {
        const { error, adminClient } = await verifyAdminCaller();
        if (error) return { error };

        const { data, error: queryError } = await adminClient
            .from('user_profiles')
            .select('id, full_name, role, email')
            .in('role', ['relationship_exec', 'relationship_manager', 'admin', 'super_admin'])
            .order('full_name', { ascending: true });

        if (queryError) {
            console.error('[admin-crm] fetchSalesReps error:', queryError);
            return { error: 'Failed to fetch sales representatives' };
        }

        return { data: data || [] };
    } catch (err) {
        console.error('[admin-crm] Unexpected error in fetchSalesReps:', err);
        return { error: 'An unexpected error occurred' };
    }
}


// ─── 2. Update Lead Assignment ──────────────────────────────────────────

/**
 * Reassign a CRM lead to a different representative.
 * Calls the admin_reassign_lead RPC.
 * 
 * @param {string} leadId - UUID of the lead
 * @param {string|null} newRepId - UUID of the new rep, or null to unassign
 * @returns {Promise<{success: boolean, error?: string, message?: string}>}
 */
export async function updateLeadAssignment(leadId, newRepId) {
    try {
        // Validate input
        const parsed = updateLeadAssignmentSchema.safeParse({ leadId, newRepId });
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' };
        }

        const { error: authError, supabase } = await verifyAdminCaller();
        if (authError) return { success: false, error: authError };

        // Call the SECURITY DEFINER RPC using the authenticated user client so auth.uid() is populated
        const { data, error: rpcError } = await supabase
            .rpc('admin_reassign_lead', {
                p_lead_id: parsed.data.leadId,
                p_new_rep_id: parsed.data.newRepId,
            });

        if (rpcError) {
            console.error('[admin-crm] admin_reassign_lead RPC error:', rpcError);
            return { success: false, error: 'Database error: ' + rpcError.message };
        }

        if (!data?.success) {
            return { success: false, error: data?.error || 'Unknown error' };
        }

        revalidatePath('/admin/crm');
        revalidatePath('/crm');

        return { success: true, message: data.message };
    } catch (err) {
        console.error('[admin-crm] Unexpected error in updateLeadAssignment:', err);
        return { success: false, error: 'An unexpected error occurred' };
    }
}


// ─── 3. Update User Role ────────────────────────────────────────────────

/**
 * Change a user's role. Calls the admin_update_user_role RPC.
 * Includes safeguards against self-lockout and super_admin escalation.
 * 
 * @param {string} userId - UUID of the target user
 * @param {string} newRole - New role value
 * @returns {Promise<{success: boolean, error?: string, message?: string}>}
 */
export async function updateUserRole(userId, newRole) {
    try {
        // Validate input
        const parsed = updateUserRoleSchema.safeParse({ userId, newRole });
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' };
        }

        const { error: authError, user, supabase } = await verifyAdminCaller();
        if (authError) return { success: false, error: authError };

        // Extra client-side self-lockout guard (RPC also enforces this)
        if (user.id === parsed.data.userId && !['admin', 'super_admin'].includes(parsed.data.newRole)) {
            return { success: false, error: 'Cannot remove your own admin privileges' };
        }

        // Call the SECURITY DEFINER RPC using the authenticated user client so auth.uid() is populated
        const { data, error: rpcError } = await supabase
            .rpc('admin_update_user_role', {
                p_target_user_id: parsed.data.userId,
                p_new_role: parsed.data.newRole,
            });

        if (rpcError) {
            console.error('[admin-crm] admin_update_user_role RPC error:', rpcError);
            return { success: false, error: 'Database error: ' + rpcError.message };
        }

        if (!data?.success) {
            return { success: false, error: data?.error || 'Unknown error' };
        }

        revalidatePath('/admin/users');
        revalidatePath('/admin');

        return { success: true, message: data.message };
    } catch (err) {
        console.error('[admin-crm] Unexpected error in updateUserRole:', err);
        return { success: false, error: 'An unexpected error occurred' };
    }
}


// ─── 4. Fetch All Users with Roles ──────────────────────────────────────

/**
 * Fetches a paginated list of all users with their roles for the role management UI.
 * 
 * @param {number} page - Page number (1-indexed)
 * @param {string} search - Search term for name/email/phone
 * @param {number} limit - Items per page
 * @returns {Promise<{data?: Array, total?: number, error?: string}>}
 */
export async function fetchAllUsersWithRoles(page = 1, search = '', limit = 20) {
    try {
        const parsed = paginationSchema.safeParse({ page, search, limit });
        if (!parsed.success) {
            return { error: parsed.error.issues[0]?.message || 'Invalid pagination parameters' };
        }

        const { error: authError, adminClient } = await verifyAdminCaller();
        if (authError) return { error: authError };

        const { page: pg, search: srch, limit: lim } = parsed.data;
        const offset = (pg - 1) * lim;

        let query = adminClient
            .from('user_profiles')
            .select('id, full_name, email, phone, role, created_at, avatar_url', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + lim - 1);

        if (srch) {
            query = query.or(`full_name.ilike.%${srch}%,email.ilike.%${srch}%,phone.ilike.%${srch}%`);
        }

        const { data, count, error: queryError } = await query;

        if (queryError) {
            console.error('[admin-crm] fetchAllUsersWithRoles error:', queryError);
            return { error: 'Failed to fetch users' };
        }

        return { data: data || [], total: count || 0 };
    } catch (err) {
        console.error('[admin-crm] Unexpected error in fetchAllUsersWithRoles:', err);
        return { error: 'An unexpected error occurred' };
    }
}


// ─── 5. Fetch All Leads for Assignment ──────────────────────────────────

/**
 * Fetches CRM leads with assignment info for the lead assignment UI.
 * 
 * @param {number} page - Page number (1-indexed)
 * @param {string} search - Search term
 * @param {string} filter - 'all' or 'unassigned'
 * @param {number} limit - Items per page
 * @returns {Promise<{data?: Array, total?: number, error?: string}>}
 */
export async function fetchLeadsForAssignment(page = 1, search = '', filter = 'all', limit = 20) {
    try {
        const { error: authError, adminClient } = await verifyAdminCaller();
        if (authError) return { error: authError };

        const offset = (Math.max(1, page) - 1) * limit;

        let query = adminClient
            .from('crm_leads')
            .select('id, title, contact_name, phone, email, status, assigned_to, created_at, source', { count: 'exact' })
            .is('archived_at', null)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (filter === 'unassigned') {
            query = query.is('assigned_to', null);
        }

        if (search) {
            query = query.or(`contact_name.ilike.%${search}%,title.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
        }

        const { data, count, error: queryError } = await query;

        if (queryError) {
            console.error('[admin-crm] fetchLeadsForAssignment error:', queryError);
            return { error: 'Failed to fetch leads' };
        }

        // Resolve assigned rep names
        const assignedIds = [...new Set((data || []).map(l => l.assigned_to).filter(Boolean))];
        let repMap = {};
        if (assignedIds.length > 0) {
            const { data: profiles } = await adminClient
                .from('user_profiles')
                .select('id, full_name')
                .in('id', assignedIds);
            (profiles || []).forEach(p => { repMap[p.id] = p.full_name; });
        }

        const enriched = (data || []).map(l => ({
            ...l,
            assigned_rep_name: l.assigned_to ? (repMap[l.assigned_to] || 'Unknown') : null,
        }));

        return { data: enriched, total: count || 0 };
    } catch (err) {
        console.error('[admin-crm] Unexpected error in fetchLeadsForAssignment:', err);
        return { error: 'An unexpected error occurred' };
    }
}
