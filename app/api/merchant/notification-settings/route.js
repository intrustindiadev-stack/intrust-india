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
            whatsapp_order_alerts,
            whatsapp_payout_alerts,
            whatsapp_store_credit_alerts,
            whatsapp_kyc_alerts,
            whatsapp_subscription_alerts,
            whatsapp_product_alerts,
            whatsapp_marketing,
        } = body;

        const updates = {
            merchant_id: merchant.id,
            updated_at: new Date().toISOString(),
        };

        if (email_notifications !== undefined) updates.email_notifications = email_notifications;
        if (purchase_notifications !== undefined) updates.purchase_notifications = purchase_notifications;
        if (sale_notifications !== undefined) updates.sale_notifications = sale_notifications;
        if (marketing_updates !== undefined) updates.marketing_updates = marketing_updates;
        
        if (whatsapp_notifications !== undefined) {
            updates.whatsapp_notifications = whatsapp_notifications;
            
            // Fan-out logic for WhatsApp sub-flags
            if (whatsapp_notifications === false) {
                updates.whatsapp_order_alerts = false;
                updates.whatsapp_payout_alerts = false;
                updates.whatsapp_store_credit_alerts = false;
                updates.whatsapp_kyc_alerts = false;
                updates.whatsapp_subscription_alerts = false;
                updates.whatsapp_product_alerts = false;
                updates.whatsapp_marketing = false;
            } else if (whatsapp_notifications === true) {
                updates.whatsapp_order_alerts = true;
                updates.whatsapp_payout_alerts = true;
                updates.whatsapp_store_credit_alerts = true;
                updates.whatsapp_kyc_alerts = true;
                updates.whatsapp_subscription_alerts = true;
                updates.whatsapp_product_alerts = true;
                // Leave whatsapp_marketing unchanged for opt-in
            }
        }

        // Individual toggles override fan-out if provided
        if (whatsapp_order_alerts !== undefined) updates.whatsapp_order_alerts = whatsapp_order_alerts;
        if (whatsapp_payout_alerts !== undefined) updates.whatsapp_payout_alerts = whatsapp_payout_alerts;
        if (whatsapp_store_credit_alerts !== undefined) updates.whatsapp_store_credit_alerts = whatsapp_store_credit_alerts;
        if (whatsapp_kyc_alerts !== undefined) updates.whatsapp_kyc_alerts = whatsapp_kyc_alerts;
        if (whatsapp_subscription_alerts !== undefined) updates.whatsapp_subscription_alerts = whatsapp_subscription_alerts;
        if (whatsapp_product_alerts !== undefined) updates.whatsapp_product_alerts = whatsapp_product_alerts;
        if (whatsapp_marketing !== undefined) updates.whatsapp_marketing = whatsapp_marketing;

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
