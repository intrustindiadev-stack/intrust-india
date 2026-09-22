import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { notifyMerchantBankVerified } from '@/lib/notifications/merchantWhatsapp';
import { fireAndForgetEmail } from '@/lib/email/dispatch';
import { sendMerchantAlert } from '@/lib/email';

export async function POST(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Admin-only
        if (!['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { merchantId } = await request.json();
        if (!merchantId) {
            return NextResponse.json({ error: 'merchantId is required' }, { status: 400 });
        }

        // Confirm the merchant has bank details before verifying.
        //
        // Bank details are OPTIONAL on the merchant application form (bank-optional
        // onboarding was shipped to improve conversion), so an approved merchant may
        // legitimately have no bank row yet. In that case we MUST NOT attempt any
        // verification — not a penny-drop API call, not even a registry stub.
        const { data: merchant, error: fetchError } = await admin
            .from('merchants')
            .select('id, bank_account_number, bank_ifsc_code, bank_data, bank_verified')
            .eq('id', merchantId)
            .single();

        if (fetchError || !merchant) {
            return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
        }

        // Bank details can live in the flat columns (current write path) or in the
        // bank_data JSONB (legacy rows written before the flat columns existed).
        // Both are trimmed so a whitespace-only value counts as missing.
        const norm = (v) => (typeof v === 'string' ? v.trim() : '');
        const accountNumber = norm(merchant.bank_account_number) || norm(merchant.bank_data?.account_number);
        const ifscCode = norm(merchant.bank_ifsc_code)
            || norm(merchant.bank_data?.ifsc)
            || norm(merchant.bank_data?.ifsc_code);

        if (!accountNumber || !ifscCode) {
            return NextResponse.json(
                {
                    error: 'Cannot verify. Merchant has not provided bank details yet.',
                    code: 'BANK_DETAILS_MISSING',
                },
                { status: 400 }
            );
        }

        // Set bank_verified = true and advance the lifecycle flag so the merchant
        // drops out of the admin "pending bank verification" queue.
        const { error: updateError } = await admin
            .from('merchants')
            .update({
                bank_verified: true,
                bank_verification_status: 'verified',
            })
            .eq('id', merchantId);

        if (updateError) throw updateError;

        // Notify the merchant
        const { data: merchantFull } = await admin
            .from('merchants')
            .select('user_id, business_name, owner_name, business_email')
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

            // Best-effort WhatsApp notification (Fire-and-forget)
            try {
                notifyMerchantBankVerified({
                    merchantUserId: merchantFull.user_id
                });
            } catch (e) {
                console.error('[Verify Bank] WhatsApp dispatch failed:', e);
            }

            // Fire-and-forget email alert to merchant
            fireAndForgetEmail(async () => {
                let emailToSend = merchantFull.business_email;
                if (!emailToSend) {
                    const { data: prof } = await admin
                        .from('user_profiles')
                        .select('email')
                        .eq('id', merchantFull.user_id)
                        .maybeSingle();
                    emailToSend = prof?.email;
                }
                if (emailToSend) {
                    await sendMerchantAlert({
                        type: 'bank_verified',
                        to: emailToSend,
                        data: {
                            businessName: merchantFull.business_name,
                            ownerName: merchantFull.owner_name,
                        },
                        actorId: user.id,
                        metadata: { merchantId },
                    });
                }
            }, { category: 'merchant_kyc', entityId: merchantId });
        }

        return NextResponse.json({ success: true, message: 'Bank account verified successfully' });
    } catch (err) {
        console.error('verify-bank error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
