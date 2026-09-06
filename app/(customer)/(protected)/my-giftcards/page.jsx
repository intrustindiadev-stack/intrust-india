import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import MyGiftCardsClient from './MyGiftCardsClient';

export default async function MyGiftCardsPage() {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login?next=/my-giftcards');
    }

    const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    // Fetch purchased gift cards
    const { data: orders } = await supabase
        .from('orders')
        .select(`
            id, amount, created_at, payment_method,
            coupons:coupons!orders_giftcard_id_fkey(
                id, brand, title, selling_price_paise, face_value_paise, status, purchased_at, valid_until, merchant_id,
                merchant:merchants(business_name)
            )
        `)
        .eq('user_id', user.id)
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false });

    // Fetch udhari giftcards
    const { data: udhariRequests } = await supabase
        .from('udhari_requests')
        .select(`
            id, amount_paise, created_at, status, due_date,
            coupons:coupons!udhari_requests_coupon_id_fkey(
                id, brand, title, selling_price_paise, face_value_paise, status, valid_until, merchant_id,
                merchant:merchants(business_name)
            )
        `)
        .eq('customer_id', user.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

    const processedCoupons = [];
    let activeCount = 0;
    let pendingPaymentCount = 0;
    let totalValue = 0;
    let totalSavings = 0;

    (orders || []).forEach(order => {
        if (!order.coupons) return;
        const c = order.coupons;
        const faceVal = (c.face_value_paise || 0) / 100;
        const paid = order.amount || ((c.selling_price_paise || 0) / 100);
        const isExpired = c.valid_until && new Date(c.valid_until) < new Date();
        const uiStatus = isExpired ? 'expired' : (c.status === 'redeemed' ? 'used' : 'active');

        if (uiStatus === 'active') activeCount++;
        totalValue += faceVal;
        totalSavings += Math.max(0, faceVal - paid);

        processedCoupons.push({
            id: c.id,
            orderId: order.id,
            brand: c.brand || 'Gift Card',
            title: c.title,
            faceValue: faceVal,
            paidAmount: paid,
            uiStatus,
            merchant: c.merchant?.business_name || 'InTrust Store',
            formattedDate: new Date(c.purchased_at || order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            formattedExpiry: c.valid_until ? new Date(c.valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No Expiry',
            status: c.status
        });
    });

    (udhariRequests || []).forEach(u => {
        if (!u.coupons) return;
        const c = u.coupons;
        const faceVal = (c.face_value_paise || 0) / 100;
        const paid = (u.amount_paise || 0) / 100;
        pendingPaymentCount++;
        totalValue += faceVal;

        processedCoupons.push({
            id: c.id,
            orderId: u.id,
            brand: c.brand || 'Gift Card',
            title: c.title,
            faceValue: faceVal,
            paidAmount: paid,
            uiStatus: 'pending-payment',
            dueDate: u.due_date,
            merchant: c.merchant?.business_name || 'InTrust Store',
            formattedDate: new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            formattedExpiry: c.valid_until ? new Date(c.valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No Expiry',
            status: 'pending-payment'
        });
    });

    return (
        <MyGiftCardsClient
            coupons={processedCoupons}
            totalCards={processedCoupons.length}
            activeCount={activeCount}
            pendingPaymentCount={pendingPaymentCount}
            totalValue={totalValue}
            totalSavings={totalSavings}
            udhariCount={udhariRequests?.length || 0}
            userProfile={userProfile}
        />
    );
}
