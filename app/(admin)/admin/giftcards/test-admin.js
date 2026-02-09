'use server';

import { createAdminClient } from '@/lib/supabaseServer';

/**
 * Debug action to test if admin client is working
 */
export async function testAdminClient() {
    try {
        console.log('=== TESTING ADMIN CLIENT ===');

        // Check if env vars are set
        const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
        const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

        console.log('Service Role Key exists:', hasServiceKey);
        console.log('Supabase URL exists:', hasUrl);

        if (!hasServiceKey) {
            return {
                success: false,
                error: 'SUPABASE_SERVICE_ROLE_KEY is not set in .env.local',
                details: {
                    hasServiceKey,
                    hasUrl
                }
            };
        }

        // Try to create admin client
        const supabase = createAdminClient();
        console.log('Admin client created successfully');

        // Try a simple query
        const { data, error, count } = await supabase
            .from('coupons')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error('Query error:', error);
            return {
                success: false,
                error: 'Database query failed: ' + error.message,
                details: {
                    errorCode: error.code,
                    errorHint: error.hint,
                    errorDetails: error.details
                }
            };
        }

        console.log('Query successful, coupons count:', count);

        return {
            success: true,
            message: 'Admin client is working correctly!',
            couponsCount: count
        };

    } catch (error) {
        console.error('Test failed:', error);
        return {
            success: false,
            error: error.message,
            stack: error.stack
        };
    }
}
