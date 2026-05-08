import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

// GET — Fetch merchant's notification settings
export async function GET(request) {
    try {
        const supabaseAdmin = createAdminClient();

        const { user } = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
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
            .from('merchant_notification_settings')
            .select('*')
            .eq('merchant_id', merchant.id)
            .maybeSingle();

        // Return settings or defaults
        return NextResponse.json({
            success: true,
            settings: settings || {
                merchant_id: merchant.id,
                email_notifications: true,
                purchase_notifications: true,
                sale_notifications: true,
                marketing_updates: false,
                whatsapp_notifications: true,
            },
        });

    } catch (error) {
        console.error('Notification settings GET error:', error);
        return NextResponse.json({ error: 'An unexpected internal error occurred.' }, { status: 500 });
    }
}

// PATCH — Update merchant's notification settings
export async function PATCH(request) {
    try {
        const supabaseAdmin = createAdminClient();

        const { user } = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
        }

        const { data: merchant } = await supabaseAdmin
            .from('merchants')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (!merchant) {
            return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
        }

        const body = await request.json();
        const {
            email_notifications,
            purchase_notifications,
            sale_notifications,
            marketing_updates,
            whatsapp_notifications,
        } = body;

        const updates = {
            merchant_id: merchant.id,
            updated_at: new Date().toISOString(),
        };

        if (email_notifications !== undefined) updates.email_notifications = email_notifications;
        if (purchase_notifications !== undefined) updates.purchase_notifications = purchase_notifications;
        if (sale_notifications !== undefined) updates.sale_notifications = sale_notifications;
        if (marketing_updates !== undefined) updates.marketing_updates = marketing_updates;
        if (whatsapp_notifications !== undefined) updates.whatsapp_notifications = whatsapp_notifications;

        // Upsert
        const { data, error } = await supabaseAdmin
            .from('merchant_notification_settings')
            .upsert(updates, { onConflict: 'merchant_id' })
            .select()
            .single();

        if (error) {
            console.error('Notification settings upsert error:', error);
            return NextResponse.json({ error: error.message || 'Failed to update settings' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Notification preferences updated successfully.',
            settings: data,
        });

    } catch (error) {
        console.error('Notification settings PATCH error:', error);
        return NextResponse.json({ error: 'An unexpected internal error occurred.' }, { status: 500 });
    }
}
