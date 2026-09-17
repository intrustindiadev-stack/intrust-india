import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

// Allowed feature-visibility keys (columns on public.merchants)
const VISIBILITY_COLUMNS = ['show_lockin', 'show_ai_grow', 'show_ai_orders'];

// GET /api/admin/merchants/[id]/visibility — current feature-visibility flags (super_admin only)
export async function GET(request, { params }) {
    try {
        const merchantId = params?.id;
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // super_admin only (plain admins must not see this section at all)
        if (profile?.role !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden. Super Admin access required.' }, { status: 403 });
        }

        const { data: merchant, error } = await admin
            .from('merchants')
            .select('id, show_lockin, show_ai_grow, show_ai_orders')
            .eq('id', merchantId)
            .single();

        if (error) throw error;

        return NextResponse.json({ visibility: merchant || null });
    } catch (err) {
        console.error('[API] Admin Merchant Visibility GET Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

// PATCH /api/admin/merchants/[id]/visibility — toggle feature visibility (super_admin only)
export async function PATCH(request, { params }) {
    try {
        const merchantId = params?.id;
        const body = await request.json();
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // super_admin only (plain admins are explicitly excluded per requirement)
        if (profile?.role !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden. Super Admin access required.' }, { status: 403 });
        }

        if (!merchantId) {
            return NextResponse.json({ error: 'Merchant id is required' }, { status: 400 });
        }

        // Build the patch object — only known keys, only booleans
        const patch = {};
        for (const key of VISIBILITY_COLUMNS) {
            if (body[key] !== undefined) {
                if (typeof body[key] !== 'boolean') {
                    return NextResponse.json({ error: `${key} must be a boolean` }, { status: 400 });
                }
                patch[key] = body[key];
            }
        }

        if (Object.keys(patch).length === 0) {
            return NextResponse.json(
                { error: `No valid fields provided. Allowed: ${VISIBILITY_COLUMNS.join(', ')}` },
                { status: 400 }
            );
        }

        const { data, error } = await admin
            .from('merchants')
            .update(patch)
            .eq('id', merchantId)
            .select('id, business_name, show_lockin, show_ai_grow, show_ai_orders')
            .single();

        if (error) throw error;

        if (!data) {
            return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
        }

        // Audit log
        try {
            await admin.from('audit_logs').insert([{
                admin_id: user.id,
                action: 'update_merchant_feature_visibility',
                entity_type: 'merchant',
                entity_id: merchantId,
                metadata: { changes: patch }
            }]);
        } catch (logErr) {
            // Audit logging must never block the mutation
            console.warn('[API] Failed to write visibility audit log:', logErr?.message);
        }

        return NextResponse.json({ merchant: data });
    } catch (err) {
        console.error('[API] Admin Merchant Visibility PATCH Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}