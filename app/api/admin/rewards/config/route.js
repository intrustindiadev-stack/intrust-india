import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

/**
 * Verifies the caller is authenticated and holds admin or super_admin role.
 * Returns { user, profile } on success or a NextResponse error on failure.
 */
async function requireAdmin(request) {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }

    const supabaseAdmin = createAdminClient();
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profileError || !profile || !['admin', 'super_admin'].includes(profile.role)) {
        return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }

    return { user, profile };
}

export async function GET(request) {
    try {
        const auth = await requireAdmin(request);
        if (auth.error) return auth.error;

        const supabaseAdmin = createAdminClient();

        // Get all reward configurations
        const { data: configs, error } = await supabaseAdmin
            .from('reward_configuration')
            .select('*')
            .order('config_type', { ascending: true })
            .order('config_key', { ascending: true });

        if (error) {
            console.error('Error fetching reward config:', error);
            return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 });
        }

        return NextResponse.json({ configs: configs || [] });

    } catch (error) {
        console.error('Admin Reward Config GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const auth = await requireAdmin(request);
        if (auth.error) return auth.error;

        const supabaseAdmin = createAdminClient();
        const body = await request.json();
        const { config_key, config_value, config_type, description, is_active } = body;

        if (!config_key || !config_value || !config_type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get old value for history
        const { data: oldConfig } = await supabaseAdmin
            .from('reward_configuration')
            .select('config_value')
            .eq('config_key', config_key)
            .single();

        // Upsert configuration — created_by comes from the verified session, not request body
        const { data: config, error } = await supabaseAdmin
            .from('reward_configuration')
            .upsert({
                config_key,
                config_value,
                config_type,
                description,
                is_active: is_active !== undefined ? is_active : true,
                created_by: auth.user.id,
                updated_at: new Date().toISOString()
            }, { onConflict: 'config_key' })
            .select()
            .single();

        if (error) {
            console.error('Error updating reward config:', error);
            return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 });
        }

        // Log to history — changed_by comes from the verified session
        await supabaseAdmin
            .from('reward_configuration_history')
            .insert({
                config_key,
                old_value: oldConfig?.config_value || null,
                new_value: config_value,
                changed_by: auth.user.id
            });

        return NextResponse.json({ success: true, config });

    } catch (error) {
        console.error('Admin Reward Config POST Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
