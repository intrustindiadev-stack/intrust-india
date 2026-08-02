import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/whatsapp/webhook
 * 
 * Receives delivery status webhooks from WhatsApp provider (Omniflow / Meta).
 * Expects JSON payload:
 * {
 *   provider_message_id?: string,
 *   wamid?: string,
 *   status: 'sent' | 'delivered' | 'read' | 'failed',
 *   error_code?: string,
 *   error_message?: string
 * }
 */
export async function POST(request) {
    try {
        // Optional secret validation
        const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
        if (webhookSecret) {
            const authHeader = request.headers.get('x-webhook-secret') || request.headers.get('authorization');
            if (authHeader !== webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
                return NextResponse.json(
                    { error: { type: 'unauthorized', message: 'Invalid webhook signature or token.' } },
                    { status: 401 }
                );
            }
        }

        const body = await request.json().catch(() => ({}));
        const messageId = body.provider_message_id || body.wamid || body.id || body?.statuses?.[0]?.id;
        let newStatus = (body.status || body?.statuses?.[0]?.status || '').toLowerCase();
        const errorCode = body.error_code || body?.statuses?.[0]?.errors?.[0]?.code || null;
        const errorMessage = body.error_message || body?.statuses?.[0]?.errors?.[0]?.title || body?.statuses?.[0]?.errors?.[0]?.message || null;

        if (!messageId) {
            return NextResponse.json(
                { error: { type: 'validation_error', message: 'provider_message_id or wamid is required.' } },
                { status: 400 }
            );
        }

        // Map status to internal standard
        const statusMap = {
            sent: 'sent',
            delivered: 'delivered',
            read: 'read',
            failed: 'failed',
            undelivered: 'failed'
        };

        const mappedStatus = statusMap[newStatus] || newStatus;
        if (!['sent', 'delivered', 'read', 'failed'].includes(mappedStatus)) {
            return NextResponse.json(
                { error: { type: 'validation_error', message: `Unsupported status '${newStatus}'.` } },
                { status: 400 }
            );
        }

        const adminClient = createAdminClient();
        const now = new Date().toISOString();

        const updatePayload = {
            status: mappedStatus,
            updated_at: now
        };

        if (mappedStatus === 'delivered') updatePayload.delivered_at = now;
        if (mappedStatus === 'read') updatePayload.read_at = now;
        if (mappedStatus === 'failed') {
            updatePayload.failed_at = now;
            if (errorCode) updatePayload.error_code = String(errorCode);
            if (errorMessage) updatePayload.error_message = String(errorMessage);
        }

        // Update logs where provider_message_id OR wamid matches
        const { error: updateError } = await adminClient
            .from('whatsapp_message_logs')
            .update(updatePayload)
            .or(`provider_message_id.eq.${messageId},wamid.eq.${messageId}`);

        if (updateError) {
            console.error('[whatsapp/webhook] Error updating log status:', updateError);
            return NextResponse.json(
                { error: { type: 'server_error', message: 'Failed to update message log.' } },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, messageId, status: mappedStatus }, { status: 200 });

    } catch (error) {
        console.error('[whatsapp/webhook] Error processing webhook:', error);
        return NextResponse.json(
            { error: { type: 'server_error', message: error.message || 'Webhook processing failed.' } },
            { status: 500 }
        );
    }
}
