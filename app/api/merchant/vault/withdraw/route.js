import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import { sendEmail } from '@/lib/email';
import { aiOrderWithdrawalNotificationTemplate } from '@/lib/email/templates/aiOrderWithdrawalNotification';
import { notifyMerchantPayoutRequested } from '@/lib/notifications/merchantWhatsapp';

export async function POST(req) {
    try {
        const { user, profile, admin: supabaseAdmin } = await getAuthUser(req);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { amount_paise } = body;

        const parsedAmountPaise = Math.round(Number(amount_paise));
        if (!parsedAmountPaise || isNaN(parsedAmountPaise) || parsedAmountPaise <= 0) {
            return NextResponse.json({ error: 'Missing or invalid amount' }, { status: 400 });
        }

        // 1. Check current vault balance for this merchant user
        const { data: vault, error: vaultError } = await supabaseAdmin
            .from('ai_orders_vault')
            .select('*')
            .eq('merchant_id', user.id)
            .single();

        if (vaultError || !vault) {
            return NextResponse.json({ error: 'Vault not found for merchant' }, { status: 404 });
        }

        if (vault.balance_paise < parsedAmountPaise) {
            return NextResponse.json({ error: 'Insufficient vault balance' }, { status: 400 });
        }

        // 2. Deduct amount from vault immediately
        const newBalance = vault.balance_paise - parsedAmountPaise;
        const { error: updateError } = await supabaseAdmin
            .from('ai_orders_vault')
            .update({ balance_paise: newBalance, updated_at: new Date().toISOString() })
            .eq('id', vault.id);

        if (updateError) throw updateError;

        // 3. Create a PENDING withdrawal transaction with required balance ledger columns
        const { data: txData, error: txError } = await supabaseAdmin
            .from('ai_orders_vault_transactions')
            .insert([{
                vault_id: vault.id,
                type: 'WITHDRAWAL',
                amount_paise: parsedAmountPaise,
                balance_before_paise: vault.balance_paise,
                balance_after_paise: newBalance,
                status: 'PENDING',
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (txError) throw txError;

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

        // Best-effort transactional email alert to administration
        try {
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
        } catch (emailErr) {
            console.warn('[Withdrawal API] Best-effort admin email alert dispatch skipped/failed:', emailErr?.message);
        }

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


