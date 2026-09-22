import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

const HR_ROLES = ['hr_manager', 'admin', 'super_admin'];

/**
 * Whitelist of fields that HR managers and admins are allowed to update
 * on an employee's user_profiles row via the HRM panel.
 *
 * Verified against production information_schema (44 columns on
 * public.user_profiles). Every entry below EXISTS on the table.
 * Previously-listed fictitious columns (gender, designation,
 * emergency_contact_*, bank_*, salary_structure, salary_monthly,
 * join_date, probation_end_date, selfie_url) do NOT exist and were
 * removed — sending them caused `500 column does not exist`.
 *
 * NOTE: `employee_id` (badge code) is intentionally NOT on this
 * whitelist. It is system-generated (lib/hrm/employeeCode.js) at hire /
 * backfill time and is read-only on the profile page. Allowing free-text
 * edits created duplicates (1100 vs INT003 vs Intrust260727 formats) with
 * no format validation. PATCH requests carrying it get a clear 400.
 *
 * SECURITY NOTE: Sensitive columns (role, kyc_status, is_suspended,
 * suspension_reason, reward_*, team_id, reporting_manager_id, etc.) are
 * protected by the user_profiles_block_sensitive_column_guard DB trigger
 * AND are not on this whitelist (role is handled via a separate
 * admin-only path below). The DB trigger is the authoritative backstop;
 * this whitelist is the first line of defense at the application layer.
 */
const HR_MUTABLE_FIELDS = new Set([
    'full_name',
    'phone',
    'address',
    'avatar_url',
    'date_of_birth',
    'department',
    'blood_group',
    'joining_date',
    'employment_type',
    'city',
    'state',
    'base_salary',
]);

// Authoritative user_role enum values (verified via pg_enum on prod).
// NOTE: 'inactive' is offered by the UI but is NOT a valid user_role enum
// value — deactivation must go through suspension/termination, not a role
// update. Requests for it are rejected with a clear 400.
const VALID_ROLES = new Set([
    'user',
    'admin',
    'merchant',
    'super_admin',
    'sales_exec',
    'sales_manager',
    'employee',
    'hr_manager',
    'relationship_exec',
    'relationship_manager',
    'freelancer',
    'video_editor',
    'social_media_manager',
    'seo_specialist',
    'advertiser',
    'support_agent',
]);

const ADMIN_ROLES = ['admin', 'super_admin'];

/**
 * PATCH /api/hrm/employees/[id]
 *
 * Secure server-side employee profile update endpoint.
 * Replaces the direct `supabase.from('user_profiles').update(form)` call
 * in app/(hrm)/hrm/employees/[id]/page.jsx
 *
 * Authorization:
 *   - Caller must be authenticated with role: hr_manager, admin, or super_admin
 *   - Only fields on the HR_MUTABLE_FIELDS whitelist can be updated
 *   - `role` changes require admin/super_admin and go through the
 *     admin_update_user_role RPC (keeps auth.users metadata in sync).
 *     hr_manager callers get 403 for role changes only.
 */
