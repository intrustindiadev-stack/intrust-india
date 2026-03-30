import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { Wallet, Heart, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import ShopHubClient from './ShopHubClient';

export const dynamic = 'force-dynamic';

export default async function CategoryHubPage() {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch dynamic categories
    const { data: categories } = await supabase
        .from('shopping_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

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
                    {/* Header & Wallet Section */}
                    <div className="bg-white dark:bg-[#0c0e16] px-4 py-6 md:px-8 border-b border-slate-100 dark:border-white/[0.04] mb-2">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">
                                    Shop Now
                                </h1>
                                <p className="text-slate-500 dark:text-white/30 font-medium text-sm">
                                    Browse local product categories
                                </p>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                {user && (
                                    <>
                                        <Link href="/wishlist" className="bg-pink-50 dark:bg-pink-500/10 hover:bg-pink-100 dark:hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 rounded-2xl p-2.5 border border-pink-100 dark:border-pink-500/20 flex flex-col items-center justify-center shrink-0 transition-colors w-14 h-[62px] relative group">
                                            <Heart size={20} className={wishlistCount > 0 ? "fill-current" : "transition-transform group-hover:scale-110"} />
                                            <span className="text-[9px] font-black uppercase mt-1">Saved</span>
                                            {wishlistCount > 0 && (
                                                <span className="absolute -top-1.5 -right-1.5 bg-pink-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-[#0c0e16]">
                                                    {wishlistCount}
                                                </span>
                                            )}
                                        </Link>

                                        <Link href="/shop/cart" className="bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl p-2.5 border border-indigo-100 dark:border-indigo-500/20 flex flex-col items-center justify-center shrink-0 transition-colors w-14 h-[62px] relative group">
                                            <ShoppingBag size={20} className={cartCount > 0 ? "fill-current" : "transition-transform group-hover:scale-110"} />
                                            <span className="text-[9px] font-black uppercase mt-1">Cart</span>
                                            {cartCount > 0 && (
                                                <span className="absolute -top-1.5 -right-1.5 bg-indigo-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-[#0c0e16]">
                                                    {cartCount}
                                                </span>
                                            )}
                                        </Link>
                                    </>
                                )}

                                {customerProfile && (
                                    <div className="bg-slate-50 dark:bg-white/[0.04] rounded-2xl p-2.5 border border-slate-100 dark:border-white/[0.06] flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-slate-950 dark:bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-[0_4px_12px_rgba(37,99,235,0.2)]">
                                            <Wallet size={20} />
                                        </div>
                                        <div className="pr-2">
                                            <p className="text-[9px] font-black text-slate-400 dark:text-white/25 uppercase tracking-widest mb-0.5">Balance</p>
                                            <p className="text-base font-black text-slate-900 dark:text-white leading-none">
                                                ₹{(customerProfile.wallet_balance_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <ShopHubClient categories={categories || []} />
                    </div>
                </div>
            </main>

            <Footer />
            <CustomerBottomNav />
        </div>
    );
}
