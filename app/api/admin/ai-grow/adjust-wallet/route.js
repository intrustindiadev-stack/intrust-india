import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import { adjustWalletSchema } from '@/lib/validations/ai-grow-wallet';

/**
 * POST /api/admin/ai-grow/adjust-wallet
 *
 * Admin-only endpoint to perform atomic wallet adjustments on AI Grow
 * Merchant Investment Wallets via the adjust_merchant_investment_wallet RPC.
 *
 * All balance mutations happen INSIDE the RPC under a row-level lock
 * to prevent race conditions with concurrent yield payout scripts.
 */
export async function POST(request) {
    try {
        // ── 1. AUTHENTICATION ─────────────────────────────────────────────────
        const { user, profile, admin: supabase } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json(
                { error: 'Authentication required.' },
                { status: 401 }
            );
        }

        // ── 2. ADMIN AUTHORIZATION ────────────────────────────────────────────
        const allowedRoles = ['admin', 'super_admin'];
        if (!profile || !allowedRoles.includes(profile.role)) {
            return NextResponse.json(
                { error: 'Access denied. Admin role required.' },
                { status: 403 }
            );
        }

        // ── 3. PARSE & VALIDATE REQUEST BODY ─────────────────────────────────
        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
        }

        // Coerce amount to number from string if needed (form data)
        if (body.amount !== undefined) {
            body.amount = Number(body.amount);
        }

        const validation = adjustWalletSchema.safeParse(body);
        if (!validation.success) {
            const fieldErrors = validation.error.flatten().fieldErrors;
            return NextResponse.json(
                {
                    error: 'Validation failed.',
                    field_errors: fieldErrors,
                },
                { status: 400 }
            );
        }

        const payload = validation.data;

        // ── 4. INVOKE ATOMIC RPC ──────────────────────────────────────────────
        const { data, error } = await supabase.rpc('adjust_merchant_investment_wallet', {
            p_merchant_id: payload.merchant_id,
            p_adjustment_type: payload.adjustment_type,
            p_amount: payload.amount,
            p_admin_id: user.id,
            p_reason: payload.reason,
            p_metadata: {
                ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
                user_agent: request.headers.get('user-agent') || 'unknown',
                admin_email: user.email || 'unknown',
            },
        });

        // ── 5. HANDLE RPC ERRORS ──────────────────────────────────────────────
        if (error) {
            console.error('[ai-grow/adjust-wallet] RPC error:', error);

            // Insufficient balance (Postgres errcode 22003)
            if (error.code === '22003' || error.message?.includes('Insufficient balance')) {
                return NextResponse.json(
                    { error: 'Insufficient balance for debit.' },
                    { status: 400 }
                );
            }

            // Invalid wallet state (frozen/suspended) - errcode 55000
            if (error.code === '55000' || error.message?.includes('wallet status')) {
                return NextResponse.json(
                    { error: error.message || 'Wallet is not in an active state.' },
                    { status: 409 }
                );
            }

            // Wallet not found - errcode P0002
            if (error.code === 'P0002' || error.message?.includes('does not exist')) {
                return NextResponse.json(
                    { error: 'Merchant wallet not found.' },
                    { status: 404 }
                );
            }

            // Validation errors from the DB (errcode 22023)
            if (error.code === '22023') {
                return NextResponse.json(
                    { error: error.message || 'Invalid adjustment parameters.' },
                    { status: 400 }
                );
            }

            return NextResponse.json(
                { error: 'Wallet adjustment failed. Please try again.' },
                { status: 500 }
            );
        }

        // ── 6. SUCCESS ────────────────────────────────────────────────────────
        return NextResponse.json({ success: true, data });

    } catch (err) {
        console.error('[ai-grow/adjust-wallet] Unhandled error:', err);
        return NextResponse.json(
            { error: 'Internal server error. Please try again.' },
            { status: 500 }
        );
    }
}
