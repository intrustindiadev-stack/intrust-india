import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logRewardRpcResult } from '@/lib/rewardRpcResult';

export async function POST(request) {
    try {
        // 1. Get authenticated user
        const cookieStore = cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            );
                        } catch (error) {
                            // The `setAll` method was called from a Server Component.
                            // This can be ignored if you have middleware refreshing
                            // user sessions.
                        }
                    },
                },
            }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Call reward RPC using admin client (service_role)
        const supabaseAdmin = createAdminClient();
        
        const { data, error: rewardError } = await supabaseAdmin.rpc('calculate_and_distribute_rewards', {
            p_event_type: 'daily_login',
            p_source_user_id: user.id
        });

        if (rewardError) {
            console.error('[DAILY-LOGIN-REWARD] RPC Error:', rewardError);
            return NextResponse.json({ success: false, error: rewardError.message }, { status: 500 });
        }

        const rewardResult = logRewardRpcResult({
            event_type: 'daily_login',
            source_user_id: user.id,
            reference_id: null,
            reference_type: null,
        }, data);

        return NextResponse.json({
            success: rewardResult.success,
            rewardApplied: rewardResult.totalDistributed > 0,
            data
        });

    } catch (error) {
        console.error('[DAILY-LOGIN-REWARD] Unexpected error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
