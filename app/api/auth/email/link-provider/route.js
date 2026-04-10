import { NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabaseServer';

export async function POST(request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
        }

        // Validate the caller is authenticated
        const serverClient = await createServerSupabaseClient();
        const { data: { user }, error: sessionError } = await serverClient.auth.getUser();

        if (sessionError || !user) {
            return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
        }

        // Confirm the email matches the logged-in user's email
        if (user.email?.toLowerCase() !== email.toLowerCase()) {
            return NextResponse.json({ error: 'Email does not match your account.' }, { status: 403 });
        }

        const admin = createAdminClient();

        // Add email+password auth to the existing account
        const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
            password
        });

        if (updateError) {
            console.error('[LINK-PROVIDER] updateUserById error:', updateError);
            return NextResponse.json({ error: 'Failed to link email provider.' }, { status: 500 });
        }

        // Update auth_provider to 'multiple' in user_profiles
        await admin
            .from('user_profiles')
            .update({ auth_provider: 'multiple' })
            .eq('id', user.id);

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error('[LINK-PROVIDER] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
