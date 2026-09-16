import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import { generateEmployeeCode, normalizeEmployeeCode } from '@/lib/hrm/employeeCode';

const HR_ROLES = ['hr', 'hr_manager', 'admin', 'super_admin'];

// Explicit allow-list for profile fields on create. `...payload` spread
// previously let callers write sensitive columns (role, is_suspended,
// reward_*, team_id, ...) straight into user_profiles. `employee_id` is
// NOT on this list — it is auto-generated below (or normalized +
// duplicate-checked if the caller supplied one).
const CREATE_MUTABLE_FIELDS = new Set([
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

/**
 * Try to generate a unique badge code, retrying on 23505 conflicts.
 * Returns the code string, or null if all attempts collide.
 */
async function generateUniqueEmployeeCode(admin, attempts = 10) {
    for (let i = 0; i < attempts; i++) {
        const code = generateEmployeeCode();
        const { data } = await admin
            .from('user_profiles')
            .select('id')
            .eq('employee_id', code)
            .maybeSingle();
        if (!data) return code;
    }
    return null;
}

export async function POST(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!HR_ROLES.includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden. HR Access required.' }, { status: 403 });
        }

        const payload = await request.json();
        
        if (!payload.email || !payload.full_name) {
            return NextResponse.json({ error: 'Email and full_name are required' }, { status: 400 });
        }

        // 1. Create user in Supabase Auth
        const { data: authData, error: authError } = await admin.auth.admin.createUser({
            email: payload.email,
            email_confirm: true,
            password: 'IntrustEmployee123!', // Default password, they can reset it
            user_metadata: {
                full_name: payload.full_name,
                role: payload.role || 'employee'
            }
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
            }
            throw authError;
        }

        const newUserId = authData.user.id;

        // Give the database trigger a moment to create the user_profiles row
        await new Promise(resolve => setTimeout(resolve, 500));

        // Resolve the badge code: caller-supplied -> normalize + dup-check,
        // otherwise auto-generate (retry on collision). Badge is the only
        // code path — never trust caller `role`/sensitive keys via spread.
        const suppliedCode = normalizeEmployeeCode(payload.employee_id);
        let employeeCode = null;
        if (suppliedCode) {
            const { data: dup } = await admin
                .from('user_profiles')
                .select('id')
                .eq('employee_id', suppliedCode)
                .maybeSingle();
            if (dup) {
                return NextResponse.json({ error: 'Duplicate employee code' }, { status: 409 });
            }
            employeeCode = suppliedCode;
        } else {
            employeeCode = await generateUniqueEmployeeCode(admin);
            if (!employeeCode) {
                return NextResponse.json({ error: 'Could not assign a unique employee code, please retry.' }, { status: 500 });
            }
        }

        // 2. Update the user_profiles row that was created by the trigger
        // Whitelisted fields only — `id`/`role`/sensitive keys can never be
        // overwritten via payload spread (previous bug).
        const profileUpdates = { employee_id: employeeCode };
        for (const [key, value] of Object.entries(payload || {})) {
            if (CREATE_MUTABLE_FIELDS.has(key)) profileUpdates[key] = value;
        }

        const { data: profileData, error: profileError } = await admin
            .from('user_profiles')
            .update(profileUpdates)
            .eq('id', newUserId)
            .select()
            .single();

        if (profileError) {
            console.error('[API] Error updating user profile:', profileError);
            // Non-fatal, return the auth user id so they can be fixed later
            return NextResponse.json({ 
                success: true, 
                message: 'User created but profile update failed',
                user: { id: newUserId, email: payload.email, full_name: payload.full_name }
            });
        }

        return NextResponse.json({ success: true, user: profileData });

    } catch (err) {
        console.error('[API] HRM Add Employee Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
