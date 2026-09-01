import { createStaticSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { ShoppingBag } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

import ShopHubClient from './ShopHubClient';


// ISR: cache the merchant list for 60 seconds at the edge.
// Real-time open/closed status is handled client-side via WebSocket (ShopHubClient).
export const revalidate = 60;

export default async function MerchantHubPage() {
    const supabase = createStaticSupabaseClient();
    const adminClient = createAdminClient();

    const nowIso = new Date().toISOString();

    // Batch 1: Independent fetches using static client (cachable)
    const [
        merchantsResult,
        platformResult,
        categoriesResult
    ] = await Promise.all([
        supabase
            .from('merchants')
            .select('id, slug, user_id, business_name, business_address, shopping_banner_url, is_open, subscription_status, subscription_expires_at')
            .eq('status', 'approved')
            .eq('subscription_status', 'active')
            .or(`subscription_expires_at.is.null,subscription_expires_at.gt.${nowIso}`)
            .order('business_name', { ascending: true }),
        supabase
            .from('platform_settings')
            .select('value')
            .eq('key', 'platform_store')
            .single(),
        supabase
            .from('shopping_categories')
            .select('id, name, slug, icon_url')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
    ]);

    if (merchantsResult.error) {
        console.error('Error fetching merchants in shop page (will render empty):', merchantsResult.error);
    }

    if (platformResult.error) {
        console.error('Error fetching platform settings in shop page (will use defaults):', platformResult.error);
    }

    let merchants = merchantsResult.data || [];
    const userIds = merchants.map(m => m.user_id).filter(Boolean);
    const merchantIds = merchants.map(m => m.id);

    // Batch 2: Dependent fetches using active merchants' IDs (ratings, profiles)
    const [
        profilesResult,
        ratingsResult
    ] = await Promise.all([
        // Avatar profiles for all merchant users (requires service role / adminClient to bypass RLS)
        userIds.length > 0
            ? adminClient.from('user_profiles').select('id, avatar_url, full_name').in('id', userIds)
            : Promise.resolve({ data: [] }),
        // Filtered ratings stats (static client)
        merchantIds.length > 0
            ? supabase.from('merchant_rating_stats').select('merchant_id, avg_rating, total_ratings').in('merchant_id', merchantIds)
            : Promise.resolve({ data: [] })
    ]);

    if (profilesResult.error) {
        console.warn('Error fetching profiles in shop page:', profilesResult.error);
    }

    if (ratingsResult.error) {
        console.warn('Error fetching ratings in shop page:', ratingsResult.error);
    }

    let platformStatus = { is_open: true };
    try {
        if (platformResult?.data?.value) {
            platformStatus = typeof platformResult.data.value === 'string'
                ? JSON.parse(platformResult.data.value)
                : platformResult.data.value;
        }
    } catch (e) {
        console.error('Error parsing platform status in shop:', e);
    }

    // Merge avatar profiles into merchants
    if (userIds.length > 0) {
        const profileMap = Object.fromEntries((profilesResult.data || []).map(p => [p.id, p]));
        merchants = merchants.map(m => ({
            ...m,
            user_profiles: profileMap[m.user_id] || { avatar_url: null, full_name: null }
        }));
    }

    const ratingsMap = Object.fromEntries(
        (ratingsResult.data || []).map(r => [r.merchant_id, r])
    );

    const allMerchants = [
        {
            id: 'official',
            slug: 'official',
            business_name: 'Intrust Official',
            business_address: null,
            user_profiles: { avatar_url: '/icons/intrustLogo.png', full_name: null },
            is_open: !!platformStatus.is_open
        },
        ...merchants
    ];

    const categories = categoriesResult?.data || [];

    return (
        <div className="min-h-screen bg-[#f7f8fa] dark:bg-[#080a10] relative pb-32 transition-colors">
            <Navbar />

            <main className="pt-[88px] md:pt-[104px]">



                {/* ── Main Content ── */}
                <div>
                    <ShopHubClient merchants={allMerchants} ratingsMap={ratingsMap} categories={categories} />
                </div>

            </main>

            <Footer />
            
        </div>
    );
}

