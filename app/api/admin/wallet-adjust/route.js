import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';
import { CustomerWalletService } from '@/lib/wallet/customerWalletService';
import { WalletService } from '@/lib/wallet/walletService';
import { WalletAuditService } from '@/lib/wallet/walletAuditService';
import { sendTemplateMessage, TRANSACTION_ALERT_TEMPLATE } from '@/lib/omniflow';
import crypto from 'crypto';

// --- Constants ---
const MAX_AMOUNT_RUPEES_DEFAULT = 100_000;       // ₹1,00,000 per txn
const MAX_AMOUNT_RUPEES_SENIOR = 1_000_000;      // ₹10,00,000 per txn
const DAILY_LIMIT_PAISE = 50_00_000 * 100;       // ₹50,00,000 daily cap
const RATE_LIMIT_PER_MINUTE = 10;
const REASON_MIN_LENGTH = 10;
const REASON_MAX_LENGTH = 500;

/**
 * Validates UUID format
 * @param {string} str
 * @returns {boolean}
 */
function isValidUUID(str) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

/**
 * POST /api/admin/wallet-adjust
 *
 * Fintech-grade wallet adjustment endpoint with idempotency, rate limiting,
 * permission checks, and full audit trail.
 */
export async function POST(request) {
    try {
        // ──────────────────────────────────────────
        // 1. AUTHENTICATION (Bearer token or SSR cookie)
        // ──────────────────────────────────────────
        const { user: authUser, admin: supabase } = await getAuthUser(request);

        if (!authUser) {
            return NextResponse.json(
                { error: 'Missing or invalid authorization header' },
                { status: 401 }
            );
        }

        // ──────────────────────────────────────────
        // 2. ADMIN ROLE VERIFICATION
        // ──────────────────────────────────────────
        const { data: adminProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', authUser.id)
            .single();

        if (profileError || !adminProfile || adminProfile.role !== 'super_admin') {
            return NextResponse.json(
                { error: 'Access denied. Super admin role required.' },
                { status: 403 }
            );
        }

        // ──────────────────────────────────────────
        // 3. PARSE & VALIDATE REQUEST BODY
        // ──────────────────────────────────────────
        const body = await request.json();
        const { userId, walletType, operation, amountRupees, reason, idempotencyKey } = body;

        // Required fields
        if (!userId || !walletType || !operation || !amountRupees || !reason || !idempotencyKey) {
            return NextResponse.json(
                { error: 'Missing required fields: userId, walletType, operation, amountRupees, reason, idempotencyKey' },
                { status: 400 }
            );
        }

        // UUID validation
        if (!isValidUUID(userId)) {
            return NextResponse.json({ error: 'Invalid userId format. Must be UUID.' }, { status: 400 });
        }
        if (!isValidUUID(idempotencyKey)) {
            return NextResponse.json({ error: 'Invalid idempotencyKey format. Must be UUID.' }, { status: 400 });
        }

        // Enum validation
        if (!['customer', 'merchant'].includes(walletType)) {
            return NextResponse.json({ error: 'walletType must be "customer" or "merchant".' }, { status: 400 });
        }
        if (!['credit', 'debit'].includes(operation)) {
            return NextResponse.json({ error: 'operation must be "credit" or "debit".' }, { status: 400 });
        }

        // Amount validation
        const parsedAmount = Number(amountRupees);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return NextResponse.json({ error: 'amountRupees must be a positive number.' }, { status: 400 });
        }

        // Reason validation
        if (reason.length < REASON_MIN_LENGTH || reason.length > REASON_MAX_LENGTH) {
            return NextResponse.json(
                { error: `Reason must be between ${REASON_MIN_LENGTH} and ${REASON_MAX_LENGTH} characters.` },
                { status: 400 }
            );
        }

        // ──────────────────────────────────────────
        // 4. PERMISSION CHECK
        // ──────────────────────────────────────────
        let permissions;
        try {
            permissions = await WalletAuditService.getAdminPermissions(authUser.id);
        } catch (permError) {
            console.error('[wallet-adjust] Permission check failed:', permError);
            return NextResponse.json(
                { error: `Unable to verify permissions: ${permError.message}` },
                { status: 500 }
            );
        }

        const isSuperAdmin = adminProfile.role === 'super_admin';
        const hasFullAccess = isSuperAdmin || permissions.includes('adjust_wallet_any');
        const hasLimitedAccess = permissions.includes('adjust_wallet_under_10k');

        // Require explicit permission grants OR super_admin role
        const hasPermission = hasFullAccess || hasLimitedAccess;

        if (!hasPermission) {
            return NextResponse.json(
                { error: 'Insufficient permissions. You do not have wallet adjustment privileges.' },
                { status: 403 }
            );
        }

        // Per-transaction amount limit
        const maxAmount = hasFullAccess ? MAX_AMOUNT_RUPEES_SENIOR : MAX_AMOUNT_RUPEES_DEFAULT;
        if (parsedAmount > maxAmount) {
            return NextResponse.json(
                { error: `Amount exceeds your per-transaction limit of ₹${maxAmount.toLocaleString('en-IN')}.` },
                { status: 400 }
            );
        }

        // ──────────────────────────────────────────
        // 5. RATE LIMITING
        // ──────────────────────────────────────────
        const recentCount = await WalletAuditService.getAdminRecentCount(authUser.id);
        if (recentCount >= RATE_LIMIT_PER_MINUTE) {
            return NextResponse.json(
                { error: `Rate limit exceeded. Max ${RATE_LIMIT_PER_MINUTE} adjustments per minute.` },
                { status: 429 }
            );
        }

        // ──────────────────────────────────────────
        // 6. IDEMPOTENCY CHECK
        // ──────────────────────────────────────────
        const existingLog = await WalletAuditService.checkIdempotency(idempotencyKey);
        if (existingLog) {
            // Already processed — return cached result
            return NextResponse.json({
                success: existingLog.status === 'completed',
                message: 'This adjustment was already processed (idempotency key match).',
                auditLogId: existingLog.id,
                newBalance: existingLog.balance_after_paise / 100,
                timestamp: existingLog.created_at,
                duplicate: true,
            });
        }

        // ──────────────────────────────────────────
        // 7. DAILY LIMIT CHECK
        // ──────────────────────────────────────────
        const amountPaise = Math.round(parsedAmount * 100);
        const dailyTotalPaise = await WalletAuditService.getAdminDailyTotal(authUser.id);

        if (dailyTotalPaise + amountPaise > DAILY_LIMIT_PAISE) {
            const remainingRupees = Math.max(0, (DAILY_LIMIT_PAISE - dailyTotalPaise) / 100);
            return NextResponse.json(
                {
                    error: `Daily adjustment limit exceeded. Remaining today: ₹${remainingRupees.toLocaleString('en-IN')}.`,
                    dailyUsed: dailyTotalPaise / 100,
                    dailyLimit: DAILY_LIMIT_PAISE / 100,
                },
                { status: 400 }
            );
        }

        // ──────────────────────────────────────────
        // 8. GET CURRENT BALANCE & VALIDATE
        // ──────────────────────────────────────────
        let currentBalancePaise = 0;

        if (walletType === 'customer') {
            const wallet = await CustomerWalletService.getOrCreateWallet(userId);
            currentBalancePaise = wallet.balance_paise || 0;
        } else {
            const { data: merchant, error: mErr } = await supabase
                .from('merchants')
                .select('wallet_balance_paise')
                .eq('user_id', userId)
                .single();

            if (mErr || !merchant) {
                return NextResponse.json({ error: 'Merchant not found for this user.' }, { status: 404 });
            }
            currentBalancePaise = merchant.wallet_balance_paise || 0;
        }

        // Debit balance check
        if (operation === 'debit' && currentBalancePaise < amountPaise) {
            return NextResponse.json(
                {
                    error: 'Insufficient balance for debit operation.',
                    currentBalance: currentBalancePaise / 100,
                    requestedAmount: parsedAmount,
                },
                { status: 400 }
            );
        }

        // ──────────────────────────────────────────
        // 9. EXECUTE THE ADJUSTMENT
        // ──────────────────────────────────────────
        const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '0.0.0.0';
        const userAgent = request.headers.get('user-agent') || '';

        const auditLogData = {
            adminUserId: authUser.id,
            reason,
            idempotencyKey,
            ipAddress,
            userAgent,
        };

        let newBalancePaise;
        let auditLogId;

        try {
            let result;
            if (walletType === 'customer') {
                if (operation === 'credit') {
                    result = await CustomerWalletService.creditWallet(
                        userId, parsedAmount, 'ADMIN_ADJUSTMENT', `Admin adjustment: ${reason}`, {}, auditLogData
                    );
                } else {
                    result = await CustomerWalletService.debitWallet(
                        userId, parsedAmount, `Admin adjustment: ${reason}`, {}, auditLogData
                    );
                }
                // Handle duplicate detected inside the atomic RPC
                if (result.duplicate) {
                    return NextResponse.json({
                        success: true,
                        message: 'This adjustment was already processed (idempotency key match).',
                        auditLogId: result.auditLogId,
                        newBalance: result.newBalance,
                        duplicate: true,
                    });
                }
                newBalancePaise = Math.round(result.newBalance * 100);
                auditLogId = result.auditLogId;
            } else {
                // merchant wallet
                if (operation === 'credit') {
                    result = await WalletService.creditWallet(
                        userId, parsedAmount, null, 'ADMIN_ADJUSTMENT', `Admin adjustment: ${reason}`, auditLogData
                    );
                } else {
                    result = await WalletService.debitWallet(
                        userId, parsedAmount, null, 'ADMIN_ADJUSTMENT', `Admin adjustment: ${reason}`, auditLogData
                    );
                }
                // Handle duplicate detected inside the atomic RPC
                if (result.duplicate) {
                    return NextResponse.json({
                        success: true,
                        message: 'This adjustment was already processed (idempotency key match).',
                        auditLogId: result.auditLogId,
                        newBalance: (result.newBalancePaise || 0) / 100,
                        duplicate: true,
                    });
                }
                newBalancePaise = result.newBalancePaise;
                auditLogId = result.auditLogId;
            }
        } catch (execError) {
            // With the atomic RPC, if it throws then nothing was committed.
            // Log the failure for ops visibility.
            console.error('[wallet-adjust] Adjustment execution failed:', execError);

            return NextResponse.json(
                { error: `Wallet adjustment failed: ${execError.message}` },
                { status: 500 }
            );
        }

        // ──────────────────────────────────────────
        // 10. INSERT NOTIFICATION
        // ──────────────────────────────────────────
        try {
            const { error: notifError } = await supabase.from('notifications').insert({
                user_id: userId,
                title: operation === 'credit' ? 'Wallet Credited' : 'Wallet Debited',
                body: `₹${parsedAmount.toLocaleString('en-IN')} has been ${operation === 'credit' ? 'added to' : 'deducted from'} your wallet by admin. Reason: ${reason}`,
                type: operation === 'credit' ? 'success' : 'warning',
                reference_id: auditLogId,
                reference_type: 'wallet_adjustment',
            });
            if (notifError) {
                console.error('[wallet-adjust] Failed to insert notification (API error):', notifError);
            }
        } catch (notifErr) {
            console.error('[wallet-adjust] Failed to insert notification (Exception):', notifErr);
            // Non-blocking: we still return success for the adjustment
        }

        // ──────────────────────────────────────────
        // 10.5 WHATSAPP TRANSACTION ALERT
        // ──────────────────────────────────────────
        try {
            const { data: binding } = await supabase
                .from('user_channel_bindings')
                .select('phone')
                .eq('user_id', userId)
                .eq('whatsapp_opt_in', true)
                .maybeSingle();

            if (binding?.phone) {
                // Deduplication guard: use the auditLogId as an exact-match key.
                const alertTag = `[template:intrust_transaction_alert:${auditLogId}]`;
                const { data: alreadySent } = await supabase
                    .from('whatsapp_message_logs')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('content_preview', alertTag)
                    .limit(1)
                    .maybeSingle();

                if (alreadySent) {
                    console.log(`[wallet-adjust] Skipping duplicate transaction alert for audit ${auditLogId}`);
                } else {
                    const newBalanceRs = ((newBalancePaise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
                    const amountRs = parsedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 });
                    const direction = operation === 'credit' ? 'credited to' : 'debited from';
                    await sendTemplateMessage(
                        binding.phone,
                        TRANSACTION_ALERT_TEMPLATE.name,
                        TRANSACTION_ALERT_TEMPLATE.language,
                        TRANSACTION_ALERT_TEMPLATE.buildComponents(amountRs, direction, newBalanceRs)
                    );
                    console.log(`[wallet-adjust] WhatsApp transaction alert sent to user ${userId}`);
                    const phoneHash = crypto.createHash('sha256').update(binding.phone).digest('hex');
                    await supabase.from('whatsapp_message_logs').insert({
                        user_id: userId,
                        phone_hash: phoneHash,
                        direction: 'outbound',
                        message_type: 'template',
                        channel: 'web',
                        status: 'delivered',
                        content_preview: alertTag,
                    }).then(({ error }) => {
                        if (error) console.warn('[wallet-adjust] Failed to log transaction alert:', error.message);
                    });
                }
            }
        } catch (waErr) {
            console.error('[wallet-adjust] WhatsApp transaction alert failed (non-blocking):', waErr.message);
        }

        // ──────────────────────────────────────────
        // 11. SUCCESS RESPONSE
        // ──────────────────────────────────────────
        return NextResponse.json({
            success: true,
            newBalance: (newBalancePaise || 0) / 100,
            auditLogId,
            timestamp: new Date().toISOString(),
        });

    } catch (err) {
        console.error('[wallet-adjust] Unhandled error:', err);
        return NextResponse.json(
            { error: 'Internal server error. Please try again.' },
            { status: 500 }
        );
    }
}
