import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import { getMerchantFeatureVisibility } from '@/lib/merchant/featureVisibility';
import { getVaultForMerchant } from '@/lib/ai-orders/vaultLookup';
import { sendEmail } from '@/lib/email';
import { fireAndForgetEmail } from '@/lib/email/dispatch';
import { aiOrderWithdrawalNotificationTemplate } from '@/lib/email/templates/aiOrderWithdrawalNotification';
import { notifyMerchantPayoutRequested } from '@/lib/notifications/merchantWhatsapp';

export async function POST(req) {
    try {
        const { user, profile, admin: supabaseAdmin } = await getAuthUser(req);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Super-admin feature-visibility guard: withdrawals follow AI Orders visibility
        const visibility = await getMerchantFeatureVisibility(user.id);
        if (!visibility.showAiOrders) {
            return NextResponse.json({ error: 'Feature disabled by administrator' }, { status: 403 });
        }

        const body = await req.json();
        const { amount_paise } = body;

        const parsedAmountPaise = Math.round(Number(amount_paise));
        if (!parsedAmountPaise || isNaN(parsedAmountPaise) || parsedAmountPaise <= 0) {
            return NextResponse.json({ error: 'Missing or invalid amount' }, { status: 400 });
        }

        // 1. Resolve the merchant's vault via the canonical lookup (vault rows
        //    are keyed by auth user id; the helper bridges merchants.id too).
        const { vault } = await getVaultForMerchant(supabaseAdmin, { userId: user.id });

        if (!vault) {
            return NextResponse.json({ error: 'Vault not found for merchant' }, { status: 404 });
        }

        if (vault.balance_paise < parsedAmountPaise) {
            return NextResponse.json({ error: 'Insufficient vault balance' }, { status: 400 });
        }

        // 2. Atomically debit the vault under a row lock via the
        //    withdraw_from_ai_vault RPC. This replaces the old racy
        //    read-check-update sequence and creates the PROCESSING ledger row.
        const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
            'withdraw_from_ai_vault',
            {
                p_merchant_id: user.id,
                p_amount_paise: parsedAmountPaise,
                p_payout_details: {},
            }
        );

        if (rpcError) {
            const msg = rpcError.message || '';
            if (rpcError.code === 'P0001' && msg.includes('Insufficient balance')) {
                return NextResponse.json({ error: 'Insufficient vault balance' }, { status: 400 });
            }
            if (rpcError.code === 'P0001' && msg.includes('Vault not found')) {
                return NextResponse.json({ error: 'Vault not found for merchant' }, { status: 404 });
            }
            throw rpcError;
        }

        // The RPC wrote the WITHDRAWAL row with status PROCESSING. Flip it to
        // PENDING (awaiting admin approval) and capture the remaining balance
        // it returned for downstream notifications.
        const remainingBalance = Number(rpcData?.remaining_balance_paise ?? (vault.balance_paise - parsedAmountPaise));
        const newBalance = vault.balance_paise - parsedAmountPaise;

        // Locate the ledger row the RPC just wrote (most recent WITHDRAWAL for
        // this vault) and mark it PENDING so it shows up in the admin queue.
        const { data: txRows, error: txFetchError } = await supabaseAdmin
            .from('ai_orders_vault_transactions')
            .select('*')
            .eq('vault_id', vault.id)
            .eq('type', 'WITHDRAWAL')
            .eq('amount_paise', parsedAmountPaise)
            .eq('balance_after_paise', remainingBalance)
            .order('created_at', { ascending: false })
            .limit(1);

        if (txFetchError) throw txFetchError;
        const txData = txRows?.[0];
        if (!txData) {
            throw new Error('Withdrawal ledger row not found after RPC');
        }

        const { error: flipError } = await supabaseAdmin
            .from('ai_orders_vault_transactions')
            .update({ status: 'PENDING' })
            .eq('id', txData.id)
            .eq('status', 'PROCESSING');

        if (flipError) throw flipError;
        txData.status = 'PENDING';

        // 4. Notify Admins about the new withdrawal request
        const amountRupees = parsedAmountPaise / 100;
        const formattedAmount = amountRupees.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        // Retrieve merchant details for rich notification context
        let merchantName = profile?.full_name || 'Merchant';
        let merchantEmail = profile?.email || '';
        let merchantPhone = profile?.phone || '';

        try {
            const { data: merchantRecord } = await supabaseAdmin
                .from('merchants')
                .select('business_name, business_email, business_phone')
                .eq('user_id', user.id)
                .maybeSingle();

            if (merchantRecord) {
                merchantName = merchantRecord.business_name || merchantName;
                merchantEmail = merchantRecord.business_email || merchantEmail;
                merchantPhone = merchantRecord.business_phone || merchantPhone;
            }
        } catch (mErr) {
            console.warn('[Withdrawal API] Could not fetch merchant profile details:', mErr?.message);
        }

        // Insert in-app notifications for all administrators
        try {
            const { data: adminProfiles, error: adminQueryErr } = await supabaseAdmin
                .from('user_profiles')
                .select('id, email, phone, role')
                .in('role', ['admin', 'super_admin']);

            if (!adminQueryErr && adminProfiles?.length > 0) {
                const adminNotifs = adminProfiles.map((ap) => ({
                    user_id: ap.id,
                    title: 'AI Orders: Withdrawal Request 💰',
                    body: `${merchantName} requested a vault withdrawal of ₹${formattedAmount}. Action required.`,
                    type: 'warning',
                    priority: 'HIGH',
                    reference_type: 'ai_orders_withdrawal',
                    reference_id: txData.id,
                    action_url: '/admin/ai-orders/withdrawals',
                    metadata: {
                        transaction_id: txData.id,
                        vault_id: vault.id,
                        merchant_id: user.id,
                        merchant_name: merchantName,
                        amount_paise: parsedAmountPaise,
                        amount_rupees: amountRupees,
                    }
                }));

                const { error: notifErr } = await supabaseAdmin.from('notifications').insert(adminNotifs);
                if (notifErr) {
                    console.error('[Withdrawal API] Failed to insert admin notifications:', notifErr.message);
                }
            }
        } catch (adminNotifErr) {
            console.error('[Withdrawal API] Admin notification error:', adminNotifErr?.message);
        }

        // Non-blocking fire-and-forget email alert to administration
        fireAndForgetEmail(async () => {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://intrustindia.com';
            const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.CONTACT_NOTIFICATION_EMAIL || 'hello@intrustindia.com';
            const emailTemplate = aiOrderWithdrawalNotificationTemplate({
                merchantName,
                merchantEmail,
                merchantPhone,
                amountRupees,
                transactionId: txData.id,
                vaultId: vault.id,
                remainingBalanceRupees: newBalance / 100,
                adminPortalUrl: `${appUrl}/admin/ai-orders/withdrawals`,
                requestedAt: new Date(),
            });

            await sendEmail({
                to: adminEmail,
                subject: emailTemplate.subject,
                html: emailTemplate.html,
                text: emailTemplate.text,
                sender: 'accounts',
                replyTo: merchantEmail || undefined,
                category: 'ai_orders_withdrawal_alert',
                metadata: {
                    transaction_id: txData.id,
                    merchant_id: user.id,
                    amount_paise: parsedAmountPaise,
                },
            });
        }, { category: 'vault_withdrawal', entityId: txData.id });

        // Best-effort WhatsApp receipt dispatch to merchant
        try {
            notifyMerchantPayoutRequested({
                merchantUserId: user.id,
                amountRs: amountRupees,
                source: 'AI Orders Vault',
            }).catch(() => {});
        } catch (waErr) {
            console.warn('[Withdrawal API] WhatsApp receipt dispatch skipped:', waErr?.message);
        }

        return NextResponse.json({ success: true, transaction: txData, new_balance_paise: newBalance });

    } catch (error) {
        console.error('Withdrawal error:', error);
        return NextResponse.json({ error: error.message || 'Failed to process withdrawal request' }, { status: 500 });
    }
}


