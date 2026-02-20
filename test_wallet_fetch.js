require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testFetch() {
    const userId = '032ffac3-2565-4849-85a0-00d276438fbc'; // The dev merchant user ID

    console.log('Testing fetch for user:', userId);

    // 1. Check Merchant Balance
    const { data: merchant, error: merchantError } = await supabaseAdmin
        .from('merchants')
        .select('id, wallet_balance_paise')
        .eq('user_id', userId)
        .single();

    if (merchantError) console.error('Merchant Error:', merchantError);
    else console.log('Merchant Balance (paise):', merchant.wallet_balance_paise);

    // 2. Check Wallet Transactions
    const { data: transactions, error: txError } = await supabaseAdmin
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId);

    if (txError) console.error('Transactions Error:', txError);
    else console.log('Transactions Found:', transactions.length, transactions);
}

testFetch();
