import { createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

// GET /api/admin/merchants — returns all merchants with user profile data
export async function GET(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        const admin = createAdminClient();

        let user = null;
        if (token) {
            const { data: { user: tokenUser }, error } = await admin.auth.getUser(token);
            if (!error) user = tokenUser;
        }
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify admin role
        const { data: profile } = await admin
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch all merchants with joined user profile data (service role bypasses all RLS)
        const { data: merchants, error: fetchError } = await admin
            .from('merchants')
            .select(`
                id,
                user_id,
                business_name,
                gst_number,
                status,
                subscription_status,
                subscription_expires_at,
                bank_verified,
                bank_account_number,
                bank_account_name,
                bank_data,
                created_at,
                merchant_udhari_settings(udhari_enabled)
            `)
            .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        // Fetch user profiles separately for all merchants
        const userIds = merchants.map(m => m.user_id).filter(Boolean);
        const { data: profiles } = await admin
            .from('user_profiles')
            .select('id, full_name, phone, email')
            .in('id', userIds);

        const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

        const enriched = merchants.map(m => {
            const mus = m.merchant_udhari_settings && m.merchant_udhari_settings.length > 0 
                ? m.merchant_udhari_settings[0] 
                : (m.merchant_udhari_settings || {});
            
            return {
                ...m,
                user_profiles: profileMap[m.user_id] || null,
                udhari_enabled: mus.udhari_enabled || false,
            };
        });

        return NextResponse.json({ merchants: enriched });
    } catch (err) {
        console.error('[API] Admin Merchants GET Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
