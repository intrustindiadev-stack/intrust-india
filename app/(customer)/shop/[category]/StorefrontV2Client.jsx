'use client';

import { useState, useEffect } from 'react';
import { Search, ArrowLeft, Loader2, ShoppingCart, Package, ChevronRight, BadgeCheck, Sparkles, SlidersHorizontal, Grid3X3, Heart } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { useTheme } from '@/lib/contexts/ThemeContext';
import ProductCardV2 from './ProductCardV2';
import FloatingCart from './FloatingCart';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';

export default function StorefrontV2Client({ category, categoryMetadata, initialInventory, customer }) {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [cart, setCart] = useState([]);
    const [wishlistIds, setWishlistIds] = useState(new Set());
    const [activeSubCategory, setActiveSubCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [cartLoading, setCartLoading] = useState(false);
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [pendingCartItem, setPendingCartItem] = useState(null);
    const supabase = createClient();

    // Preserve User's core sync logic
    useEffect(() => {
        if (customer?.id) {
            syncCartFromDB();
            syncWishlistFromDB();
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
            const { error } = await supabase.from('user_wishlists').upsert({
                user_id: customer.id,
                product_id: productId,
                merchant_id: item.merchant_id || null,
                inventory_id: item.is_platform_direct ? null : item.id,
                is_platform_item: !!item.is_platform_direct,
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
        setCartLoading(true);
        const { data, error } = await supabase
            .from('shopping_cart')
            .select('*')
            .eq('customer_id', customer.id);

        if (data) {
            const mappedCart = data.map(item => {
                const inventoryItem = initialInventory.find(i =>
                    item.is_platform_item
                        ? (i.product_id === item.product_id && i.is_platform_direct)
                        : (i.id === item.inventory_id)
                );
                return { ...inventoryItem, quantity: item.quantity, cart_row_id: item.id };
            });
            setCart(mappedCart);
        }
        setCartLoading(false);
    };

    const addToCart = async (item) => {
        if (!customer?.id) {
            router.push('/login');
            return;
        }

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
                setPendingCartItem(item);
                setConfirmModalOpen(true);
                return;
            }

            syncCartFromDB();
        } catch (err) {
            console.error('Error adding to cart:', err);
            toast.error("Failed to add to cart");
        }
    };

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

    const removeFromCart = async (item) => {
        const cartItem = cart.find(i => i.id === item.id);
        if (!cartItem) return;

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
            syncCartFromDB();
        } catch (err) {
            console.error('Error removing from cart:', err);
        }
    };

    const subCategories = ['All', 'Premium', 'New Arrivals', 'Best Sellers', 'Trending'];

    const filteredItems = initialInventory.filter(item => {
        const matchesSearch = item.shopping_products.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSub = activeSubCategory === 'All' ||
            (activeSubCategory === 'Premium' && item.retail_price_paise > 500000) ||
            (activeSubCategory === 'New Arrivals');
        return matchesSearch && matchesSub;
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

    const primaryColor = categoryMetadata?.color_primary || '#3b82f6';
    const secondaryColor = categoryMetadata?.color_secondary || '#4f46e5';

    return (
        <div className="relative min-h-screen flex flex-col">
            
            {/* ====== CREATIVE AMBIENT BACKGROUND ====== */}
            {/* Aurora / Nebula Glow: Category color radiates from top */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                {/* Base */}
                <div className={`absolute inset-0 ${isDark ? 'bg-[#080a10]' : 'bg-[#f7f8fa]'}`} />
                
                {/* Primary Aurora — top center spotlight */}
                <div 
                    className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[120%] h-[70%] rounded-full"
                    style={{ 
                        background: `radial-gradient(ellipse, ${primaryColor}${isDark ? '20' : '0c'} 0%, transparent 70%)`,
                        filter: 'blur(60px)'
                    }}
                />
                
                {/* Secondary Aurora — bottom right */}
                <div 
                    className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[50%] rounded-full"
                    style={{ 
                        background: `radial-gradient(circle, ${secondaryColor}${isDark ? '12' : '06'} 0%, transparent 60%)`,
                        filter: 'blur(80px)'
                    }}
                />

                {/* Subtle noise overlay for depth */}
                <div className={`absolute inset-0 ${isDark ? 'opacity-[0.04]' : 'opacity-[0.02]'}`}
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }}
                />
            </div>

            {/* ====== STICKY HEADER — FROSTED GLASS ====== */}
            <header 
                className={`sticky top-20 md:top-24 z-30 w-full backdrop-blur-2xl border-b transition-all ${
                    isDark 
                        ? 'bg-[#080a10]/70 border-white/[0.06] shadow-[0_1px_30px_rgba(0,0,0,0.3)]' 
                        : 'bg-white/80 border-slate-200/80 shadow-sm'
                }`}
            >
                {/* Top Row */}
                <div className="flex items-center gap-3 px-4 py-3 md:px-6">
                    <button
                        onClick={() => router.push('/shop')}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl shrink-0 transition-all ${isDark ? 'hover:bg-white/5 text-white/60' : 'hover:bg-slate-100 text-slate-600'}`}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 
                            className={`text-lg md:text-xl font-black capitalize leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}
                            style={isDark ? { textShadow: `0 0 30px ${primaryColor}40` } : {}}
                        >
                            {category}
                        </h1>
                        <p 
                            className="text-[10px] font-bold uppercase tracking-[0.2em]"
                            style={{ color: primaryColor }}
                        >
                            {initialInventory.length} Items Available
                        </p>
                    </div>

                    {/* Search - Desktop */}
                    <div className="flex-1 max-w-sm hidden sm:block relative">
                        <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30' : 'text-slate-400'}`} />
                        <input
                            type="text"
                            placeholder={`Search ${category}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm font-semibold outline-none transition-all ${
                                isDark 
                                    ? 'bg-white/[0.06] text-white placeholder:text-white/25 focus:bg-white/[0.10] border border-white/[0.06] focus:border-white/10' 
                                    : 'bg-slate-100 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200'
                            }`}
                        />
                    </div>
                </div>

                {/* Mobile Search */}
                <div className="px-4 pb-3 sm:hidden">
                    <div className="relative">
                        <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30' : 'text-slate-400'}`} />
                        <input
                            type="text"
                            placeholder={`Search ${category}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm font-semibold outline-none transition-all ${
                                isDark 
                                    ? 'bg-white/[0.06] text-white placeholder:text-white/25 border border-white/[0.06]' 
                                    : 'bg-slate-100 text-slate-900 placeholder:text-slate-400'
                            }`}
                        />
                    </div>
                </div>

                {/* Subcategory Pills — category-colored active state */}
                <div className={`flex items-center gap-2 px-4 py-2.5 overflow-x-auto no-scrollbar border-t ${isDark ? 'border-white/[0.04]' : 'border-slate-100'}`}>
                    {subCategories.map(sub => {
                        const isActive = activeSubCategory === sub;
                        return (
                            <button
                                key={sub}
                                onClick={() => setActiveSubCategory(sub)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                                    isActive
                                        ? 'text-white border-transparent shadow-lg'
                                        : isDark 
                                            ? 'bg-transparent text-white/40 border-white/[0.06] hover:border-white/10 hover:text-white/60' 
                                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                                }`}
                                style={isActive ? { 
                                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                                    boxShadow: isDark ? `0 4px 20px ${primaryColor}30` : `0 2px 10px ${primaryColor}25`
                                } : {}}
                            >
                                {sub}
                            </button>
                        );
                    })}
                </div>
            </header>

            {/* ====== PRODUCT GRID ====== */}
            <main className="w-full px-2 sm:px-4 md:px-6 flex-1 py-4 md:py-6 relative z-10">
                <div className="max-w-7xl mx-auto pb-32">
                    {filteredItems.length === 0 ? (
                        <div className={`py-20 text-center rounded-3xl mt-10 ${isDark ? 'bg-white/[0.03] border border-white/[0.05]' : 'bg-white shadow-sm border border-slate-100'}`}>
                            <Package className={isDark ? 'text-white/10 mx-auto mb-4' : 'text-slate-300 mx-auto mb-4'} size={48} />
                            <h3 className={`text-lg font-black uppercase tracking-widest ${isDark ? 'text-white/30' : 'text-slate-600'}`}>No items found</h3>
                            <p className={`font-medium mt-1 text-sm ${isDark ? 'text-white/15' : 'text-slate-500'}`}>Try searching for something else.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
                            <AnimatePresence mode="popLayout">
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
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </main>

            {/* FLOATING CART */}
            {totalItems > 0 && (
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
    );
}
