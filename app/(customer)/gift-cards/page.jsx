import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import GiftCardsClient from './GiftCardsClient';

// Server Component - handles data fetching
export default async function GiftCardsPage() {
    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                get(name) {
                    return cookieStore.get(name)?.value;
                },
            },
        }
    );

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
