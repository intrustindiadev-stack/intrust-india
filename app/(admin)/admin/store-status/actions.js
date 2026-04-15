'use server';

import { createAdminClient } from '@/lib/supabaseServer';

export async function getPlatformStoreSettings() {
    try {
        const adminClient = createAdminClient();
        const { data, error } = await adminClient
            .from('platform_settings')
            .select('value')
            .eq('key', 'platform_store')
            .single();

        if (error) {
            console.error('Error fetching platform_settings:', error);
            return { value: null };
        }
        let parsedValue = null;
        if (data?.value) {
            try {
                parsedValue = JSON.parse(data.value);
            } catch (e) {
                // Not JSON or empty
            }
        }
        return { value: parsedValue };
    } catch (err) {
        console.error('getPlatformStoreSettings caught error:', err);
        return { value: null };
    }
}

export async function updatePlatformStoreSettings(newSettings) {
    try {
        const adminClient = createAdminClient();
        const { error } = await adminClient
            .from('platform_settings')
            .upsert({ key: 'platform_store', value: JSON.stringify(newSettings) }, { onConflict: 'key' });

        if (error) {
            console.error('Error updating platform_settings:', error);
            return { success: false, error: error.message };
        }
        return { success: true };
    } catch (err) {
        console.error('updatePlatformStoreSettings caught error:', err);
        return { success: false, error: err.message };
    }
}
