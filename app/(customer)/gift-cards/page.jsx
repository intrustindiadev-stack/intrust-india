import { createServerSupabaseClient } from '@/lib/supabaseServer';
import GiftCardsClient from './GiftCardsClient';

// Server Component - handles data fetching
export default async function GiftCardsPage() {
    const supabase = await createServerSupabaseClient();

    // Server-side data fetch
    // NEW: Only fetch cards that merchants have listed on the marketplace
    // Includes merchant join to get business_name for display
    const { data: coupons, error } = await supabase
        .from('coupons')
        .select(`
        *,
        merchant:merchants!merchant_id (
            business_name,
            id
        )
    `)
        .eq('status', 'available')
        .eq('listed_on_marketplace', true)
        .not('merchant_id', 'is', null)
        .gte('valid_until', new Date().toISOString())
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching gift cards:', error);
    }

    return <GiftCardsClient initialCoupons={coupons || []} />;
}
