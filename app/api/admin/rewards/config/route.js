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

        // Add Cache-Control headers to ensure we don't serve stale data for configuration
        const response = NextResponse.json({ configs: configs || [] });
        response.headers.set('Cache-Control', 'no-store, max-age=0');
        return response;

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
        
        // Support bulk update with 'configs' array, or single update
        const configsToUpdate = body.configs ? body.configs : [body];

        if (!Array.isArray(configsToUpdate) || configsToUpdate.length === 0) {
            return NextResponse.json({ error: 'Missing configurations to update' }, { status: 400 });
        }

        // Validate structure
        for (const config of configsToUpdate) {
            if (!config.config_key || config.config_value === undefined || !config.config_type) {
                return NextResponse.json({ error: 'Missing required fields in configuration' }, { status: 400 });
            }
        }

        // Fetch old values for history logging
        const keys = configsToUpdate.map(c => c.config_key);
        const { data: oldConfigs } = await supabaseAdmin
            .from('reward_configuration')
            .select('config_key, config_value')
            .in('config_key', keys);
            
        const oldConfigsMap = {};
        if (oldConfigs) {
            oldConfigs.forEach(c => {
                oldConfigsMap[c.config_key] = c.config_value;
            });
        }

        // Upsert all configurations atomically (Supabase RPC or batch upsert)
        const upsertPayload = configsToUpdate.map(config => ({
            config_key: config.config_key,
            config_value: config.config_value,
            config_type: config.config_type,
            description: config.description || '',
            is_active: config.is_active !== undefined ? config.is_active : true,
            created_by: auth.user.id,
            updated_at: new Date().toISOString()
        }));

        const { error: upsertError } = await supabaseAdmin
            .from('reward_configuration')
            .upsert(upsertPayload, { onConflict: 'config_key' });

        if (upsertError) {
            console.error('Error updating reward config:', upsertError);
            return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 });
        }

        // Log to history
        const historyPayload = configsToUpdate.map(config => ({
            config_key: config.config_key,
            old_value: oldConfigsMap[config.config_key] || null,
            new_value: config.config_value,
            changed_by: auth.user.id
        }));

        const { error: historyError } = await supabaseAdmin
            .from('reward_configuration_history')
            .insert(historyPayload);

        if (historyError) {
            console.error('Error writing reward config history:', historyError);
            // Non-fatal, configuration was saved
        }

        return NextResponse.json({ success: true, count: configsToUpdate.length });

    } catch (error) {
        console.error('Admin Reward Config POST Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
