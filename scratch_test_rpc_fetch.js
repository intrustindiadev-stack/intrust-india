const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function run() {
    let fetchCalled = false;
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            fetch: async (url, options) => {
                fetchCalled = true;
                console.log("Fetch interceptor triggered!");
                return global.fetch(url, options);
            }
        }
    });

    try {
        await client.rpc('test');
    } catch(e) {}
    
    console.log("Was interceptor called?", fetchCalled);
}
run();
