import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            bank_account_name,
            bank_account_number,
            bank_ifsc_code,
            bank_name
        } = body;

        if (!bank_account_name || !bank_account_number || !bank_ifsc_code) {
            return NextResponse.json({ error: 'Missing required bank details' }, { status: 400 });
        }

        const payload = {
            bank_account_name,
            bank_account_number,
            bank_ifsc_code,
            bank_name,
            bank_data: {
                account_holder_name: bank_account_name,
                account_number: bank_account_number,
                ifsc: bank_ifsc_code,
                bank_name: bank_name,
            },
            bank_verified: false, // Reset verification
            updated_at: new Date().toISOString()
        };

        const { error: updateError } = await admin
            .from('merchants')
            .update(payload)
            .eq('user_id', user.id);

        if (updateError) throw updateError;

        // Notify Admins about bank detail submission
        try {
            const { data: adminProfiles } = await admin
                .from('user_profiles')
                .select('id')
                .eq('role', 'admin');

            if (adminProfiles && adminProfiles.length > 0) {
                const adminNotifs = adminProfiles.map((ap) => ({
                    user_id: ap.id,
                    title: 'Bank Details Updated 🏦',
                    body: `Merchant ${user.id.slice(0, 8)} updated their bank details. Verification required.`,
                    type: 'info',
                    reference_type: 'bank_verification',
                    reference_id: user.id
                }));
                await admin.from('notifications').insert(adminNotifs);
            }
        } catch (notifError) {
            console.error('[BankNotif Error]:', notifError);
        }

        return NextResponse.json({ success: true, message: 'Bank details submitted for verification' });
    } catch (error) {
        console.error('[BankDetails API Error]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
