import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// GET — Fetch merchant's udhari settings
export async function GET(request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
        if (userError || !user) {
            return NextResponse.json({ error: 'Invalid token or user not found' }, { status: 401 });
        }

        const { data: merchant } = await supabaseAdmin
            .from('merchants')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (!merchant) {
            return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
        }

        const { data: settings } = await supabaseAdmin
            .from('merchant_udhari_settings')
            .select('*')
            .eq('merchant_id', merchant.id)
            .maybeSingle();

        // Return settings or defaults
        return NextResponse.json({
            success: true,
            settings: settings || {
                merchant_id: merchant.id,
                udhari_enabled: false,
                max_credit_limit_paise: 500000,
                max_duration_days: 15,
                min_customer_age_years: 0,
            },
        });

    } catch (error) {
        console.error('Udhari settings GET error:', error);
        return NextResponse.json({ error: 'An unexpected internal error occurred.' }, { status: 500 });
    }
}

// PATCH — Update merchant's udhari settings
export async function PATCH(request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
        if (userError || !user) {
            return NextResponse.json({ error: 'Invalid token or user not found' }, { status: 401 });
        }

        const { data: merchant } = await supabaseAdmin
            .from('merchants')
            .select('id, status')
            .eq('user_id', user.id)
            .single();

        if (!merchant || merchant.status !== 'approved') {
            return NextResponse.json({ error: 'Approved merchant access required' }, { status: 403 });
        }

        const body = await request.json();
        const {
            udhari_enabled,
            max_credit_limit_paise,
            max_duration_days,
            min_customer_age_years,
        } = body;

        // Validate
        if (max_duration_days !== undefined && ![5, 10, 15].includes(max_duration_days)) {
            return NextResponse.json({ error: 'max_duration_days must be 5, 10, or 15' }, { status: 400 });
        }

        if (max_credit_limit_paise !== undefined && max_credit_limit_paise < 0) {
            return NextResponse.json({ error: 'max_credit_limit_paise must be positive' }, { status: 400 });
        }

        const updates = {
            merchant_id: merchant.id,
            updated_at: new Date().toISOString(),
        };

        if (udhari_enabled !== undefined) updates.udhari_enabled = udhari_enabled;
        if (max_credit_limit_paise !== undefined) updates.max_credit_limit_paise = max_credit_limit_paise;
        if (max_duration_days !== undefined) updates.max_duration_days = max_duration_days;
        if (min_customer_age_years !== undefined) updates.min_customer_age_years = min_customer_age_years;

        // Upsert
        const { data, error } = await supabaseAdmin
            .from('merchant_udhari_settings')
            .upsert(updates, { onConflict: 'merchant_id' })
            .select()
            .single();

        if (error) {
            console.error('Udhari settings upsert error:', error);
            return NextResponse.json({ error: error.message || 'Failed to update settings' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Udhari settings updated successfully.',
            settings: data,
        });

    } catch (error) {
        console.error('Udhari settings PATCH error:', error);
        return NextResponse.json({ error: 'An unexpected internal error occurred.' }, { status: 500 });
    }
}
