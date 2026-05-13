import { createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

/**
 * Register a restock notification request
 * POST /api/notify/restock
 * { product_id, inventory_id?, email }
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { product_id, inventory_id, email } = body;

        if (!product_id || !email) {
            return NextResponse.json(
                { error: 'Missing required fields (product_id and email are required)' }, 
                { status: 400 }
            );
        }

        // Validate email format basic
        if (!email.includes('@')) {
             return NextResponse.json(
                { error: 'Invalid email address' }, 
                { status: 400 }
            );
        }

        const admin = createAdminClient();

        const { error } = await admin
            .from('restock_notifications')
            .upsert({
                product_id,
                inventory_id: inventory_id || null,
                email: email.toLowerCase().trim(),
                is_notified: false
            }, { 
                onConflict: 'product_id,inventory_id,email' 
            });

        if (error) {
            console.error('[API] Restock Notification DB Error:', error);
            return NextResponse.json(
                { error: 'Failed to register notification' }, 
                { status: 500 }
            );
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Notification registered successfully! We will email you when this item is back in stock.' 
        });
    } catch (err) {
        console.error('[API] Restock Notification Catch Error:', err);
        return NextResponse.json(
            { error: 'Internal Server Error' }, 
            { status: 500 }
        );
    }
}
