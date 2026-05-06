import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

// Get all investments (Admin)
export async function GET(request) {
    try {
        const { user, profile, admin: supabase } = await getAuthUser(request);
        if (!user || !['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('merchant_investments')
            .select(`
                *,
                merchant:merchants(id, business_name, user_id, user_profiles(full_name, email))
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ data });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// Update investment status (Approve/Reject)
export async function PATCH(request) {
    try {
        const { user, profile, admin: supabase } = await getAuthUser(request);
        if (!user || !['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, status } = await request.json();
        if (!id || !status) return NextResponse.json({ error: 'ID and Status are required' }, { status: 400 });

        const updateData = {
            status,
            updated_at: new Date().toISOString()
        };

        if (status === 'active') {
            updateData.approved_at = new Date().toISOString();
            updateData.admin_id = user.id;
        }

        const { data, error } = await supabase
            .from('merchant_investments')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Notify Merchant
        try {
            const { data: investment } = await supabase
                .from('merchant_investments')
                .select('merchant_id, amount_paise')
                .eq('id', id)
                .single();

            const { data: merchant } = await supabase
                .from('merchants')
                .select('user_id')
                .eq('id', investment.merchant_id)
                .single();

            if (merchant) {
                await supabase.from('notifications').insert({
                    user_id: merchant.user_id,
                    title: `Investment ${status.charAt(0).toUpperCase() + status.slice(1)}`,
                    body: `Your investment request for ₹${(investment.amount_paise / 100).toLocaleString('en-IN')} has been ${status}.`,
                    type: status === 'active' ? 'success' : 'info',
                    reference_id: id,
                    reference_type: 'investment'
                });
            }
        } catch (notifErr) {
            console.error('Notification error:', notifErr);
        }

        return NextResponse.json({ data });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// Create investment directly (Admin)
export async function POST(request) {
    try {
        const { user, profile, admin: supabase } = await getAuthUser(request);
        if (!user || !['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { merchantId, amountRupees, description } = await request.json();
        if (!merchantId || !amountRupees) {
            return NextResponse.json({ error: 'Merchant ID and Amount are required' }, { status: 400 });
        }

        const amountPaise = Math.round(Number(amountRupees) * 100);

        const { data, error } = await supabase
            .from('merchant_investments')
            .insert({
                merchant_id: merchantId,
                amount_paise: amountPaise,
                description: description || 'Directly added by admin',
                status: 'active',
                approved_at: new Date().toISOString(),
                admin_id: user.id
            })
            .select()
            .single();

        if (error) throw error;

        // Notify Merchant
        try {
            const { data: merchant } = await supabase
                .from('merchants')
                .select('user_id')
                .eq('id', merchantId)
                .single();

            if (merchant) {
                await supabase.from('notifications').insert({
                    user_id: merchant.user_id,
                    title: 'New Investment Deployed',
                    body: `Admin has deployed a new investment of ₹${Number(amountRupees).toLocaleString('en-IN')} for your business.`,
                    type: 'success',
                    reference_id: data.id,
                    reference_type: 'investment'
                });
            }
        } catch (notifErr) {
            console.error('Notification error:', notifErr);
        }

        return NextResponse.json({ data });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
