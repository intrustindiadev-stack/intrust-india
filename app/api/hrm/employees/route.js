import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

const HR_ROLES = ['hr', 'hr_manager', 'admin', 'super_admin'];

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

        // 2. Update the user_profiles row that was created by the trigger
        const profileUpdates = {
            ...payload,
            id: undefined, // ensure we don't try to update the id
        };

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
