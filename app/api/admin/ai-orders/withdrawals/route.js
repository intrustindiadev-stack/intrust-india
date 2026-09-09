import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

export async function GET(request) {
    try {
        const { user, profile, admin: supabaseAdmin } = await getAuthUser(request);

        if (!user || !['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Fetch all withdrawal transactions
        const { data: withdrawals, error: txError } = await supabaseAdmin
            .from('ai_orders_vault_transactions')
            .select('*')
            .eq('type', 'WITHDRAWAL')
            .order('created_at', { ascending: false });

        if (txError) {
            console.error('Error fetching vault transactions:', txError);
            throw txError;
        }

        if (!withdrawals || withdrawals.length === 0) {
            return NextResponse.json({ withdrawals: [] });
        }

        // 2. Fetch associated vaults
        const vaultIds = [...new Set(withdrawals.map(w => w.vault_id).filter(Boolean))];
        let vaultsMap = new Map();
        if (vaultIds.length > 0) {
            const { data: vaults, error: vaultsError } = await supabaseAdmin
                .from('ai_orders_vault')
                .select('id, merchant_id, balance_paise')
                .in('id', vaultIds);

            if (!vaultsError && vaults) {
                vaultsMap = new Map(vaults.map(v => [v.id, v]));
            }
        }

        // 3. Fetch associated merchants & user profiles
        const merchantUserIds = [...new Set(Array.from(vaultsMap.values()).map(v => v.merchant_id).filter(Boolean))];
        let merchantsMap = new Map();
        let profilesMap = new Map();

        if (merchantUserIds.length > 0) {
            const [{ data: merchantsList }, { data: profilesList }] = await Promise.all([
                supabaseAdmin
                    .from('merchants')
                    .select('id, user_id, business_name, business_phone, business_email, status')
                    .in('user_id', merchantUserIds),
                supabaseAdmin
                    .from('user_profiles')
                    .select('id, full_name, email, phone')
                    .in('id', merchantUserIds)
            ]);

            if (merchantsList) {
                merchantsMap = new Map(merchantsList.map(m => [m.user_id, m]));
            }
            if (profilesList) {
                profilesMap = new Map(profilesList.map(p => [p.id, p]));
            }
        }

        // 4. Enrich withdrawals with merchant details
        const formattedWithdrawals = withdrawals.map(w => {
            const vault = vaultsMap.get(w.vault_id) || null;
            const merchantUserId = vault?.merchant_id;
            const merchant = merchantUserId ? merchantsMap.get(merchantUserId) : null;
            const profile = merchantUserId ? profilesMap.get(merchantUserId) : null;

            return {
                ...w,
                vault_balance_paise: vault?.balance_paise || 0,
                ai_orders_vault: {
                    id: w.vault_id,
                    merchant_id: merchantUserId,
                    balance_paise: vault?.balance_paise || 0,
                    merchants: {
                        business_name: merchant?.business_name || profile?.full_name || 'Merchant Owner',
                        email: merchant?.business_email || profile?.email || 'No email provided',
                        phone: merchant?.business_phone || profile?.phone || '—',
                        status: merchant?.status || 'active'
                    }
                }
            };
        });

        return NextResponse.json({ withdrawals: formattedWithdrawals });
    } catch (error) {
        console.error('Error in /api/admin/ai-orders/withdrawals:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch withdrawals' }, { status: 500 });
    }
}

