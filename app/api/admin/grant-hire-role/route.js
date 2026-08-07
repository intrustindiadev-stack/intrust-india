import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const adminSupabase = createAdminClient();

        // 1. Verify Authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
        }

        // 2. Verify Admin Role
        const { data: userProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !['admin', 'super_admin'].includes(userProfile?.role)) {
            return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        // 3. Get Request Data
        const body = await request.json();
        const { applicationId, panelAccess } = body;

        if (!applicationId) {
            return NextResponse.json({ error: 'Missing applicationId.' }, { status: 400 });
        }

        // 4. Fetch the application
        const { data: app, error: appError } = await adminSupabase
            .from('career_applications')
            .select('user_id, status, full_name, email, phone')
            .eq('id', applicationId)
            .single();

        if (appError || !app) {
            return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
        }

        // 5. If panelAccess is provided, map it to a role
        if (panelAccess && app.user_id) {
            const roleMap = {
                'relationship_manager': 'relationship_manager',
                'relationship_exec': 'relationship_exec',
                'crm': 'relationship_exec', // legacy fallback
                'employee': 'employee',
                'freelancer': 'freelancer',
                'video_editor': 'video_editor',
                'social_media_manager': 'social_media_manager',
                'seo_specialist': 'seo_specialist',
                'advertiser': 'advertiser',
                'support_agent': 'support_agent'
            };
            const newRole = roleMap[panelAccess];
            
            if (newRole) {
                // Ensure the user actually exists in auth.users (they might have been deleted)
                const { data: existingAuthUser, error: authCheckError } = await adminSupabase.auth.admin.getUserById(app.user_id);
                
                let targetUserId = app.user_id;

                if (authCheckError || !existingAuthUser?.user) {
                    // User is missing in auth.users! We need to create an account for them.
                    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
                        email: app.email,
                        phone: app.phone,
                        password: Math.random().toString(36).slice(-8) + 'A1!', // random temp password
                        email_confirm: true,
                        user_metadata: { full_name: app.full_name, role: newRole }
                    });

                    // If creating with phone fails (e.g. phone already used), try without phone
                    if (createError && createError.message.toLowerCase().includes('phone')) {
                        const { data: newUserFallback, error: fallbackError } = await adminSupabase.auth.admin.createUser({
                            email: app.email,
                            password: Math.random().toString(36).slice(-8) + 'A1!',
                            email_confirm: true,
                            user_metadata: { full_name: app.full_name, role: newRole }
                        });
                        if (fallbackError) {
                            return NextResponse.json({ error: `Failed to recreate auth user: ${fallbackError.message}` }, { status: 500 });
                        }
                        targetUserId = newUserFallback.user.id;
                    } else if (createError) {
                        // If it fails for another reason, we might just be dealing with an email conflict
                        // but let's try to proceed without creating a new user if it's already there (shouldn't happen)
                        return NextResponse.json({ error: `Failed to recreate auth user: ${createError.message}` }, { status: 500 });
                    } else {
                        targetUserId = newUser.user.id;
                    }

                    // Update the application with the new user_id so future references point to the right account
                    await adminSupabase.from('career_applications').update({ user_id: targetUserId }).eq('id', applicationId);
                }

                // Upsert the user profile to guarantee they can login even if the auth trigger failed
                let payload = {
                    id: targetUserId,
                    full_name: app.full_name || 'New Hire',
                    email: app.email,
                    phone: app.phone,
                    role: newRole,
                    updated_at: new Date().toISOString()
                };

                let { error: roleError } = await adminSupabase
                    .from('user_profiles')
                    .upsert(payload, { onConflict: 'id' });
                
                // If the applicant's phone number is already associated with another account in user_profiles,
                // the upsert will fail with a unique constraint violation on the phone index.
                // In this case, we retry the upsert without the phone field to ensure they still get their role.
                if (roleError && roleError.message.includes('user_profiles_normalized_phone_idx')) {
                    delete payload.phone;
                    const { error: retryError } = await adminSupabase
                        .from('user_profiles')
                        .upsert(payload, { onConflict: 'id' });
                    roleError = retryError;
                }
                
                if (roleError) {
                    console.error('Error assigning role:', roleError);
                    return NextResponse.json({ error: `Failed to assign role: ${roleError.message}` }, { status: 500 });
                }

                // Sync user_metadata.role so the JWT carries the correct role on next token refresh.
                // Without this, the middleware reads a stale role from the JWT and blocks routes.
                try {
                    const { data: finalAuthUser } = await adminSupabase.auth.admin.getUserById(targetUserId);
                    await adminSupabase.auth.admin.updateUserById(targetUserId, {
                        user_metadata: {
                            ...finalAuthUser?.user?.user_metadata,
                            role: newRole,
                        },
                    });
                } catch (metaErr) {
                    console.error('[grant-hire-role] Failed to sync user_metadata.role:', metaErr.message);
                }

                // Notify the hired user
                await adminSupabase.from('notifications').insert({
                    user_id: targetUserId,
                    title: 'Role Access Granted 🎉',
                    body: `Your account has been granted access to the ${panelAccess} panel. You can now log in.`,
                    type: 'success',
                    reference_type: 'role_granted',
                    read: false
                });
            }
        }

        // 6. Mark access granted in career_applications
        const { error: accessError } = await adminSupabase
            .from('career_applications')
            .update({ access_granted_at: new Date().toISOString() })
            .eq('id', applicationId);

        if (accessError) {
            console.error('Error updating access_granted_at:', accessError);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Unexpected error in grant-hire-role:', error);
        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
    }
}
