import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';

export async function POST(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        const admin = createAdminClient();

        let user = null;
        if (token) {
            const { data: { user: tokenUser }, error } = await admin.auth.getUser(token);
            if (!error) user = tokenUser;
        }
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Admin-only
        const { data: profile } = await admin
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { merchantId } = await request.json();
        if (!merchantId) {
            return NextResponse.json({ error: 'merchantId is required' }, { status: 400 });
        }

        // Confirm merchant has bank details before verifying
        const { data: merchant, error: fetchError } = await admin
            .from('merchants')
            .select('id, bank_account_number, bank_data, bank_verified')
            .eq('id', merchantId)
            .single();

        if (fetchError || !merchant) {
            return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
        }

        if (!merchant.bank_account_number && !merchant.bank_data?.account_number) {
            return NextResponse.json({ error: 'Merchant has no bank details to verify' }, { status: 400 });
        }

        // Set bank_verified = true
        const { error: updateError } = await admin
            .from('merchants')
            .update({ bank_verified: true })
            .eq('id', merchantId);

        if (updateError) throw updateError;

        // Notify the merchant
        const { data: merchantFull } = await admin
            .from('merchants')
            .select('user_id')
            .eq('id', merchantId)
            .single();

        if (merchantFull?.user_id) {
            await admin.from('notifications').insert({
                user_id: merchantFull.user_id,
                title: 'Bank Account Verified ✅',
                body: 'Your bank account has been verified by our team. You can now request withdrawals from your wallet.',
                type: 'success',
                reference_type: 'bank_verification',
                reference_id: merchantId,
            });
        }

        return NextResponse.json({ success: true, message: 'Bank account verified successfully' });
    } catch (err) {
        console.error('verify-bank error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
