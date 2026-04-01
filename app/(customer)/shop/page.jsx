import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { Wallet, Heart, ShoppingBag, Package } from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import ShopHubClient from './ShopHubClient';

export const dynamic = 'force-dynamic';

export default async function MerchantHubPage() {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch active merchants with user_profiles
    const { data: merchants } = await supabase
        .from('merchants')
        .select(`
            id, 
            business_name,
            user_profiles!left (avatar_url)
        `)
        .eq('status', 'approved')
        .order('business_name', { ascending: true });

    const allMerchants = [
        {
            id: 'official',
            business_name: 'Intrust Official',
            user_profiles: { avatar_url: '/icons/intrustLogo.png' }
        },
        ...(merchants || [])
    ];

    let customerProfile = null;
    let wishlistCount = 0;
    let cartCount = 0;

    if (user) {
        const { data } = await supabase
            .from('user_profiles')
            .select('wallet_balance_paise')
            .eq('id', user.id)
            .single();
        customerProfile = data;

        const { count } = await supabase
            .from('user_wishlists')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
        wishlistCount = count || 0;

        const { count: cartResCount } = await supabase
            .from('shopping_cart')
            .select('*', { count: 'exact', head: true })
            .eq('customer_id', user.id);
        cartCount = cartResCount || 0;
    }

    return (
        <div className="min-h-screen bg-[#f7f8fa] dark:bg-[#080a10] relative pb-20 transition-colors">
            <Navbar />

            <main className="pt-24 md:pt-28">
                <div className="max-w-7xl mx-auto">

                    {/* ── Page Header ── */}
                    <div className="bg-white dark:bg-[#0c0e16] px-4 py-5 md:px-8 border-b border-slate-100 dark:border-white/[0.04]">
                        <div className="flex items-center justify-between">
                            {/* Left: Title */}
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1 flex items-center gap-2.5">
                                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/30 shrink-0">
                                        <ShoppingBag size={18} className="text-white" />
                                    </span>
                                    Intrust Mart
                                </h1>
                                <p className="text-slate-500 dark:text-white/30 font-medium text-sm">
                                    Shop top local brands &amp; merchants
                                </p>
                            </div>

                            {/* Right: Quick-action tiles */}
                            <div className="flex items-center gap-2 md:gap-3">
                                {user && (
                                    <>
                                        <Link
                                            href="/wishlist"
                                            className="bg-pink-50 dark:bg-pink-500/10 hover:bg-pink-100 dark:hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 rounded-2xl p-2.5 border border-pink-100 dark:border-pink-500/20 flex flex-col items-center justify-center shrink-0 transition-colors w-[52px] h-[58px] relative group"
                                        >
                                            <Heart size={18} className={wishlistCount > 0 ? 'fill-current' : 'transition-transform group-hover:scale-110'} />
                                            <span className="text-[9px] font-black uppercase mt-1">Saved</span>
                                            {wishlistCount > 0 && (
                                                <span className="absolute -top-1.5 -right-1.5 bg-pink-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-[#0c0e16]">
                                                    {wishlistCount}
                                                </span>
                                            )}
                                        </Link>

                                        <Link
                                            href="/shop/cart"
                                            className="bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl p-2.5 border border-indigo-100 dark:border-indigo-500/20 flex flex-col items-center justify-center shrink-0 transition-colors w-[52px] h-[58px] relative group"
                                        >
                                            <ShoppingBag size={18} className={cartCount > 0 ? 'fill-current' : 'transition-transform group-hover:scale-110'} />
                                            <span className="text-[9px] font-black uppercase mt-1">Cart</span>
                                            {cartCount > 0 && (
                                                <span className="absolute -top-1.5 -right-1.5 bg-indigo-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-[#0c0e16]">
                                                    {cartCount}
                                                </span>
                                            )}
                                        </Link>

                                        <Link
                                            href="/orders"
                                            className="bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl p-2.5 border border-emerald-100 dark:border-emerald-500/20 flex flex-col items-center justify-center shrink-0 transition-colors w-[52px] h-[58px] relative group"
                                        >
                                            <Package size={18} className="transition-transform group-hover:scale-110" />
                                            <span className="text-[9px] font-black uppercase mt-1">Orders</span>
                                        </Link>
                                    </>
                                )}

                                {customerProfile && (
                                    <div className="hidden sm:flex bg-slate-50 dark:bg-white/[0.04] rounded-2xl p-2.5 border border-slate-100 dark:border-white/[0.06] items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-xl bg-slate-950 dark:bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-[0_4px_12px_rgba(37,99,235,0.2)]">
                                            <Wallet size={18} />
                                        </div>
                                        <div className="pr-1">
                                            <p className="text-[9px] font-black text-slate-400 dark:text-white/25 uppercase tracking-widest mb-0.5">Balance</p>
                                            <p className="text-sm font-black text-slate-900 dark:text-white leading-none">
                                                ₹{(customerProfile.wallet_balance_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Main Content (search + banners + merchant grid) ── */}
                    <div className="bg-white dark:bg-[#0c0e16] px-4 pt-5 pb-8 md:px-8">
                        <ShopHubClient merchants={allMerchants} />
                    </div>

                </div>
            </main>

            <Footer />
            <CustomerBottomNav />
        </div>
    );
}
