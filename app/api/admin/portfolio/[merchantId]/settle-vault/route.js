import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

/**
 * POST /api/admin/portfolio/[merchantId]/settle-vault
 *
 * Super-admin only endpoint to settle/release funds from a merchant's
 * AI Grow Vault directly into their active Merchant Wallet balance.
 *
 * Atomically executed via public.settle_ai_grow_vault_to_wallet RPC:
 * 1. Validates caller is super_admin.
 * 2. Debits ai_grow_wallets.
 * 3. Creates ai_grow_wallet_transactions audit row.
 * 4. Credits merchants.wallet_balance_paise via internal bypass.
 * 5. Creates merchant_transactions ledger record.
 * 6. Creates notifications and audit_logs entries.
 * All in ONE database transaction.
 */
export async function POST(request, { params }) {
    try {
        const { merchantId } = await params;
        const { user, profile, admin: supabase } = await getAuthUser(request);

        // 1. Super Admin Authorization
        if (!user || profile?.role !== 'super_admin') {
            return NextResponse.json(
                { error: 'Access denied. Super admin role required to settle AI Grow Vault.' },
                { status: 403 }
            );
        }

        // 2. Parse & Validate Request Body
        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
        }

        const amount = Number(body.amount);
        const settlementType = body.settlement_type || 'Full Principal Liquidation';
        const reason = body.reason?.trim() || 'AI Grow Vault Settlement to Merchant Wallet';
        const idempotencyKey = body.idempotency_key || null;

        if (isNaN(amount) || amount <= 0) {
            return NextResponse.json(
                { error: 'Invalid settlement amount. Amount must be greater than zero.' },
                { status: 400 }
            );
        }

        // 3. Call atomic RPC
        const { data, error } = await supabase.rpc('settle_ai_grow_vault_to_wallet', {
            p_merchant_id: merchantId,
            p_admin_id: user.id,
            p_amount_rupees: amount,
            p_reason: reason,
            p_settlement_type: settlementType,
            p_idempotency_key: idempotencyKey,
        });

        if (error) {
            console.error('[settle-vault RPC error]:', error);
            return NextResponse.json(
                { error: error.message || 'Failed to settle AI Grow Vault.' },
                { status: 400 }
            );
        }

        if (data && data.success === false) {
            return NextResponse.json(
                { error: data.error || 'Vault settlement was rejected.' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Successfully settled ₹${amount.toLocaleString('en-IN')} from AI Grow Vault to Merchant Wallet.`,
            data
        });

    } catch (err) {
        console.error('[settle-vault] Internal server error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
    }
}
