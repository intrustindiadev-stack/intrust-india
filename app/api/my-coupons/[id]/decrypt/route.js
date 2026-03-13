import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { decryptCouponCode } from '@/lib/encryption'

export async function GET(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { id } = await params

        // Use getUser() instead of getSession() for a cryptographically verified
        // server-side identity check (getSession() only reads the local cookie and
        // can be spoofed).
        let authClient = supabase;
        let { data: { user }, error: userError } = await supabase.auth.getUser();

        // Fallback to checking Authorization header if cookie-based getUser fails
        if (!user || userError) {
            const authHeader = request.headers.get('Authorization');
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split('Bearer ')[1];
                const { createClient } = require('@supabase/supabase-js');
                authClient = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                    {
                        global: {
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        }
                    }
                );
                const res = await authClient.auth.getUser();
                user = res.data?.user;
            }
        }

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Call the get_my_coupon_code RPC.
        // The function enforces ownership by checking auth.uid() internally via
        // RLS on the coupons table (purchased_by = auth.uid()), so the session-
        // scoped client is the correct one to use here.
        const { data: couponCode, error } = await authClient.rpc('get_my_coupon_code', {
            p_coupon_id: id,
        })

        let finalCouponCode = couponCode;

        if (error || !finalCouponCode) {
            // Check if user has an approved udhari request for this coupon
            const { createClient } = require('@supabase/supabase-js');
            const supabaseService = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

            const { data: udhari } = await supabaseService
                .from('udhari_requests')
                .select('id')
                .eq('coupon_id', id)
                .eq('customer_id', user.id)
                .eq('status', 'approved')
                .single();
            
            if (udhari) {
                // Fetch the encrypted code directly using service role
                const { data: couponData } = await supabaseService
                    .from('coupons')
                    .select('encrypted_code')
                    .eq('id', id)
                    .single();
                
                finalCouponCode = couponData?.encrypted_code;
            }
        }

        if (error && !finalCouponCode) {
            console.error('Error fetching coupon code:', error)
            return NextResponse.json(
                { error: error.message || 'Failed to fetch coupon code' },
                { status: 400 }
            )
        }

        if (finalCouponCode === null || finalCouponCode === undefined) {
            return NextResponse.json(
                { error: 'Coupon not found or access denied' },
                { status: 404 }
            )
        }

        const decryptedCode = decryptCouponCode(finalCouponCode)

        // Return the coupon code under the key `code` (not `encrypted_code`).
        // The column is named `encrypted_code` in the DB and we decrypt it here.
        // The client must never see the raw DB column name to avoid leaking implementation details.
        return NextResponse.json(
            { code: decryptedCode },
            { status: 200 }
        )
    } catch (error) {
        console.error('Unexpected error in decrypt API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
