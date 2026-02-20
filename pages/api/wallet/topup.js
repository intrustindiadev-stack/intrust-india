import { createServerClient } from '@supabase/ssr';

// This endpoint just forwards to the generic payment initiation but with specific parameters
// It's a convenience endpoint
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            setAll(cookiesToSet) {
                // setAll is not strictly required
            },
        }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // We'll trust the payment initiation endpoint to handle the heavy lifting.
    // This just ensures the frontend sends the right payload structure or pre-validates limits.
    const { amount } = req.body;

    // Validate limits (server-side check)
    const MIN_TOPUP = parseInt(process.env.WALLET_MIN_TOPUP || '100');
    const MAX_TOPUP = parseInt(process.env.WALLET_MAX_TOPUP || '10000');

    if (amount < MIN_TOPUP || amount > MAX_TOPUP) {
        return res.status(400).json({ error: `Amount must be between ₹${MIN_TOPUP} and ₹${MAX_TOPUP}` });
    }

    // Forward to client to call the actual payment/initiate - OR - we could internally dispatch here.
    // Generally cleaner to keep the frontend calling one "initiate" endpoint, 
    // but if we want this route to return the sabpaisa payload directly, we can do that.

    // Let's just return success and let frontend call payment/initiate with 
    // UDF1='WALLET_TOPUP'

    res.status(200).json({
        success: true,
        message: 'Proceed to payment initiation',
        validatedAmount: amount
    });
}
