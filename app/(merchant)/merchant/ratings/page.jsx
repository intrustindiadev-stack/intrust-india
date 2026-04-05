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

    // Fetch all ratings for this merchant with customer info
    const { data: ratings } = await supabase
        .from('merchant_ratings')
        .select(`
            id,
            rating_value,
            feedback_text,
            created_at,
            shopping_order_group_id,
            customer_id,
            user_profiles:customer_id (full_name, avatar_url, phone)
        `)
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false });

    // Summary
    const totalRatings = (ratings || []).length;
    const avgRating = totalRatings
        ? (ratings.reduce((acc, r) => acc + r.rating_value, 0) / totalRatings).toFixed(1)
        : null;
    
    const distribution = [5, 4, 3, 2, 1].map(star => ({
        star,
        count: (ratings || []).filter(r => r.rating_value === star).length,
    }));

    return (
        <MerchantRatingsClient
            ratings={ratings || []}
            avgRating={avgRating}
            totalRatings={totalRatings}
            distribution={distribution}
        />
    );
}