export async function PATCH(request, { params }) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!HR_ROLES.includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden. HR access required.' }, { status: 403 });
        }

        // Next.js 15+: route params are async and MUST be awaited.
        // `params.id` without await is `undefined` (Promise has no .id) —
        // this was the P0 "Missing employee ID" bug on every save.
        const { id: targetUserId } = await params;
        if (!targetUserId) {
            return NextResponse.json({ error: 'Missing employee route ID' }, { status: 400 });
        }

        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!UUID_RE.test(targetUserId)) {
            return NextResponse.json({ error: 'Invalid employee ID format' }, { status: 400 });
        }

        // Verify target user exists
        const { data: targetProfile, error: targetError } = await admin
            .from('user_profiles')
            .select('id, role')
            .eq('id', targetUserId)
            .single();

        if (targetError || !targetProfile) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        const body = await request.json();

        // `role` is NOT on HR_MUTABLE_FIELDS. Handle it via the
        // admin_update_user_role RPC (syncs auth.users + audit trail).
        // IMPORTANT: that RPC resolves the caller via auth.uid(), which is
        // only populated on the *authenticated-user* client (service-role
        // calls run with auth.uid() = NULL and fail closed with
        // "Authentication required"). So build a user-scoped client from
        // the caller's Bearer JWT — the established pattern in
        // app/actions/admin-crm.js (verifyAdminCaller -> supabase.rpc).
        // API-layer checks below (admin-only, no self-demotion, enum,
        // super_admin grant) run first; the RPC re-validates as backstop.
        let roleResult = null;
        if (body.role !== undefined && body.role !== null && body.role !== '' && body.role !== targetProfile.role) {
            if (!ADMIN_ROLES.includes(profile?.role)) {
                return NextResponse.json({ error: 'Forbidden. Only admins can change roles.' }, { status: 403 });
            }
            if (user.id === targetUserId) {
                return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 });
            }
            if (!VALID_ROLES.has(body.role)) {
                return NextResponse.json({ error: `Invalid role: ${body.role}` }, { status: 400 });
            }
            if (body.role === 'super_admin' && profile?.role !== 'super_admin') {
                return NextResponse.json({ error: 'Only super admins can grant super_admin' }, { status: 403 });
            }
            const bearer = request.headers.get('Authorization')?.slice(7) || request.headers.get('authorization')?.slice(7) || '';
            const { createClient } = await import('@supabase/supabase-js');
            const roleClient = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                {
                    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
                    global: { headers: { Authorization: `Bearer ${bearer}` } },
                }
            );
            const { data: rpcData, error: rpcError } = await roleClient.rpc('admin_update_user_role', {
                p_target_user_id: targetUserId,
                p_new_role: body.role,
            });
            if (rpcError) {
                console.error('[API] HRM employee role update error:', rpcError);
                return NextResponse.json({ error: rpcError.message }, { status: 500 });
            }
            if (rpcData && rpcData.success === false) {
                return NextResponse.json({ error: rpcData.error || 'Role update failed' }, { status: 403 });
            }
            roleResult = rpcData;
        }

        // `employee_id` badge is system-generated + read-only (see whitelist
        // note). Reject explicit attempts so callers get a clear message
        // instead of a silent drop. Identical no-op values are allowed so
        // stale clients re-sending the current code don't 400.
        if (body.employee_id !== undefined && body.employee_id !== null && String(body.employee_id).trim() !== '') {
            const incoming = String(body.employee_id).trim();
            if (incoming !== String(targetProfile.employee_id || '').trim()) {
                return NextResponse.json({ error: 'Employee code is system-generated and cannot be edited.' }, { status: 400 });
            }
        }

        // Filter to only HR-mutable fields
        const sanitizedUpdates = {};
        for (const [key, value] of Object.entries(body)) {
            if (HR_MUTABLE_FIELDS.has(key)) {
                sanitizedUpdates[key] = value;
            }
        }

        // Normalize "" for typed columns (date/int reject empty string).
        for (const dateKey of ['date_of_birth', 'joining_date']) {
            if (sanitizedUpdates[dateKey] === '') sanitizedUpdates[dateKey] = null;
        }
        if (sanitizedUpdates.base_salary === '') sanitizedUpdates.base_salary = null;
        if (typeof sanitizedUpdates.base_salary === 'string' && sanitizedUpdates.base_salary !== null) {
            const n = Number(sanitizedUpdates.base_salary);
            sanitizedUpdates.base_salary = Number.isFinite(n) ? Math.trunc(n) : null;
        }

        let updatedProfile = null;
        if (Object.keys(sanitizedUpdates).length > 0) {
            sanitizedUpdates.updated_at = new Date().toISOString();

            const { data, error: updateError } = await admin
                .from('user_profiles')
                .update(sanitizedUpdates)
                .eq('id', targetUserId)
                .select()
                .single();

            if (updateError) {
                console.error('[API] HRM employee profile update error:', updateError);
                return NextResponse.json({ error: updateError.message }, { status: 500 });
            }
            updatedProfile = data;
        }

        if (!updatedProfile && !roleResult) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        // Role-only change: re-read the row so the response is fresh.
        if (!updatedProfile) {
            const { data } = await admin
                .from('user_profiles')
                .select('*')
                .eq('id', targetUserId)
                .single();
            updatedProfile = data || null;
        }

        // Audit log (non-blocking; table verified to exist on prod)
        const auditedFields = { ...sanitizedUpdates };
        if (roleResult) auditedFields.role = body.role;
        await admin.from('audit_logs_hrm').insert({
            actor_id: user.id,
            actor_name: profile?.full_name || 'HR Manager',
            action: roleResult ? 'Employee profile + role updated via secure API' : 'Employee profile updated via secure API',
            table_name: 'user_profiles',
            record_id: targetUserId,
            new_data: auditedFields,
            module: 'Core HR',
            severity: 'low',
        }).then(({ error: auditErr }) => {
            if (auditErr) console.warn('[API] HRM audit log failed:', auditErr);
        });

        return NextResponse.json({ success: true, profile: updatedProfile });

    } catch (err) {
        console.error('[API] HRM PATCH employee error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
