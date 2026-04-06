import 'server-only';
import { createAdminClient } from "@/lib/supabaseServer";
import { PLATFORM_CONFIG } from "./platform";

/**
 * Fetches dynamic platform settings from the database.
 * Falls back to environment variables / hardcoded defaults if DB fetch fails.
 * 
 * @returns {Promise<Object>}
 */
export const getPlatformConfig = async () => {
    try {
        const supabase = createAdminClient();
        const { data: settings, error } = await supabase
            .from('platform_settings')
            .select('key, value');

        if (error || !settings) {
            console.warn('[PlatformConfig] Database fetch failed, using environment fallbacks:', error);
            return PLATFORM_CONFIG;
        }

        // Map settings array to key:value object
        const dbConfig = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});

        return {
            business: {
                name: dbConfig.business_name || PLATFORM_CONFIG.business.name,
                address: dbConfig.business_address || PLATFORM_CONFIG.business.address,
                phone: dbConfig.business_phone || PLATFORM_CONFIG.business.phone,
                gstin: dbConfig.business_gstin || PLATFORM_CONFIG.business.gstin,
                pan: dbConfig.business_pan || PLATFORM_CONFIG.business.pan,
                website: dbConfig.business_website || PLATFORM_CONFIG.business.website,
                email: dbConfig.business_email || PLATFORM_CONFIG.business.email
            }
        };
    } catch (err) {
        console.error('[PlatformConfig] Unexpected error during fetch:', err);
        return PLATFORM_CONFIG;
    }
};
