import { createServerSupabaseClient } from '@/lib/supabaseServer';
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

    // Fetch active merchants with profile image + more fields
    const { data: merchants } = await supabase
        .from('merchants')
        .select(`
            id,
            business_name,
            business_address,
            user_profiles!left (avatar_url, full_name)
        `)
        .eq('status', 'approved')
        .order('business_name', { ascending: true });

    const allMerchants = [
        {
            id: 'official',
            business_name: 'Intrust Official',
            business_address: null,
            user_profiles: { avatar_url: '/icons/intrustLogo.png', full_name: null }
        },
        ...(merchants || [])
    ];

    let customerProfile = null;
    let wishlistCount = 0;
    let cartCount = 0;

    if (user) {
        const { data } = await supabase
            .from('user_profiles')
            .select('wallet_balance_paise, full_name, avatar_url')
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

            <main className="pt-20 md:pt-24">

                {/* ── Top Header Bar ── */}
                <div className="bg-white dark:bg-[#0c0e16] sticky top-[64px] md:top-[72px] z-20 border-b border-slate-100 dark:border-white/[0.04] shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-3">

                        {/* Title */}
                        <div className="flex items-center gap-2.5">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-md shadow-indigo-500/25 shrink-0">
                                <ShoppingBag size={15} className="text-white" />
                            </span>
                            <div>
                                <h1 className="text-base md:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none">
                                    Intrust Mart
                                </h1>
                                <p className="text-[10px] text-slate-400 dark:text-white/30 font-medium leading-none mt-0.5 hidden sm:block">
                                    {allMerchants.length} stores near you
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            {user && (
                                <>
                                    <Link
                                        href="/wishlist"
                                        className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-500/10 text-pink-500 border border-pink-100 dark:border-pink-500/20 hover:bg-pink-100 dark:hover:bg-pink-500/20 transition-colors"
                                    >
                                        <Heart size={17} className={wishlistCount > 0 ? 'fill-current' : ''} />
                                        {wishlistCount > 0 && (
                                            <span className="absolute -top-1.5 -right-1.5 bg-pink-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-[#0c0e16]">
                                                {wishlistCount}
                                            </span>
                                        )}
                                    </Link>

                                    <Link
                                        href="/shop/cart"
                                        className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 border border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                                    >
                                        <ShoppingBag size={17} className={cartCount > 0 ? 'fill-current' : ''} />
                                        {cartCount > 0 && (
                                            <span className="absolute -top-1.5 -right-1.5 bg-indigo-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-[#0c0e16]">
                                                {cartCount}
                                            </span>
                                        )}
                                    </Link>

                                    <Link
                                        href="/orders"
                                        className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 border border-emerald-100 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                                    >
                                        <Package size={17} />
                                    </Link>
                                </>
                            )}

                            {/* Wallet balance chip */}
                            {customerProfile && (
                                <Link
                                    href="/wallet"
                                    className="hidden sm:flex items-center gap-2 bg-slate-900 dark:bg-white/[0.06] rounded-xl px-3 py-2 border border-transparent hover:border-slate-700 dark:hover:border-white/10 transition-all"
                                >
                                    <Wallet size={14} className="text-[#D4AF37]" />
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Balance</p>
                                        <p className="text-sm font-black text-white dark:text-white leading-none mt-0.5">
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
                    <ShopHubClient merchants={allMerchants} />
                </div>

            </main>

            <Footer />
            <CustomerBottomNav />
        </div>
    );
}
