import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

const HR_ROLES = ['hr_manager', 'admin', 'super_admin'];

/**
 * Whitelist of fields that HR managers and admins are allowed to update
 * on an employee's user_profiles row via the HRM panel.
 *
 * SECURITY NOTE: Sensitive columns (role, kyc_status, is_suspended,
 * is_active, reward_*, etc.) are protected by the
 * user_profiles_sensitive_column_guard DB trigger AND are not on this
 * whitelist. The DB trigger is the authoritative backstop; this whitelist
 * is the first line of defense at the application layer.
 */
const HR_MUTABLE_FIELDS = new Set([
    'full_name',
    'phone',
    'address',
    'avatar_url',
    'date_of_birth',
    'gender',
    'designation',
    'department',
    'blood_group',
    'emergency_contact_name',
    'emergency_contact_phone',
    'bank_account_number',
    'bank_ifsc_code',
    'bank_account_name',
    'bank_name',
    'salary_structure',
    'salary_monthly',
    'join_date',
    'probation_end_date',
    'selfie_url',
]);

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
 *   - Sensitive fields (role, is_active, kyc_status, etc.) are never updated
 *     by this endpoint
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

        const targetUserId = params.id;
        if (!targetUserId) {
            return NextResponse.json({ error: 'Missing employee ID' }, { status: 400 });
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

        // Filter to only HR-mutable fields
        const sanitizedUpdates = {};
        for (const [key, value] of Object.entries(body)) {
            if (HR_MUTABLE_FIELDS.has(key)) {
                sanitizedUpdates[key] = value;
            }
        }

        if (Object.keys(sanitizedUpdates).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        sanitizedUpdates.updated_at = new Date().toISOString();

        const { data: updatedProfile, error: updateError } = await admin
            .from('user_profiles')
            .update(sanitizedUpdates)
            .eq('id', targetUserId)
            .select()
            .single();

        if (updateError) {
            console.error('[API] HRM employee profile update error:', updateError);
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // Audit log
        await admin.from('audit_logs_hrm').insert({
            actor_id: user.id,
            actor_name: profile?.full_name || 'HR Manager',
            action: 'Employee profile updated via secure API',
            table_name: 'user_profiles',
            record_id: targetUserId,
            new_data: sanitizedUpdates,
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
