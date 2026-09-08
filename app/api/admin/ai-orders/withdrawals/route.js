import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

export async function GET(request) {
    try {
        const { user, profile, admin: supabaseAdmin } = await getAuthUser(request);

        if (!user || !['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: withdrawals, error } = await supabaseAdmin
            .from('ai_orders_vault_transactions')
            .select(`
                id,
                amount_paise,
                status,
                created_at,
                vault_id,
                ai_orders_vault (
                    id,
                    merchant_id
                )
            `)
            .eq('type', 'WITHDRAWAL')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch merchant profiles for these transactions
        const merchantUserIds = [...new Set((withdrawals || []).map(w => w.ai_orders_vault?.merchant_id).filter(Boolean))];
        
        let merchantMap = new Map();
        if (merchantUserIds.length > 0) {
            const { data: merchantsList } = await supabaseAdmin
                .from('merchants')
                .select('id, user_id, business_name, email')
                .in('user_id', merchantUserIds);

            if (merchantsList) {
                merchantMap = new Map(merchantsList.map(m => [m.user_id, m]));
            }
        }

        const formattedWithdrawals = (withdrawals || []).map(w => {
            const merchantUserId = w.ai_orders_vault?.merchant_id;
            const merchantInfo = merchantMap.get(merchantUserId) || null;
            return {
                ...w,
                ai_orders_vault: {
                    ...w.ai_orders_vault,
                    merchants: merchantInfo
                }
            };
        });

        return NextResponse.json({ withdrawals: formattedWithdrawals });
    } catch (error) {
        console.error('Error fetching withdrawals:', error);
        return NextResponse.json({ error: 'Failed to fetch withdrawals' }, { status: 500 });
    }
}

