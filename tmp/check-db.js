const { createClient } = require('@supabase/supabase-js');

const url = 'https://bhgbylyzlwmmabegxlfc.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoZ2J5bHl6bHdtbWFiZWd4bGZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDA1MjI2NSwiZXhwIjoyMDg1NjI4MjY1fQ._ZFcCbKGZmxFx34mbwaV9We088b1Hko-r0HKS4wsvJA';

const supabase = createClient(url, key);

async function check() {
    // Check merchant_investments
    const { data: inv, error: invErr } = await supabase.from('merchant_investments').select('*').limit(1);
    console.log('merchant_investments:', invErr ? 'ERROR: ' + invErr.message : 'OK (rows: ' + (inv?.length ?? 0) + ')');

    // Check merchant_investment_orders
    const { data: ord, error: ordErr } = await supabase.from('merchant_investment_orders').select('*').limit(1);
    console.log('merchant_investment_orders:', ordErr ? 'ERROR: ' + ordErr.message : 'OK (rows: ' + (ord?.length ?? 0) + ')');

    // Check columns on merchant_investments
    const { data: cols } = await supabase.rpc('version');
    console.log('DB connected:', !!cols);
}

check();
