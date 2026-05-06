'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, ArrowLeft, Loader2, ShoppingCart, Package, ChevronRight, BadgeCheck, Sparkles, SlidersHorizontal, Grid3X3, Heart, Zap, Shirt, Pill, Home, Utensils, Grid, Star, MapPin, Store } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { useTheme } from '@/lib/contexts/ThemeContext';
import ProductCardV2 from './ProductCardV2';
import FloatingCart from './FloatingCart';
import ConfirmModal from '@/components/ui/ConfirmModal';
import AdBannerCarousel from '@/components/customer/dashboard/AdBannerCarousel';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCardSkeleton from '@/components/customer/shop/ProductCardSkeleton';
import MerchantProfileCard from '@/components/customer/shop/MerchantProfileCard';
import FlashSale from '@/components/customer/shop/FlashSale';

export default function StorefrontV2Client({ merchant, initialInventory, customer }) {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [cart, setCart] = useState([]);
    const [wishlistIds, setWishlistIds] = useState(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [activeSubCategory, setActiveSubCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [pendingCartItem, setPendingCartItem] = useState(null);
    const [liveMerchant, setLiveMerchant] = useState(merchant);

    useEffect(() => {
        setLiveMerchant(merchant);
    }, [merchant]);

    const supabase = createClient();

    useEffect(() => {
        if (!liveMerchant?.id) return;

        let channel;
        if (liveMerchant.id === 'official') {
            channel = supabase
                .channel('platform_settings_updates')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_settings', filter: 'key=eq.platform_store' }, (payload) => {
                    if (payload.new?.value) {
                        let parsedStatus = { is_open: true };
                        try { parsedStatus = JSON.parse(payload.new.value); } catch(e) {}
                        setLiveMerchant(prev => ({ ...prev, is_open: parsedStatus.is_open }));
                    }
                })
                .subscribe();
        } else {
            channel = supabase
                .channel(`merchant_updates_${liveMerchant.id}`)
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'merchants', filter: `id=eq.${liveMerchant.id}` }, (payload) => {
                    if (payload.new) {
                        setLiveMerchant(prev => ({ ...prev, is_open: payload.new.is_open }));
                    }
                })
                .subscribe();
        }

        return () => {
            supabase.removeChannel(channel);
        };
    }, [liveMerchant?.id]);

    const isStoreOpen = useMemo(() => {
        return !!liveMerchant.is_open;
    }, [liveMerchant.is_open]);

    // Preserve User's core sync logic
    useEffect(() => {
        if (customer?.id) {
            Promise.all([syncCartFromDB(), syncWishlistFromDB()]).finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, [customer?.id]);

    const syncWishlistFromDB = async () => {
        const { data } = await supabase
            .from('user_wishlists')
            .select('product_id')
            .eq('user_id', customer.id);
        if (data) setWishlistIds(new Set(data.map(r => r.product_id)));
    };

    const toggleWishlist = async (item) => {
        if (!customer?.id) {
            router.push('/login');
            return;
        }
        const productId = item.product_id;
        const alreadySaved = wishlistIds.has(productId);

        if (alreadySaved) {
            const { error } = await supabase
                .from('user_wishlists')
                .delete()
                .eq('user_id', customer.id)
                .eq('product_id', productId);
            if (!error) {
                setWishlistIds(prev => { const next = new Set(prev); next.delete(productId); return next; });
                toast.success('Removed from wishlist');
            } else {
                console.error('Wishlist remove error:', error);
                toast.error('Could not remove from wishlist');
            }
        } else {
            const isPlatform = !!item.is_platform_direct;
            const { error } = await supabase.from('user_wishlists').upsert({
                user_id: customer.id,
                product_id: productId,
                merchant_id: isPlatform ? null : (item.merchant_id || null),
                inventory_id: isPlatform ? null : item.id,
                is_platform_item: isPlatform,
            }, { onConflict: 'user_id,product_id' });
            if (!error) {
                setWishlistIds(prev => new Set([...prev, productId]));
                toast.success('Saved to wishlist! ♥');
            } else {
                console.error('Wishlist save error:', error);
                toast.error('Could not save to wishlist');
            }
        }
    };

    const syncCartFromDB = async () => {
        const { data } = await supabase
            .from('shopping_cart')
            .select('*')
            .eq('customer_id', customer.id);

        if (data) {
            const mappedCart = data.map(item => {
                const inventoryItem = initialInventory.find(i =>
                    item.is_platform_item ? (i.product_id === item.product_id && i.is_platform_direct) : (i.id === item.inventory_id)
                );
                return { ...inventoryItem, quantity: item.quantity, cart_row_id: item.id };
            }).filter(i => i.id);
            setCart(mappedCart);
        }
    };

    const addToCart = useCallback(async (item) => {
        if (!isStoreOpen) {
            toast.error("Store is currently closed and not accepting orders.");
            return;
        }
        if (!customer?.id) {
            router.push('/login');
            return;
        }

        // Optimistic update — instantly reflect in UI
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...item, quantity: 1 }];
        });

        try {
            const isPlatform = !!item.is_platform_direct;
            const { data, error } = await supabase.rpc('add_to_shopping_cart', {
                p_customer_id: customer.id,
                p_inventory_id: isPlatform ? null : item.id,
                p_product_id: item.product_id,
                p_quantity: 1,
                p_is_platform: isPlatform
            });

            if (error) throw error;

            if (data?.message === 'MIXED_SELLER_ERROR') {
                // Revert optimistic update
                setCart(prev => {
                    const existing = prev.find(i => i.id === item.id);
                    if (existing && existing.quantity > 1) {
                        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i);
                    }
                    return prev.filter(i => i.id !== item.id);
                });
                setPendingCartItem(item);
                setConfirmModalOpen(true);
                return;
            }
        } catch (err) {
            // Revert optimistic update on error
            setCart(prev => {
                const existing = prev.find(i => i.id === item.id);
                if (existing && existing.quantity > 1) {
                    return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i);
                }
                return prev.filter(i => i.id !== item.id);
            });
            console.error('Error adding to cart:', err);
            toast.error("Failed to add to cart");
        }
    }, [customer?.id, supabase, router, isStoreOpen]);

    const handleConfirmClearCart = async () => {
        if (!pendingCartItem) return;
        setConfirmModalOpen(false);
        try {
            await supabase.from('shopping_cart').delete().eq('customer_id', customer.id);
            await addToCart(pendingCartItem);
        } catch (err) {
            console.error('Error clearing cart:', err);
        }
        setPendingCartItem(null);
    };

    const handleCancelClearCart = () => {
        setConfirmModalOpen(false);
        setPendingCartItem(null);
    };

    const removeFromCart = useCallback(async (item) => {
        const cartItem = cart.find(i => i.id === item.id);
        if (!cartItem) return;

        // Optimistic update — instantly reflect in UI
        setCart(prev => {
            if (cartItem.quantity > 1) {
                return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i);
            }
            return prev.filter(i => i.id !== item.id);
        });

        try {
            if (cartItem.quantity > 1) {
                await supabase
                    .from('shopping_cart')
                    .update({ quantity: cartItem.quantity - 1 })
                    .eq('id', cartItem.cart_row_id);
            } else {
                await supabase
                    .from('shopping_cart')
                    .delete()
                    .eq('id', cartItem.cart_row_id);
            }
        } catch (err) {
            // Revert optimistic update on error
            setCart(prev => {
                const existing = prev.find(i => i.id === item.id);
                if (existing) {
                    return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
                }
                return [...prev, cartItem];
            });
            console.error('Error removing from cart:', err);
        }
    }, [cart, supabase]);

    const merchantCategories = useMemo(() => {
        return ['All', ...new Set(initialInventory.map(item => item.shopping_products?.category || 'Other'))];
    }, [initialInventory]);

    const getCategoryIcon = (category) => {
        const cat = category.toLowerCase();
        if (cat === 'all') return <Grid size={14} />;
        if (cat.includes('grocer') || cat.includes('fmcg') || cat.includes('mart')) return <ShoppingCart size={14} />;
        if (cat.includes('food') || cat.includes('restaurant')) return <Utensils size={14} />;
        if (cat.includes('electronic') || cat.includes('mobile')) return <Zap size={14} />;
        if (cat.includes('cloth') || cat.includes('fashion') || cat.includes('apparel')) return <Shirt size={14} />;
        if (cat.includes('pharma') || cat.includes('med')) return <Pill size={14} />;
        if (cat.includes('beauty') || cat.includes('cosmetic')) return <Sparkles size={14} />;
        if (cat.includes('home') || cat.includes('kitchen') || cat.includes('decor')) return <Home size={14} />;
        return <Package size={14} />;
    };

    const filteredItems = initialInventory.filter(item => {
        const titleMatch = item.shopping_products?.title?.toLowerCase().includes(searchQuery.toLowerCase());
        const subMatch = activeSubCategory === 'All' || item.shopping_products?.category === activeSubCategory;
        return titleMatch && subMatch;
    });

    const totalItems = cart.reduce((acc, item) => acc + (item.quantity || 0), 0);
    const totalPrice = cart.reduce((acc, item) => {
        const price = item.retail_price_paise || 0;
        return acc + (price * (item.quantity || 0));
    }, 0);

    const totalMrp = cart.reduce((acc, item) => {
        const itemMrp = item.shopping_products?.mrp_paise || item.shopping_products?.suggested_retail_price_paise || item.retail_price_paise || 0;
        return acc + (itemMrp * (item.quantity || 0));
    }, 0);

    const totalSavings = totalMrp - totalPrice;

    const primaryColor = '#3b82f6'; // Light Blue (tailwind blue-500)
    const secondaryColor = '#60a5fa'; // Blue-400
    const avatarUrl = merchant?.user_profiles?.avatar_url || (Array.isArray(merchant?.user_profiles) ? merchant?.user_profiles[0]?.avatar_url : null);

    const flashSaleItems = useMemo(() => {
        if (liveMerchant?.id !== 'official') return [];
        return initialInventory.filter(item => {
            const mrp = item.shopping_products?.mrp_paise || item.shopping_products?.suggested_retail_price_paise || item.retail_price_paise || 0;
            const price = item.retail_price_paise || 0;
            return mrp > price;
        }).slice(0, 3);
    }, [initialInventory, liveMerchant?.id]);

    return (
        <div className={`relative min-h-screen flex flex-col transition-all duration-700`}>

            <div className="relative min-h-screen flex flex-col pt-12 md:pt-14">

            {/* ====== CREATIVE AMBIENT BACKGROUND ====== */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className={`absolute inset-0 ${isDark ? 'bg-[#080a10]' : 'bg-[#f7f8fa]'}`} />
                <div
                    className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[120%] h-[70%] rounded-full"
                    style={{ background: `radial-gradient(ellipse, ${primaryColor}${isDark ? '20' : '0c'} 0%, transparent 70%)`, filter: 'blur(60px)' }}
                />
                <div
                    className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[50%] rounded-full"
                    style={{ background: `radial-gradient(circle, ${secondaryColor}${isDark ? '12' : '06'} 0%, transparent 60%)`, filter: 'blur(80px)' }}
                />
                <div className={`absolute inset-0 ${isDark ? 'opacity-[0.04]' : 'opacity-[0.02]'}`}
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }}
                />
            </div>

            {/* ====== STICKY HEADER — FROSTED GLASS ====== */}
            <div className="sticky top-[76px] md:top-[92px] z-30 px-2 sm:px-4 md:px-6 max-w-7xl mx-auto w-full mb-4 pointer-events-none">
                <header
                    className={`pointer-events-auto backdrop-blur-xl rounded-2xl md:rounded-[2rem] border transition-all overflow-hidden flex flex-col ${isDark ? 'bg-[#080a10]/85 border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.3)]' : 'bg-white/95 border-slate-200/80 shadow-lg'
                        }`}
                >
                    {/* Top Row */}
                    <div className="flex items-center gap-3 px-4 py-3 md:px-5">
                        <button
                            onClick={() => router.push('/shop')}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl shrink-0 transition-all ${isDark ? 'hover:bg-white/5 text-white/60' : 'hover:bg-slate-100 text-slate-600'}`}
                        >
                            <ArrowLeft size={20} />
                        </button>

                        {/* Search - Desktop AND Mobile inline for sticky bar */}
                        <div className="flex-1 w-full relative">
                            <Search size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40' : 'text-slate-400'}`} />
                            <input
                                type="text"
                                placeholder={`Search for items in ${merchant?.business_name}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-10 pr-4 py-2 md:py-2.5 rounded-full text-sm font-medium outline-none transition-all border ${
                                    isDark 
                                        ? 'bg-[#0a0c14]/50 text-white placeholder:text-white/30 border-white/[0.08] focus:bg-[#0a0c14] focus:border-white/20' 
                                        : 'bg-white/50 text-slate-900 placeholder:text-slate-400 border-slate-200 hover:border-slate-300 hover:bg-white focus:border-blue-500 focus:bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]'
                                    }`}
                            />
                        </div>
                    </div>



                    {/* Animated Subcategory Pills */}
                    {merchantCategories.length > 1 && (
                        <div className={`relative flex items-center gap-2 px-4 md:px-5 py-3 overflow-x-auto no-scrollbar border-t ${isDark ? 'border-white/[0.04]' : 'border-slate-100'}`}>
                            {merchantCategories.map(sub => {
                                const isActive = activeSubCategory === sub;
                                return (
                                    <button
                                        key={sub}
                                        onClick={() => setActiveSubCategory(sub)}
                                        className={`relative px-4 py-2 flex items-center gap-2 rounded-full text-xs font-bold whitespace-nowrap outline-none transition-colors ${
                                            isActive 
                                                ? 'text-white' 
                                                : isDark ? 'text-white/40 hover:text-white/80' : 'text-slate-500 hover:text-slate-900'
                                        }`}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeCategoryPill"
                                                className="absolute inset-0 bg-blue-500 rounded-full shadow-lg shadow-blue-500/20"
                                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                            />
                                        )}
                                        <div className="relative z-10 flex items-center gap-1.5">
                                            <span className={isActive ? 'text-white' : ''}>{getCategoryIcon(sub)}</span>
                                            {sub}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </header>
            </div>

            {/* MAIN CONTENT AREA */}
            <main className="w-full px-2 sm:px-4 md:px-6 flex-1 py-4 md:py-6 relative z-10">
                <div className="max-w-7xl mx-auto pb-32">
                    
                    {/* AD BANNER */}
                    <div className="w-full relative z-10 mb-4">
                        <AdBannerCarousel />
                    </div>

                    {/* MERCHANT PROFILE HEADER (Mobile-First) */}
                    <MerchantProfileCard 
                        merchant={liveMerchant} 
                        totalItems={initialInventory.length} 
                        isStoreOpen={isStoreOpen}
                    />

                    {/* FLASH SALE */}
                    {liveMerchant?.id === 'official' && flashSaleItems.length > 0 && (
                        <FlashSale
                            items={flashSaleItems}
                            cart={cart}
                            onAdd={addToCart}
                            onRemove={removeFromCart}
                            isStoreOpen={isStoreOpen}
                            primaryColor={primaryColor}
                            secondaryColor={secondaryColor}
                        />
                    )}

                    {/* Store Closed Browsing Note */}
                    {!isStoreOpen && (
                        <div className={`mt-4 mb-2 md:mt-6 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 ${isDark ? 'bg-amber-500/10 border border-amber-500/20 text-amber-200' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'bg-amber-500/20' : 'bg-white shadow-sm'}`}>
                                    <Store size={20} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
                                </div>
                                <div className="flex flex-col">
                                    <h4 className="font-bold text-sm">Not Acccepting Orders</h4>
                                    <p className="text-xs font-medium opacity-80 mt-0.5">You can still explore our inventory, but ordering is turned off. Check back soon!</p>
                                </div>
                            </div>
                        </div>
                    )}
                    {isLoading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
                            {Array.from({ length: 10 }).map((_, i) => (
                                <ProductCardSkeleton key={`psk-${i}`} />
                            ))}
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className={`py-20 text-center rounded-3xl mt-10 ${isDark ? 'bg-white/[0.03] border border-white/[0.05]' : 'bg-white shadow-sm border border-slate-100'}`}>
                            <Package className={isDark ? 'text-white/10 mx-auto mb-4' : 'text-slate-300 mx-auto mb-4'} size={48} />
                            <h3 className={`text-lg font-black uppercase tracking-widest ${isDark ? 'text-white/30' : 'text-slate-600'}`}>No items found</h3>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
                            {filteredItems.map(item => (
                                <ProductCardV2
                                    key={item.id}
                                    item={item}
                                    cartItem={cart.find(i => i.id === item.id)}
                                    onAdd={() => addToCart(item)}
                                    onRemove={() => removeFromCart(item)}
                                    primaryColor={primaryColor}
                                    secondaryColor={secondaryColor}
                                    isWishlisted={wishlistIds.has(item.product_id)}
                                    onWishlist={() => toggleWishlist(item)}
                                    isStoreOpen={isStoreOpen}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* FLOATING CART */}
            {totalItems > 0 && isStoreOpen && (
                <FloatingCart
                    count={totalItems}
                    total={totalPrice}
                    savings={totalSavings}
                    items={cart}
                    customer={customer}
                    onClear={() => setCart([])}
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                />
            )}

            <ConfirmModal
                isOpen={confirmModalOpen}
                onConfirm={handleConfirmClearCart}
                onCancel={handleCancelClearCart}
                title="Different Store"
                message="Your cart contains items from another seller. Clear cart to add this item?"
                confirmLabel="Clear & Add"
                cancelLabel="Cancel"
            />
            </div>
        </div>
    );
}
