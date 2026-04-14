import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify admin role
        if (!['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch merchants (flat query, no nested embeds to avoid PostgREST issues)
        const { data: merchants, error: fetchError } = await admin
            .from('merchants')
            .select('id, business_name, user_id, created_at')
            .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        const merchantIds = merchants.map(m => m.id);

        // Separate flat query for merchant_udhari_settings
        let allSettings = [];
        if (merchantIds.length > 0) {
            const { data: settingsData, error: settingsError } = await admin
                .from('merchant_udhari_settings')
                .select('merchant_id, udhari_enabled, max_credit_limit_paise, max_duration_days')
                .in('merchant_id', merchantIds);
            if (settingsError) {
                console.error('[API] Error fetching merchant_udhari_settings:', settingsError);
            } else {
                allSettings = settingsData || [];
            }
        }

        // Build a lookup map: merchant_id -> settings object
        const settingsMap = {};
        for (const s of allSettings) {
            settingsMap[s.merchant_id] = s;
        }

        // Separate flat query for udhari_requests
        let allRequests = [];
        if (merchantIds.length > 0) {
            const { data: reqData, error: reqError } = await admin
                .from('udhari_requests')
                .select('merchant_id, status, amount_paise')
                .in('merchant_id', merchantIds);
            if (reqError) {
                console.error('[API] Error fetching udhari_requests:', reqError);
            } else {
                allRequests = reqData || [];
            }
        }

        // Build a lookup map: merchant_id -> array of requests
        const requestsMap = {};
        for (const req of allRequests) {
            if (!requestsMap[req.merchant_id]) {
                requestsMap[req.merchant_id] = [];
            }
            requestsMap[req.merchant_id].push(req);
        }

        const enriched = merchants.map(m => {
            const mus = settingsMap[m.id] || {};
            const requests = requestsMap[m.id] || [];

            const pending_count = requests.filter(r => r.status === 'pending').length;
            const approved_count = requests.filter(r => r.status === 'approved').length;
            const completed_count = requests.filter(r => r.status === 'completed').length;
            const expired_count = requests.filter(r => ['expired', 'cancelled'].includes(r.status)).length;

            const total_revenue_paise = requests
                .filter(r => r.status === 'completed')
                .reduce((sum, r) => sum + (r.amount_paise || 0), 0);

            return {
                id: m.id,
                business_name: m.business_name,
                user_id: m.user_id,
                udhari_enabled: mus.udhari_enabled || false,
                max_credit_limit_paise: mus.max_credit_limit_paise || 0,
                max_duration_days: mus.max_duration_days || 0,
                pending_count,
                approved_count,
                completed_count,
                expired_count,
                total_revenue_paise
            };
        });

        return NextResponse.json({ merchants: enriched });
    } catch (err) {
        console.error('[API] Admin Merchants Udhari Overview GET Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
