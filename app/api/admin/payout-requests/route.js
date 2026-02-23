import { createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

// GET /api/admin/payout-requests — list all payout requests for admin
export async function GET(request) {
    try {
        // Extract Bearer token from Authorization header
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        const admin = createAdminClient();

        // Verify user via token
        let user = null;
        if (token) {
            const { data: { user: tokenUser }, error } = await admin.auth.getUser(token);
            if (!error) user = tokenUser;
        }

        // Fallback: try cookie-based auth via service role getUser (won't work but safe fallback)
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

        // Parse query params for filtering
        const { searchParams } = new URL(request.url);
        const statusFilter = searchParams.get('status'); // pending | approved | rejected | released | all

        let query = admin
            .from('payout_requests')
            .select(`
                *,
                merchants:merchant_id (
                    id,
                    business_name,
                    user_id,
                    bank_data,
                    wallet_balance_paise
                )
            `)
            .order('requested_at', { ascending: false });

        if (statusFilter && statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json({ requests: data || [] });
    } catch (error) {
        console.error('[API] Admin Payout GET Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
