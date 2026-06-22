'use server';

import { createAdminClient } from '@/lib/supabaseServer';
import { PLATFORM_CONFIG } from '@/lib/config/platform';
import { validatePricingSettings } from '@/lib/pricing/validate';

export async function getAdminSettings() {
    try {
        const adminClient = createAdminClient();
        const { data, error } = await adminClient
            .from('platform_settings')
            .select('key, value');

        if (error) {
            console.error('Error fetching admin settings:', error);
            return PLATFORM_CONFIG; // fallback
        }

        const settingsMap = data.reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {});

        return settingsMap;
    } catch (err) {
        console.error('getAdminSettings caught error:', err);
        return PLATFORM_CONFIG;
    }
}

export async function updateAdminSettings(settingsObject) {
    try {
        const adminClient = createAdminClient();
        
        if (settingsObject.merchant_sub_price_1m !== undefined) {
            const pricingObj = {
                sub1m: Number(settingsObject.merchant_sub_price_1m),
                sub6m: Number(settingsObject.merchant_sub_price_6m),
                sub12m: Number(settingsObject.merchant_sub_price_12m),
                autoFirst: Number(settingsObject.auto_mode_price_first),
                autoRenewal: Number(settingsObject.auto_mode_price_renewal),
                merchantReferralPrize: Number(settingsObject.merchant_referral_prize_paise) / 100
            };
            const errorMsg = validatePricingSettings(pricingObj);
            if (errorMsg) return { success: false, error: errorMsg };
        }

        // Convert the simple object map into an array of rows to upsert
        const rows = Object.entries(settingsObject).map(([key, value]) => ({
            key,
            value,
            updated_at: new Date().toISOString()
        }));

        const { error } = await adminClient
            .from('platform_settings')
            .upsert(rows, { onConflict: 'key' });

        if (error) {
            console.error('Error updating admin settings:', error);
            return { success: false, error: error.message };
        }
        return { success: true };
    } catch (err) {
        console.error('updateAdminSettings caught error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Fetches the five dynamic pricing keys from platform_settings.
 * Falls back to current hardcoded values if keys are absent.
 */
export async function getPricingSettings() {
    try {
        const adminClient = createAdminClient();
        const { data, error } = await adminClient
            .from('platform_settings')
            .select('key, value')
            .in('key', [
                'merchant_sub_price_1m',
                'merchant_sub_price_6m',
                'merchant_sub_price_12m',
                'auto_mode_price_first',
                'auto_mode_price_renewal',
                'merchant_referral_prize_paise',
            ]);

        if (error) {
            console.error('Error fetching pricing settings:', error);
        }

        const map = (data || []).reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {});

        const parsePrice = (val, fallback) => {
            if (val == null || val === '') return fallback;
            const num = Number(val);
            return Number.isFinite(num) ? num : fallback;
        };

        return {
            sub1m:                 parsePrice(map['merchant_sub_price_1m'], 499),
            sub6m:                 parsePrice(map['merchant_sub_price_6m'], 1999),
            sub12m:                parsePrice(map['merchant_sub_price_12m'], 3999),
            autoFirst:             parsePrice(map['auto_mode_price_first'], 999),
            autoRenewal:           parsePrice(map['auto_mode_price_renewal'], 1999),
            merchantReferralPrize: parsePrice(map['merchant_referral_prize_paise'], 50000) / 100,
        };
    } catch (err) {
        console.error('getPricingSettings caught error:', err);
        return { sub1m: 499, sub6m: 1999, sub12m: 3999, autoFirst: 999, autoRenewal: 1999, merchantReferralPrize: 500 };
    }
}
