'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShoppingBag, Star, ShieldCheck, Plus, Check, ArrowRight, Zap, Store, Heart } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { getProductFallbackImage } from '@/lib/shopping/categories';
import toast from 'react-hot-toast';

function TrendingProductsGrid() {
    const router = useRouter();
    const { user, profile } = useAuth();
    const activeCustomer = profile || user;
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addedId, setAddedId] = useState(null);
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [pendingProduct, setPendingProduct] = useState(null);
    const [wishlistIds, setWishlistIds] = useState(new Set());
    const [wishlistLoading, setWishlistLoading] = useState(new Set());

    useEffect(() => {
        if (activeCustomer?.id) {
            supabase
                .from('user_wishlists')
                .select('product_id')
                .eq('user_id', activeCustomer.id)
                .then(({ data }) => {
                    if (data) setWishlistIds(new Set(data.map(r => r.product_id)));
                });
        }
    }, [activeCustomer?.id]);

    const toggleWishlist = async (e, prod) => {
        e.preventDefault();
        e.stopPropagation();

        if (!activeCustomer?.id) {
            toast.error('Please sign in to save items');
            router.push('/login?next=/dashboard');
            return;
        }

        if (wishlistLoading.has(prod.id)) return;

        setWishlistLoading(prev => new Set(prev).add(prod.id));

        const isSaved = wishlistIds.has(prod.id);
        if (isSaved) {
            setWishlistIds(prev => {
                const next = new Set(prev);
                next.delete(prod.id);
                return next;
            });
        } else {
            setWishlistIds(prev => new Set([...prev, prod.id]));
        }

        try {
            if (isSaved) {
                const { error } = await supabase
                    .from('user_wishlists')
                    .delete()
                    .eq('user_id', activeCustomer.id)
                    .eq('product_id', prod.id);

                if (error) throw error;
                toast.success('Removed from wishlist');
            } else {
                const { error } = await supabase
                    .from('user_wishlists')
                    .upsert({
                        user_id: activeCustomer.id,
                        product_id: prod.id,
                        is_platform_item: true
                    }, { onConflict: 'user_id,product_id' });

                if (error) throw error;
                toast.success('Saved to wishlist! ♥');
            }
        } catch (err) {
            console.error('Wishlist toggle error:', err);
            // Rollback optimistic state
            if (isSaved) {
                setWishlistIds(prev => new Set([...prev, prod.id]));
            } else {
                setWishlistIds(prev => {
                    const next = new Set(prev);
                    next.delete(prod.id);
                    return next;
                });
            }
            toast.error(err.message || 'Could not update wishlist');
        } finally {
            setWishlistLoading(prev => {
                const next = new Set(prev);
                next.delete(prod.id);
                return next;
            });
        }
    };

    useEffect(() => {
        const fetchTrending = async () => {
            try {
                const { data, error } = await supabase
                    .from('shopping_products')
                    .select(`
                        id,
                        title,
                        slug,
                        description,
                        suggested_retail_price_paise,
                        platform_price_paise,
                        mrp_paise,
                        admin_stock,
                        product_images,
                        category
                    `)
                    .eq('is_active', true)
                    .order('created_at', { ascending: false })
                    .limit(8);

                if (!error && data && data.length > 0) {
                    const mapped = data.map(p => ({
                        id: p.id,
                        title: p.title,
                        slug: p.slug,
                        description: p.description,
                        selling_price: Math.round(((p.platform_price_paise || p.suggested_retail_price_paise || 0) / 100)),
                        mrp: Math.round(((p.mrp_paise || p.suggested_retail_price_paise || 0) / 100)),
                        stock_quantity: p.admin_stock,
                        images: p.product_images || [],
                        category: p.category || 'General',
                        rating: 4.8,
                        merchants: { business_name: 'InTrust Official' }
                    }));
                    setProducts(mapped);
                } else {
                    setProducts([]);
                }
            } catch (err) {
                console.error('Failed to fetch trending products:', err);
                setProducts([]);
            } finally {
                setLoading(false);
            }
        };

        fetchTrending();
    }, []);

    const executeAddToCart = async (product) => {
        try {
            const { data, error } = await supabase.rpc('add_to_shopping_cart', {
                p_customer_id: activeCustomer.id,
                p_inventory_id: null,
                p_product_id: product.id,
                p_variant_id: null,
                p_quantity: 1,
                p_is_platform: true
            });

            if (error) throw error;

            if (data?.message === 'MIXED_SELLER_ERROR') {
                setPendingProduct(product);
                setConfirmModalOpen(true);
                return;
            }

            window.dispatchEvent(new Event('cartUpdated'));
            setAddedId(product.id);
            toast.success(`Added ${product.title} to your cart`);
        } catch (err) {
            console.error('Error adding to cart:', err);
            toast.error('Failed to add item to cart');
        } finally {
            setLoading(false);
            setTimeout(() => setAddedId(null), 1500);
        }
    };

    const handleAddToCart = async (e, product) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (!activeCustomer?.id) {
            toast.error('Please sign in to add items to your cart');
            router.push('/login?next=/dashboard');
            return;
        }

        await executeAddToCart(product);
    };

    const handleConfirmClearCart = async () => {
        if (!pendingProduct || !activeCustomer?.id) return;
        setConfirmModalOpen(false);
        try {
            await supabase.from('shopping_cart').delete().eq('customer_id', activeCustomer.id);
            await executeAddToCart(pendingProduct);
        } catch (err) {
            console.error('Error clearing cart:', err);
            toast.error('Failed to replace cart');
        }
        setPendingProduct(null);
    };

    if (!loading && products.length === 0) {
        return null;
    }

    if (loading) {
        return (
            <div className="w-full space-y-4">
                <div className="h-8 w-48 bg-surface-container-high rounded-xl animate-pulse" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {[1, 2, 3, 4].map((n) => (
                        <div key={n} className="h-64 bg-surface-container-low rounded-2xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg sm:text-2xl font-black text-on-surface tracking-tight flex items-center gap-2">
                        <span>Deals of the Day</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5 hidden sm:block">
                        Selected offers on verified products with InTrust Buyer Protection.
                    </p>
                </div>
                <Link
                    href="/shop"
                    className="text-xs font-bold text-blue-600 dark:text-primary hover:text-blue-700 flex items-center gap-1 group"
                >
                    <span>View All</span>
                    <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>

            {/* Responsive 2-column mobile, 3-column tablet, 4-column desktop */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                {products.map((prod) => {
                    const discount = prod.mrp && prod.selling_price 
                        ? Math.round(((prod.mrp - prod.selling_price) / prod.mrp) * 100)
                        : 0;

                    const isAdded = addedId === prod.id;
                    const isWishlisted = wishlistIds.has(prod.id);
                    const isWishlistBusy = wishlistLoading.has(prod.id);
                    const imageUrl = getProductFallbackImage(prod);

                    return (
                        <Link
                            key={prod.id}
                            href={`/shop/product/${prod.slug || prod.id}`}
                            className="group flex flex-col justify-between bg-surface-container-lowest hover:bg-surface-container-low rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-outline-variant/30 hover:border-blue-500/50 shadow-xs hover:shadow-lg transition-all duration-300 relative"
                        >
                            <div>
                                {/* Image backplate */}
                                <div className="relative w-full aspect-square rounded-xl sm:rounded-2xl overflow-hidden bg-surface-container-low mb-2.5 sm:mb-4 flex items-center justify-center p-2 sm:p-3">
                                    <img
                                        src={imageUrl}
                                        alt={prod.title}
                                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                    />

                                    {/* Discount badge */}
                                    {discount > 0 && (
                                        <div className="absolute top-2 left-2 px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg bg-rose-600 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-xs">
                                            {discount}% OFF
                                        </div>
                                    )}

                                    {/* Rating badge */}
                                    <div className="absolute bottom-2 left-2 px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg bg-surface-container-lowest/90 backdrop-blur-md text-on-surface text-[9px] sm:text-[10px] font-black flex items-center gap-1 shadow-xs">
                                        <Star size={10} className="text-amber-500 fill-amber-500" />
                                        <span>{prod.rating || '4.8'}</span>
                                    </div>

                                    {/* Animated Wishlist Heart Button */}
                                    <motion.button
                                        type="button"
                                        disabled={isWishlistBusy}
                                        whileTap={isWishlistBusy ? {} : { scale: 1.35 }}
                                        whileHover={isWishlistBusy ? {} : { scale: 1.1 }}
                                        onClick={(e) => toggleWishlist(e, prod)}
                                        className={`absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all z-10 ${
                                            isWishlistBusy ? 'opacity-70 cursor-wait' : ''
                                        } ${
                                            isWishlisted 
                                                ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-500 border border-rose-200 dark:border-rose-800 shadow-sm'
                                                : 'bg-white/80 dark:bg-black/50 text-slate-400 hover:text-rose-500 border border-slate-200/60 dark:border-white/10'
                                        }`}
                                        title={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
                                        aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
                                    >
                                        <motion.div
                                            animate={isWishlisted ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <Heart size={14} className={isWishlisted ? "fill-rose-500 text-rose-500" : "currentColor"} />
                                        </motion.div>
                                    </motion.button>
                                </div>

                                {/* Category & Merchant */}
                                <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-brand-steel font-semibold mb-1 truncate">
                                    <Store size={11} className="text-blue-600 dark:text-primary shrink-0" />
                                    <span className="truncate">{prod.merchants?.business_name || 'Verified Store'}</span>
                                </div>

                                {/* Title */}
                                <h3 className="font-bold text-xs sm:text-sm text-on-surface line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-primary transition-colors">
                                    {prod.title}
                                </h3>
                            </div>

                            {/* Price and Cart Action */}
                            <div className="pt-2.5 sm:pt-4 mt-2 sm:mt-3 border-t border-outline-variant/20 flex items-center justify-between gap-1.5 sm:gap-2">
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-baseline gap-1 truncate">
                                        <span className="text-sm sm:text-lg font-black text-on-surface">
                                            ₹{Number(prod.selling_price).toLocaleString('en-IN')}
                                        </span>
                                        {prod.mrp && prod.mrp > prod.selling_price && (
                                            <span className="text-[10px] sm:text-xs text-brand-steel line-through font-semibold hidden xs:inline">
                                                ₹{Number(prod.mrp).toLocaleString('en-IN')}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 truncate">
                                        Earn Coins
                                    </span>
                                </div>

                                <motion.button
                                    type="button"
                                    whileTap={{ scale: 0.88 }}
                                    onClick={(e) => handleAddToCart(e, prod)}
                                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-black text-xs flex items-center justify-center transition-all shrink-0 shadow-md ${
                                        isAdded
                                            ? 'bg-emerald-600 text-white shadow-emerald-500/25'
                                            : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-500/25'
                                    }`}
                                    title="Add to Cart"
                                >
                                    {isAdded ? (
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                            <Check size={16} strokeWidth={3} />
                                        </motion.div>
                                    ) : (
                                        <Plus size={16} strokeWidth={3} />
                                    )}
                                </motion.button>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Replace Cart Modal */}
            <ConfirmModal
                isOpen={confirmModalOpen}
                title="Replace items in cart?"
                message="Your cart already contains items from another store. InTrust supports ordering from one merchant at a time. Would you like to clear your current cart and add this item?"
                confirmLabel="Discard & Add"
                cancelLabel="Keep Current Cart"
                onConfirm={handleConfirmClearCart}
                onCancel={() => {
                    setConfirmModalOpen(false);
                    setPendingProduct(null);
                }}
            />
        </div>
    );
}

export default React.memo(TrendingProductsGrid);
