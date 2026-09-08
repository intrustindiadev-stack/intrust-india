import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/admin/whatsapp-delivery-health
 * 
 * Returns delivery statistics (sent/delivered/read/failed/undeliverable/pending)
 * and recent failures from `whatsapp_message_logs`.
 * 
 * Query parameters:
 *   - window: '24h' | '7d' | '30d' (default: '24h')
 *   - channel: 'all' | 'web' | 'whatsapp' (default: 'all')
 *   - audience: 'all' | 'customer' | 'merchant' (default: 'all')
 *   - stuck_sent_minutes: number (default: 15)
 * 
 * Also returns today's automated broadcast status (Good Morning / Good Evening).
 */
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

        const { searchParams } = new URL(request.url);
        const window = searchParams.get('window') || '24h';
        const channel = searchParams.get('channel') || 'all';
        const audience = searchParams.get('audience') || 'all';
        const stuckSentMinutes = parseInt(searchParams.get('stuck_sent_minutes') || '15', 10);

        // Calculate time window boundary
        const now = new Date();
        let startDate = new Date();
        if (window === '24h') {
            startDate.setHours(now.getHours() - 24);
        } else if (window === '7d') {
            startDate.setDate(now.getDate() - 7);
        } else if (window === '30d') {
            startDate.setDate(now.getDate() - 30);
        } else {
            startDate.setHours(now.getHours() - 24);
        }
        const startDateISO = startDate.toISOString();
        const stuckThreshold = new Date(now.getTime() - stuckSentMinutes * 60000);

        // 1. Fetch minimal fields from whatsapp_message_logs for stats aggregates in JavaScript
        let statsQuery = admin
            .from('whatsapp_message_logs')
            .select('status, channel, audience, message_type, created_at')
            .gte('created_at', startDateISO);

        if (channel !== 'all') {
            statsQuery = statsQuery.eq('channel', channel);
        }
        if (audience !== 'all') {
            statsQuery = statsQuery.eq('audience', audience);
        }

        const { data: statsData, error: statsError } = await statsQuery;
        if (statsError) throw statsError;

        let sent = 0;
        let delivered = 0;
        let read = 0;
        let failed = 0;
        let undeliverable = 0;
        let pending = 0;
        let stuck_in_sent = 0;

        const channelBreakdown = { web: 0, whatsapp: 0 };
        const audienceBreakdown = { customer: 0, merchant: 0 };
        const messageTypeBreakdown = {};

        for (const log of (statsData || [])) {
            // Count distinct status
            if (log.status === 'sent') {
                sent++;
                if (log.created_at && new Date(log.created_at) < stuckThreshold) {
                    stuck_in_sent++;
                }
            } else if (log.status === 'delivered') {
                delivered++;
            } else if (log.status === 'read') {
                read++;
            } else if (log.status === 'failed') {
                failed++;
            } else if (log.status === 'undeliverable') {
                undeliverable++;
            } else {
                pending++;
            }

            // Count channel
            if (log.channel) {
                channelBreakdown[log.channel] = (channelBreakdown[log.channel] || 0) + 1;
            }

            // Count audience
            if (log.audience) {
                audienceBreakdown[log.audience] = (audienceBreakdown[log.audience] || 0) + 1;
            }

            // Count message type
            if (log.message_type) {
                messageTypeBreakdown[log.message_type] = (messageTypeBreakdown[log.message_type] || 0) + 1;
            }
        }

        // 2. Fetch up to 50 recent failures (now including undeliverable)
        let failuresQuery = admin
            .from('whatsapp_message_logs')
            .select('created_at, audience, message_type, error_code, error_detail, content_preview, status')
            .in('status', ['failed', 'undeliverable'])
            .gte('created_at', startDateISO);

        if (channel !== 'all') {
            failuresQuery = failuresQuery.eq('channel', channel);
        }
        if (audience !== 'all') {
            failuresQuery = failuresQuery.eq('audience', audience);
        }

        const { data: failuresData, error: failuresError } = await failuresQuery
            .order('created_at', { ascending: false })
            .limit(50);

        if (failuresError) throw failuresError;

        // 3. Fetch today's automated broadcasts stats (Good Morning / Good Evening)
        const todayIST = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
        
        const fetchBroadcastStats = async (prefix) => {
            const runTag = `[${prefix}-broadcast-run:${todayIST}]`;
            const msgTag = `[${prefix}-broadcast:${todayIST}]`;

            const { data: runData } = await admin
                .from('whatsapp_message_logs')
                .select('status, content_preview, created_at')
                .eq('audience', 'customer')
                .like('content_preview', `${runTag}%`)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            const { data: messagesData } = await admin
                .from('whatsapp_message_logs')
                .select('status')
                .eq('audience', 'customer')
                .eq('content_preview', msgTag);

            if (!runData && (!messagesData || messagesData.length === 0)) {
                return null;
            }

            let bSent = 0, bDelivered = 0, bFailed = 0, bRead = 0;
            for (const msg of (messagesData || [])) {
                if (msg.status === 'sent') bSent++;
                if (msg.status === 'delivered') bDelivered++;
                if (msg.status === 'read') bRead++;
                if (msg.status === 'failed') bFailed++;
            }

            return {
                run_status: runData?.status || 'unknown',
                run_summary: runData?.content_preview || 'No run audit found',
                run_time: runData?.created_at || null,
                metrics: {
                    sent: bSent,
                    delivered: bDelivered,
                    read: bRead,
                    failed: bFailed,
                    total: (messagesData || []).length
                }
            };
        };

        const morningBroadcast = await fetchBroadcastStats('gm');
        const eveningBroadcast = await fetchBroadcastStats('ge');

        return NextResponse.json({
            summary: {
                sent,
                delivered,
                read,
                failed,
                undeliverable,
                pending,
                stuck_in_sent,
                total: statsData?.length || 0,
            },
            breakdown: {
                channel: channelBreakdown,
                audience: audienceBreakdown,
                message_type: messageTypeBreakdown,
            },
            recent_failures: failuresData || [],
            daily_broadcasts: {
                morning: morningBroadcast,
                evening: eveningBroadcast
            }
        });
    } catch (err) {
        console.error('[API] Admin WhatsApp Delivery Health GET Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

