import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { points } = body;

        if (!points || points <= 0) {
            return NextResponse.json({ error: 'Valid points amount required' }, { status: 400 });
        }

        // Call the RPC to convert points to wallet
        const { data: result, error: rpcError } = await supabase.rpc('convert_points_to_wallet', {
            p_user_id: user.id,
            p_points: points
        });

        if (rpcError) {
            console.error('Error converting points:', rpcError);
            return NextResponse.json({ error: rpcError.message || 'Conversion failed' }, { status: 500 });
        }

        // result is a JSONB string, parse it
        const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;

        if (!parsedResult?.success) {
            return NextResponse.json({
                success: false,
                message: parsedResult?.message || 'Conversion failed'
            }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            rupee_paise: parsedResult.rupee_paise,
            points_deducted: parsedResult.points_deducted,
            message: `Successfully converted ${parsedResult.points_deducted} points to ₹${(parsedResult.rupee_paise / 100).toFixed(2)}`
        });

    } catch (error) {
        console.error('Reward Convert API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
