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
            .select('user_id, status')
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
                const { error: roleError } = await adminSupabase
                    .from('user_profiles')
                    .update({ role: newRole })
                    .eq('id', app.user_id);
                
                if (roleError) {
                    console.error('Error assigning role:', roleError);
                    return NextResponse.json({ error: 'Failed to assign role.' }, { status: 500 });
                }

                // Sync user_metadata.role so the JWT carries the correct role on next token refresh.
                // Without this, the middleware reads a stale role from the JWT and blocks routes.
                try {
                    const { data: existingAuthUser } = await adminSupabase.auth.admin.getUserById(app.user_id);
                    await adminSupabase.auth.admin.updateUserById(app.user_id, {
                        user_metadata: {
                            ...existingAuthUser?.user?.user_metadata,
                            role: newRole,
                        },
                    });
                } catch (metaErr) {
                    console.error('[grant-hire-role] Failed to sync user_metadata.role:', metaErr.message);
                }

                // Notify the hired user
                await adminSupabase.from('notifications').insert({
                    user_id: app.user_id,
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
