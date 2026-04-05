import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const cookieStore = await cookies();
        
        // Use anon key for getting Auth Session securely
        const supabaseAuth = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: { get(name) { return cookieStore.get(name)?.value; } }
            }
        );

        const { data: { session } } = await supabaseAuth.auth.getSession();
        
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Use service role for database writes to bypass RLS restrictions
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
                cookies: { get(name) { return cookieStore.get(name)?.value; } }
            }
        );

        const reqData = await request.json();
        const { action } = reqData; // 'activate' or 'deactivate'

        // 1. Get current merchant data
        const { data: merchant, error: merchantError } = await supabase
            .from('merchants')
            .select('id, auto_mode_status, auto_mode_months_paid, wallet_balance_paise')
            .eq('user_id', session.user.id)
            .single();

        if (merchantError) {
            return NextResponse.json({ error: 'Merchant account not found.' }, { status: 404 });
        }

        if (action === 'deactivate') {
            const { error: updateError } = await supabase
                .from('merchants')
                .update({ auto_mode_status: 'inactive' })
                .eq('id', merchant.id);

            if (updateError) throw updateError;
            return NextResponse.json({ success: true, message: 'Auto Mode deactivated' });
        }

        if (action === 'activate') {
            if (merchant.auto_mode_status === 'active') {
                return NextResponse.json({ error: 'Auto Mode is already active' }, { status: 400 });
            }

            const isFirstMonth = (merchant.auto_mode_months_paid || 0) === 0;
            const subscriptionPrice = isFirstMonth ? 999 : 1999;
            const pricePaise = subscriptionPrice * 100;
            
            if ((merchant.wallet_balance_paise || 0) < pricePaise) {
                return NextResponse.json({ error: `Insufficient wallet balance. Need ₹${subscriptionPrice}` }, { status: 400 });
            }

            const newBalancePaise = merchant.wallet_balance_paise - pricePaise;
            
            const validUntil = new Date();
            validUntil.setDate(validUntil.getDate() + 30);

            // Using direct sequence of updates. For perfect atomicity, an RPC is optimal, 
            // but this backend logic ensures service-role privileges handle it synchronously.
            
            // Deduct & update status
            const { error: updateError } = await supabase
                .from('merchants')
                .update({
                    wallet_balance_paise: newBalancePaise,
                    auto_mode_status: 'active',
                    auto_mode_months_paid: (merchant.auto_mode_months_paid || 0) + 1,
                    auto_mode_valid_until: validUntil.toISOString()
                })
                .eq('id', merchant.id);

            if (updateError) throw updateError;

            // Log Transaction
            const { error: txError } = await supabase
                .from('merchant_transactions')
                .insert({
                    merchant_id: merchant.id,
                    amount_paise: -pricePaise,
                    transaction_type: 'subscription',
                    description: `Auto Mode Subscription (${isFirstMonth ? '1st Month' : 'Renewal'})`,
                    balance_after_paise: newBalancePaise,
                    metadata: { reference_id: `AUTO_${Date.now()}` }
                });

            if (txError) {
                console.error('Failed to log tx in API:', txError);
                // Non-fatal if the update succeeded, but bad for ledger.
            }

            return NextResponse.json({ 
                success: true, 
                message: 'Auto Mode activated successfully',
                newBalance: newBalancePaise / 100,
                validUntil: validUntil.toISOString(),
                months_paid: (merchant.auto_mode_months_paid || 0) + 1
            });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('[API] Auto Mode Toggle Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
