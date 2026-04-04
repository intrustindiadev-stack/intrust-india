import { createAdminClient } from '@/lib/supabaseServer';

export async function getAuthUser(request) {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const admin = createAdminClient();

    if (!token) return { user: null, profile: null, admin };

    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return { user: null, profile: null, admin };

    const { data: profile } = await admin
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    return { user, profile, admin };
}
