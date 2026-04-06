import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import MerchantRatingsClient from './MerchantRatingsClient';

export const dynamic = 'force-dynamic';

export default async function MerchantRatingsPage() {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: merchant } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .single();

    if (!merchant) redirect('/merchant/dashboard');

    // 1. Fetch pre-computed stats from view
    const { data: stats } = await supabase
        .from('merchant_rating_stats')
        .select('avg_rating, total_ratings')
        .eq('merchant_id', merchant.id)
        .single();

    // 2. Fetch star distribution separately (since view doesn't have it)
    const { data: distributionData } = await supabase
        .from('merchant_ratings')
        .select('rating_value')
        .eq('merchant_id', merchant.id);
    
    const distribution = [5, 4, 3, 2, 1].map(star => ({
        star,
        count: (distributionData || []).filter(r => r.rating_value === star).length,
    }));

    // 3. Fetch first 50 ratings
    const { data: ratings } = await supabase
        .from('merchant_ratings')
        .select(`
            id,
            rating_value,
            feedback_text,
            created_at,
            shopping_order_group_id,
            customer_id,
            user_profiles:customer_id (full_name, avatar_url)
        `)
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false })
        .limit(50);

    return (
        <MerchantRatingsClient
            initialRatings={ratings || []}
            avgRating={stats?.avg_rating || 0}
            totalRatings={stats?.total_ratings || 0}
            distribution={distribution}
            merchantId={merchant.id}
        />
    );
}
