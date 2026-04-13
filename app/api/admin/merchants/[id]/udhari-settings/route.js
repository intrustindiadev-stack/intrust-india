import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    try {
        const merchantId = params.id;
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify admin role
        if (!['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { data: settings, error } = await admin
            .from('merchant_udhari_settings')
            .select('*')
            .eq('merchant_id', merchantId)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        return NextResponse.json({ settings: settings || null });
    } catch (err) {
        console.error('[API] Admin Merchant Udhari Settings GET Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request, { params }) {
    try {
        const merchantId = params.id;
        const body = await request.json();
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify admin role
        if (!['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Validate max_duration_days against schema-allowed values
        const allowedDurations = [5, 10, 15];
        const durationDays = body.max_duration_days !== undefined ? body.max_duration_days : 15;
        if (!allowedDurations.includes(durationDays)) {
            return NextResponse.json(
                { error: `max_duration_days must be one of: ${allowedDurations.join(', ')}` },
                { status: 400 }
            );
        }

        // Upsert settings
        const upsertData = {
            merchant_id: merchantId,
            udhari_enabled: body.udhari_enabled !== undefined ? body.udhari_enabled : false,
            max_credit_limit_paise: body.max_credit_limit_paise !== undefined ? body.max_credit_limit_paise : 500000,
            extra_fee_paise: body.extra_fee_paise !== undefined ? body.extra_fee_paise : 0,
            max_duration_days: durationDays,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await admin
            .from('merchant_udhari_settings')
            .upsert(upsertData, { onConflict: 'merchant_id' })
            .select()
            .single();

        if (error) throw error;

        // Log admin action (optional)
        await admin.from('audit_logs').insert([{
            admin_id: user.id,
            action: 'update_merchant_udhari_settings',
            entity_type: 'merchant',
            entity_id: merchantId,
            metadata: { new_settings: upsertData }
        }]);

        return NextResponse.json({ settings: data });
    } catch (err) {
        console.error('[API] Admin Merchant Udhari Settings PATCH Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
