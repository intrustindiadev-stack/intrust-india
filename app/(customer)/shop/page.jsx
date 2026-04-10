import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { Wallet, Heart, ShoppingBag, Package } from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import ShopHubClient from './ShopHubClient';
import Breadcrumbs from '@/components/giftcards/Breadcrumbs';

export const dynamic = 'force-dynamic';

export default async function MerchantHubPage() {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch active merchants
    const { data: merchantsArray } = await supabase
        .from('merchants')
        .select(`
            id,
            slug,
            user_id,
            business_name,
            business_address,
            shopping_banner_url
        `)
        .eq('status', 'approved')
        .order('business_name', { ascending: true });

    let merchants = merchantsArray || [];

    // Batch 2: run all remaining fetches in parallel
    // profiles fetch requires userIds derived from merchants (Batch 1), so it belongs in Batch 2
    const userIds = merchants.map(m => m.user_id).filter(Boolean);
    const adminClient = createAdminClient();

    const [
        profilesResult,
        ratingsResult,
        customerProfileResult,
        wishlistCountResult,
        cartCountResult,
    ] = await Promise.all([
        // Avatar profiles for all merchant users
        userIds.length > 0
            ? adminClient.from('user_profiles').select('id, avatar_url, full_name').in('id', userIds)
            : Promise.resolve({ data: [] }),
        // Aggregate ratings for all merchants
        supabase.from('merchant_rating_stats').select('merchant_id, avg_rating, total_ratings'),
        // Logged-in customer profile
        user
            ? supabase.from('user_profiles').select('wallet_balance_paise, full_name, avatar_url').eq('id', user.id).single()
            : Promise.resolve({ data: null }),
        // Wishlist count
        user
            ? supabase.from('user_wishlists').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
            : Promise.resolve({ count: 0 }),
        // Cart count
        user
            ? supabase.from('shopping_cart').select('*', { count: 'exact', head: true }).eq('customer_id', user.id)
            : Promise.resolve({ count: 0 }),
    ]);

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
            user_profiles: { avatar_url: '/icons/intrustLogo.png', full_name: null }
        },
        ...(merchants || [])
    ];

    const customerProfile = customerProfileResult.data || null;
    const wishlistCount = wishlistCountResult.count || 0;
    const cartCount = cartCountResult.count || 0;

    return (
        <div className="min-h-screen bg-[#f7f8fa] dark:bg-[#080a10] relative pb-32 transition-colors">
            <Navbar />

            <main className="pt-[88px] md:pt-[104px]">

                {/* ── Top Header Bar ── */}
                <div className="sticky top-[76px] md:top-[92px] z-30 px-4 md:px-8 max-w-7xl mx-auto w-full mb-6 pointer-events-none">
                    <div className="bg-white/95 dark:bg-[#0c0e16]/95 backdrop-blur-2xl rounded-2xl md:rounded-[2rem] border border-slate-200/80 dark:border-white/[0.08] shadow-lg py-3 px-4 md:px-5 flex items-center justify-between gap-3 pointer-events-auto transition-shadow hover:shadow-xl">

                        {/* Title */}
                        <div className="flex items-center gap-2.5">
                            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-md shadow-indigo-500/25 shrink-0">
                                <ShoppingBag size={16} className="text-white" />
                            </span>
                            <div>
                                <h1 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                                    Intrust Mart
                                </h1>
                                <p className="text-[10px] md:text-xs text-slate-500 dark:text-white/40 font-bold leading-none mt-1">
                                    {allMerchants.length} stores near you
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 md:gap-3">
                            {user && (
                                <>
                                    <Link
                                        href="/wishlist"
                                        className="relative flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-xl bg-pink-50 dark:bg-pink-500/10 text-pink-500 border border-pink-100 dark:border-pink-500/20 hover:bg-pink-100 dark:hover:bg-pink-500/30 transition-colors"
                                    >
                                        <Heart size={18} className={wishlistCount > 0 ? 'fill-current' : ''} />
                                        {wishlistCount > 0 && (
                                            <span className="absolute -top-1.5 -right-1.5 bg-pink-500 text-white text-[10px] font-black w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-[#0c0e16]">
                                                {wishlistCount}
                                            </span>
                                        )}
                                    </Link>

                                    <Link
                                        href="/shop/cart"
                                        className="relative flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 transition-colors"
                                    >
                                        <ShoppingBag size={18} className={cartCount > 0 ? 'fill-current' : ''} />
                                        {cartCount > 0 && (
                                            <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[10px] font-black w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-[#0c0e16]">
                                                {cartCount}
                                            </span>
                                        )}
                                    </Link>

                                    <Link
                                        href="/orders"
                                        className="flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 transition-colors"
                                    >
                                        <Package size={18} />
                                    </Link>
                                </>
                            )}

                            {/* Wallet balance chip */}
                            {customerProfile && (
                                <Link
                                    href="/wallet"
                                    className="hidden sm:flex items-center gap-2.5 bg-slate-900 dark:bg-white/[0.06] rounded-xl px-4 py-2 border border-transparent hover:border-slate-700 dark:hover:border-white/10 transition-all border-slate-800"
                                >
                                    <Wallet size={16} className="text-[#FDB931]" />
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Balance</p>
                                        <p className="text-sm font-black text-white dark:text-white leading-none">
                                            ₹{(customerProfile.wallet_balance_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                        </p>
                                    </div>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Main Content ── */}
                <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4 pb-8">
                    <Breadcrumbs items={[{ label: 'Intrust Mart' }]} />
                    <ShopHubClient merchants={allMerchants} ratingsMap={ratingsMap} />
                </div>

            </main>

            <Footer />
            <CustomerBottomNav />
        </div>
    );
}
