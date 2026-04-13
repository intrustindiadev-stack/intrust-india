import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

// GET /api/admin/merchants/:id — returns a single merchant's profile data
export async function GET(request, { params }) {
    try {
        const merchantId = params.id;
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Verify admin role
        if (!['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 3. Fetch merchant
        const { data: merchant, error: merchantError } = await admin
            .from('merchants')
            .select('id, user_id, business_name, gst_number, status, subscription_status, subscription_expires_at, created_at')
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
