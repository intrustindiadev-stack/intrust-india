import { createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

// GET /api/admin/merchants/:id — returns a single merchant's profile data
export async function GET(request, { params }) {
    try {
        const merchantId = params.id;
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        const admin = createAdminClient();

        // 1. Authenticate
        let user = null;
        if (token) {
            const { data: { user: tokenUser }, error } = await admin.auth.getUser(token);
            if (!error) user = tokenUser;
        }
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Verify admin role
        const { data: profile } = await admin
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 3. Fetch merchant
        const { data: merchant, error: merchantError } = await admin
            .from('merchants')
            .select('id, user_id, business_name, gst_number, status, created_at')
            .eq('id', merchantId)
            .single();

        if (merchantError || !merchant) {
            return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
        }

        // 4. Fetch associated user profile
        const { data: userProfile } = await admin
            .from('user_profiles')
            .select('full_name, phone, email')
            .eq('id', merchant.user_id)
            .single();

        return NextResponse.json({
            merchant: {
                ...merchant,
                owner_name: userProfile?.full_name || 'Unknown',
                phone: userProfile?.phone || '',
                email: userProfile?.email || '',
            }
        });
    } catch (err) {
        console.error('[API] Admin Merchant GET Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
