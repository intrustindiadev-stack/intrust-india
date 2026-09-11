import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import MerchantGiftcardsClient from './MerchantGiftcardsClient';

export const dynamic = 'force-dynamic';

export default async function InventoryPage({ searchParams }) {
    const supabase = await createServerSupabaseClient();
    const params = await searchParams;

    // Get filter from URL
    const filter = params?.filter || 'all'; // all, listed, unlisted, history
    const page = parseInt(params?.page || '1');
    const limit = 50;

    // 1. Get User & Auth
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // 2. Get Merchant Profile
    const { data: merchant } = await supabase
        .from('merchants')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (!merchant) {
        redirect('/merchant-apply');
    }

    // 3. Fetch Authoritative Stats in Parallel (using exact counts)
    const [totalRes, listedRes, unlistedRes, soldRes, totalValueRes] = await Promise.all([
        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('status', 'available'),
        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('listed_on_marketplace', true).eq('status', 'available'),
        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('listed_on_marketplace', false).eq('status', 'available'),
        supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('status', 'sold'),
        supabase.from('coupons').select('merchant_purchase_price_paise, face_value_paise, selling_price_paise').eq('merchant_id', merchant.id).eq('status', 'available')
    ]);

    // Calculate total investment (purchase value of active coupons)
    const totalInvestment = (totalValueRes.data || []).reduce((sum, c) => {
        const cost = c.merchant_purchase_price_paise ?? c.selling_price_paise ?? c.face_value_paise ?? 0;
        return sum + Math.abs(cost);
    }, 0) / 100;

    const stats = {
        total: totalRes.count || 0,
        listed: listedRes.count || 0,
        unlisted: unlistedRes.count || 0,
        sold: soldRes.count || 0,
        totalValue: totalInvestment,
    };

    // 4. Fetch Inventory based on filter
    let inventoryQuery = supabase
        .from('coupons')
        .select('*')
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

    if (filter === 'listed') {
        inventoryQuery = inventoryQuery.eq('listed_on_marketplace', true).eq('status', 'available');
    } else if (filter === 'unlisted') {
        inventoryQuery = inventoryQuery.eq('listed_on_marketplace', false).eq('status', 'available');
    } else if (filter === 'history' || filter === 'sold') {
        inventoryQuery = inventoryQuery.in('status', ['sold', 'expired', 'deleted']);
    } else {
        // Default 'all' filter shows only available items
        inventoryQuery = inventoryQuery.eq('status', 'available');
    }

    const { data: rawInventory, error: inventoryError } = await inventoryQuery;

    if (inventoryError) {
        console.error('Merchant Inventory Fetch Error:', inventoryError);
    }

    // 5. Fetch purchase transactions for coupons if purchase price is not set
    let transactions = [];
    if (rawInventory && rawInventory.length > 0) {
        const couponIds = rawInventory.map(c => c.id);
        const { data: txData } = await supabase
            .from('merchant_transactions')
            .select('amount_paise, commission_paise, coupon_id')
            .eq('transaction_type', 'purchase')
            .eq('merchant_id', merchant.id)
            .in('coupon_id', couponIds);

        if (txData) transactions = txData;
    }

    // Transform inventory to include purchase price from transactions or fallback
    const inventory = (rawInventory || []).map(item => {
        const purchaseTx = transactions.find(t => t.coupon_id === item.id);

        const purchasePrice = purchaseTx
            ? Math.abs(purchaseTx.amount_paise / 100)
            : (item.merchant_purchase_price_paise !== null && item.merchant_purchase_price_paise !== undefined
                ? Math.abs(item.merchant_purchase_price_paise / 100)
                : ((item.selling_price_paise || item.face_value_paise || 0) / 100));

        const commission = purchaseTx
            ? Math.abs(purchaseTx.commission_paise / 100)
            : (item.merchant_commission_paise ? Math.abs(item.merchant_commission_paise / 100) : 0);

        return {
            ...item,
            purchase_price: purchasePrice,
            commission: commission
        };
    });

    return (
        <div className="relative min-w-0">
            {/* Background subtle embellishments */}
            <div className="fixed top-[10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[140px] pointer-events-none -z-10" />
            <div className="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-[#D4AF37]/5 rounded-full blur-[140px] pointer-events-none -z-10" />

            <MerchantGiftcardsClient
                initialCoupons={inventory}
                stats={stats}
                currentFilter={filter}
            />
        </div>
    );
}

