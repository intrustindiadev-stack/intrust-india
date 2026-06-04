'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Wallet, Heart, ShoppingBag, Package } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';

export default function UserShopHeaderActions() {
    const { user, profile, loading } = useAuth();
    const [wishlistCount, setWishlistCount] = useState(0);
    const [cartCount, setCartCount] = useState(0);

    useEffect(() => {
        if (!user) return;

        let active = true;

        const fetchData = async () => {
            try {
                const [wishlistResult, cartResult] = await Promise.all([
                    supabase
                        .from('user_wishlists')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', user.id),
                    supabase
                        .from('shopping_cart')
                        .select('*', { count: 'exact', head: true })
                        .eq('customer_id', user.id)
                ]);

                if (active) {
                    setWishlistCount(wishlistResult.count || 0);
                    setCartCount(cartResult.count || 0);
                }
            } catch (err) {
                console.error('Error fetching header counts:', err);
            }
        };

        fetchData();

        // Subscribe to changes in wishlist and cart to keep them real-time!
        const wishlistChannel = supabase
            .channel(`wishlist_changes_${user.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'user_wishlists', filter: `user_id=eq.${user.id}` },
                () => {
                    fetchData();
                }
            )
            .subscribe();

        const cartChannel = supabase
            .channel(`cart_changes_${user.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'shopping_cart', filter: `customer_id=eq.${user.id}` },
                () => {
                    fetchData();
                }
            )
            .subscribe();

        return () => {
            active = false;
            supabase.removeChannel(wishlistChannel);
            supabase.removeChannel(cartChannel);
        };
    }, [user]);

    // Don't render anything while auth is loading or if user is guest
    if (loading || !user) {
        return null;
    }

    return (
        <div className="flex items-center gap-2 md:gap-3">
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

            {/* Wallet balance chip */}
            {profile && (
                <Link
                    href="/wallet"
                    className="hidden sm:flex items-center gap-2.5 bg-slate-900 dark:bg-white/[0.06] rounded-xl px-4 py-2 border border-transparent hover:border-slate-700 dark:hover:border-white/10 transition-all border-slate-800"
                >
                    <Wallet size={16} className="text-[#FDB931]" />
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Balance</p>
                        <p className="text-sm font-black text-white dark:text-white leading-none">
                            ₹{((profile.wallet_balance_paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                        </p>
                    </div>
                </Link>
            )}
        </div>
    );
}
