import { NextResponse } from 'next/server';
import { 
    sendAdminMaintenanceAlert, 
    broadcastMaintenanceResolved 
} from '@/lib/notifications/maintenanceNotifications';

export async function POST(request) {
    try {
        const authHeader = request.headers.get('authorization') || '';
        const adminKeyHeader = request.headers.get('x-admin-key') || '';
        const expectedToken = process.env.INTERNAL_API_TOKEN;
        const bypassKey = process.env.MAINTENANCE_BYPASS_KEY;

        const isAuthorized = 
            (expectedToken && authHeader.replace('Bearer ', '').trim() === expectedToken) ||
            (bypassKey && adminKeyHeader === bypassKey);

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const { action = 'admin-alert', status = 'activated', note = null } = body;

        if (action === 'admin-alert') {
            const results = await sendAdminMaintenanceAlert({
                status,
                note,
            });
            return NextResponse.json({ success: true, action: 'admin-alert', results });
        }

        if (action === 'broadcast-resolved') {
            const results = await broadcastMaintenanceResolved();
            return NextResponse.json({ success: true, action: 'broadcast-resolved', results });
        }

        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    } catch (err) {
        console.error('[Maintenance:Broadcast] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
