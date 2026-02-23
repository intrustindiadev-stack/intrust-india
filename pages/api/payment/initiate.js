import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client (Service Role for DB operations)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Helper to get user from Authorization header
async function getUserFromRequest(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.replace('Bearer ', '');

    // Create a simple client to verify the JWT
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        console.error('[Payment Initiate] Auth error:', error);
        return null;
    }

    return user;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 1. Authenticate user
        const user = await getUserFromRequest(req);

        if (!user) {
            console.error('[Payment Initiate] No authenticated user');
            return res.status(401).json({ error: 'Unauthorized - Please log in' });
        }

        console.log('[Payment Initiate] User authenticated:', user.id);

        const { amount, payerName, payerEmail, payerMobile, udf1, udf2 } = req.body;

        // Validate required fields
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        // 2. Generate Client Transaction ID
        const clientTxnId = `TXN_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        // Sanitize Mobile Number for Sabpaisa (remove +91 and any non-digits)
        let cleanMobile = (payerMobile || user.phone || '').replace(/\D/g, '');
        if (cleanMobile.startsWith('91') && cleanMobile.length > 10) {
            cleanMobile = cleanMobile.substring(2);
        }
        if (cleanMobile.length === 0) {
            cleanMobile = "9999999999"; // Fallback required by Sabpaisa
        }

        console.log('[Payment Initiate] === PAYMENT INITIATE START ===');
        console.log('[Payment Initiate] User:', user.id);
        console.log('[Payment Initiate] Amount:', amount);
        console.log('[Payment Initiate] Client Txn ID:', clientTxnId);
        console.log('[Payment Initiate] Clean Mobile:', cleanMobile);
        console.log('[Payment Initiate] Callback URL:', process.env.NEXT_PUBLIC_APP_URL + '/api/payment/callback');

        // 3. Insert into Database
        const { data, error } = await supabaseAdmin
            .from('transactions')
            .insert([
                {
                    user_id: user.id, // Critical: Include user_id
                    client_txn_id: clientTxnId,
                    amount: amount,
                    status: 'INITIATED',
                    payer_name: payerName || user.user_metadata?.full_name || 'User',
                    payer_email: payerEmail || user.email,
                    payer_mobile: cleanMobile,
                    udf1: udf1 || '',
                    udf2: udf2 || '',
                    created_at: new Date()
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('[Payment Initiate] DB Insert Error:', error);
            throw error;
        }

        console.log('[Payment Initiate] Transaction created successfully:', data.id);
        console.log('[Payment Initiate] === PAYMENT INITIATE END ===');

        // 4. Return transaction ID (client will use this + env vars to call submitPaymentForm)
        return res.status(200).json({
            transactionId: clientTxnId,
            dbId: data.id
        });

    } catch (error) {
        console.error('[Payment Initiate] Error:', error);
        return res.status(500).json({
            error: 'Internal Server Error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
