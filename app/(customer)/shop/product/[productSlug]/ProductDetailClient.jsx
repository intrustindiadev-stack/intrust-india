'use client';

import { useState, useEffect } from 'react';
import {
    ShoppingCart,
    ShieldCheck,
    Truck,
    Store,
    Plus,
    Minus,
    Loader2,
    Package,
    CheckCircle2,
    BadgeCheck,
    ChevronRight,
    Zap,
    ArrowLeft,
    Heart,
    CreditCard,
    AlertCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { isPdpProductOOS, isInventoryRowOOS, OOS_LABEL, isPlatformProductOOS } from '@/lib/shopping/stock';
import OutOfStockOverlay from '@/components/ui/OutOfStockOverlay';
import OutOfStockBanner from '@/components/ui/OutOfStockBanner';
import OutOfStockBadge from '@/components/ui/OutOfStockBadge';
import NotifyMeButton from '@/components/ui/NotifyMeButton';

export default function ProductDetailClient({ product, inventory, customer, recommendedProducts = [], initialPlatformStatus }) {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(false);
    const [buyNowLoading, setBuyNowLoading] = useState(false);
    const [addedToCart, setAddedToCart] = useState(false);
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [wishlistLoading, setWishlistLoading] = useState(false);
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [selectedOfferId, setSelectedOfferId] = useState(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [isPlatformOpen, setIsPlatformOpen] = useState(initialPlatformStatus?.is_open ?? true);
    const [merchantStatuses, setMerchantStatuses] = useState(new Map()); // Map<id, is_open>
    const [isClosedAnimation, setIsClosedAnimation] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        if (!customer?.id) return;
        supabase
            .from('user_wishlists')
            .select('id')
            .eq('user_id', customer.id)
            .eq('product_id', product.id)
            .maybeSingle()
            .then(({ data }) => setIsWishlisted(!!data));
    }, [customer?.id, product.id]);

    // Initialize merchant statuses
    useEffect(() => {
        const statusMap = new Map();
        inventory.forEach(inv => {
            if (inv.merchants) {
                statusMap.set(inv.merchants.id, inv.merchants.is_open);
            }
        });
        setMerchantStatuses(statusMap);
    }, [inventory]);

    // Real-time synchronization for store status
    useEffect(() => {
        // 1. Sync Platform Store
        const platformChannel = supabase
            .channel('pdp_platform_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_settings', filter: 'key=eq.platform_store' }, (payload) => {
                if (payload.new?.value) {
                    try {
                        const parsed = JSON.parse(payload.new.value);
                        setIsPlatformOpen(parsed.is_open);
                    } catch (e) { }
                }
            })
            .subscribe();

        // 2. Sync Merchants in inventory
        const activeMerchantIds = inventory.map(inv => inv.merchants?.id).filter(Boolean);
        if (activeMerchantIds.length === 0) return () => { supabase.removeChannel(platformChannel); };

        const merchantChannel = supabase
            .channel('pdp_merchants_sync')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'merchants'
            }, (payload) => {
                if (payload.new && activeMerchantIds.includes(payload.new.id)) {
                    setMerchantStatuses(prev => {
                        const next = new Map(prev);
                        next.set(payload.new.id, payload.new.is_open);
                        return next;
                    });
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(platformChannel);
            supabase.removeChannel(merchantChannel);
        };
    }, [inventory]);

    const toggleWishlist = async () => {
        if (!customer?.id) {
            toast.error('Please login to save items');
            return;
        }
        setWishlistLoading(true);
        try {
            if (isWishlisted) {
                const { error } = await supabase
                    .from('user_wishlists')
                    .delete()
                    .eq('user_id', customer.id)
                    .eq('product_id', product.id);
                if (!error) {
                    setIsWishlisted(false);
                    toast.success('Removed from wishlist');
                } else {
                    console.error('Wishlist remove error:', error);
                    toast.error('Could not remove from wishlist');
                }
            } else {
                const { error } = await supabase.from('user_wishlists').upsert({
                    user_id: customer.id,
                    product_id: product.id,
                    merchant_id: selectedOffer.is_platform_direct ? null : (inventory[0]?.merchant_id || null),
                    inventory_id: selectedOffer.is_platform_direct ? null : (selectedOffer.id || null),
                    is_platform_item: !!selectedOffer.is_platform_direct,
                }, { onConflict: 'user_id,product_id' });
                if (!error) {
                    setIsWishlisted(true);
                    toast.success('Saved to wishlist! ♥');
                } else {
                    console.error('Wishlist save error:', error);
                    toast.error('Could not save to wishlist');
                }
            }
        } finally {
            setWishlistLoading(false);
        }
    };

    // Offers logic
    const platformOffer = {
        is_platform_direct: true,
        retail_price_paise: product.suggested_retail_price_paise,
        merchant_name: 'InTrust Official',
        stock: product.admin_stock
    };

    const allOffers = [
        platformOffer,
        ...inventory.map(inv => ({
            id: inv.id,
            is_platform_direct: false,
            // For platform-managed rows, use the authoritative price from shopping_products.
            // retail_price_paise on merchant_inventory can be stale between admin updates.
            // See migration: 20260514_sync_platform_inventory_retail_price.sql
            retail_price_paise: inv.is_platform_product
                ? (product.suggested_retail_price_paise ?? inv.retail_price_paise)
                : inv.retail_price_paise,
            merchant_name: inv.merchants?.business_name || 'Merchant',
            merchant_location: inv.merchants?.business_address || '',
            stock: inv.stock_quantity,
            stock_quantity: inv.stock_quantity,
            is_active: inv.is_active
        }))
    ].sort((a, b) => a.retail_price_paise - b.retail_price_paise);

    const productIsOOS = isPdpProductOOS({ product, inventory });
    const isOfferOOS = (off) => off.is_platform_direct ? isPlatformProductOOS(product) : isInventoryRowOOS(off);
    const defaultOffer = allOffers.find(o => !isOfferOOS(o)) || allOffers[0];
    const selectedOffer = allOffers.find(o => (o.is_platform_direct ? selectedOfferId === 'platform' : o.id === selectedOfferId)) || defaultOffer;
    const selectedOfferIsOOS = isOfferOOS(selectedOffer);
    const isOutOfStock = productIsOOS || selectedOfferIsOOS;

    const isStoreOpen = selectedOffer.is_platform_direct
        ? isPlatformOpen
        : (merchantStatuses.get(inventory.find(i => i.id === selectedOffer.id)?.merchant_id) ?? true);

    const triggerClosedAnimation = () => {
        setIsClosedAnimation(true);
        setTimeout(() => setIsClosedAnimation(false), 500);
    };

    const addToCart = async () => {
        if (productIsOOS || selectedOfferIsOOS) {
            toast.error('This item is currently out of stock');
            return;
        }
        if (!isStoreOpen) {
            triggerClosedAnimation();
            return;
        }
        if (!customer) {
            toast.error('Please login to add to cart');
            router.push('/login');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('add_to_shopping_cart', {
                p_customer_id: customer.id,
                p_inventory_id: selectedOffer.is_platform_direct ? null : selectedOffer.id,
                p_product_id: product.id,
                p_quantity: quantity,
                p_is_platform: selectedOffer.is_platform_direct
            });

            if (error) throw error;

            if (data?.message === 'MIXED_SELLER_ERROR') {
                setConfirmModalOpen(true);
                return;
            }

            setAddedToCart(true);
            toast.success('Added to cart! 🛒');
            setTimeout(() => { setAddedToCart(false); }, 2000);
        } catch (err) {
            console.error('Add to cart error:', err);
            toast.error('Failed to add to cart');
        } finally {
            setLoading(false);
        }
    };

    const buyNow = async () => {
        if (productIsOOS || selectedOfferIsOOS) {
            toast.error('This item is currently out of stock');
            return;
        }
        if (!isStoreOpen) {
            triggerClosedAnimation();
            return;
        }
        if (!customer) {
            toast.error('Please login to purchase');
            router.push('/login');
            return;
        }
        setBuyNowLoading(true);
        try {
            const { data, error } = await supabase.rpc('add_to_shopping_cart', {
                p_customer_id: customer.id,
                p_inventory_id: selectedOffer.is_platform_direct ? null : selectedOffer.id,
                p_product_id: product.id,
                p_quantity: quantity,
                p_is_platform: selectedOffer.is_platform_direct
            });
            if (error) throw error;
            if (data?.message === 'MIXED_SELLER_ERROR') {
                // Clear cart and add anyway for Buy Now
                await supabase.from('shopping_cart').delete().eq('customer_id', customer.id);
                await supabase.rpc('add_to_shopping_cart', {
                    p_customer_id: customer.id,
                    p_inventory_id: selectedOffer.is_platform_direct ? null : selectedOffer.id,
                    p_product_id: product.id,
                    p_quantity: quantity,
                    p_is_platform: selectedOffer.is_platform_direct
                });
            }
            router.push('/shop/cart');
        } catch (err) {
            console.error('Buy now error:', err);
            toast.error('Failed to proceed. Try again.');
        } finally {
            setBuyNowLoading(false);
        }
    };

    const handleConfirmClearCart = async () => {
        setConfirmModalOpen(false);
        try {
            await supabase.from('shopping_cart').delete().eq('customer_id', customer.id);
            await addToCart();
        } catch (err) {
            console.error('Error clearing cart:', err);
        }
    };

    const handleCancelClearCart = () => {
        setConfirmModalOpen(false);
    };

    const primaryColor = '#3b82f6';
    const secondaryColor = '#60a5fa';

    // Pricing
    const sellingPrice = selectedOffer.retail_price_paise;
    const mrp = product.mrp_paise || product.suggested_retail_price_paise || sellingPrice;
    const finalMrp = mrp > sellingPrice ? mrp : sellingPrice;
    const savings = finalMrp - sellingPrice;
    const savingsPercent = finalMrp > 0 ? Math.round((savings / finalMrp) * 100) : 0;
    const categoryName = product.shopping_categories?.name || 'Category';

    return (
        <div className={`min-h-screen relative ${isDark ? 'bg-[#080a10]' : 'bg-[#f7f8fa]'}`}>

            {/* ====== AMBIENT BACKGROUND ====== */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className={`absolute inset-0 ${isDark ? 'bg-[#080a10]' : 'bg-[#f7f8fa]'}`} />
                <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] h-[60%]"
                    style={{
                        background: `radial-gradient(ellipse at center top, ${primaryColor}${isDark ? '18' : '0a'} 0%, transparent 60%)`,
                        filter: 'blur(40px)'
                    }}
                />
                <div
                    className="absolute top-[30%] right-0 w-[40%] h-[30%]"
                    style={{
                        background: `radial-gradient(circle, ${secondaryColor}${isDark ? '10' : '05'} 0%, transparent 60%)`,
                        filter: 'blur(60px)'
                    }}
                />
            </div>

            {/* ====== MAIN CONTENT ====== */}
            <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-8 pt-24 md:pt-28 pb-28 sm:pb-32 relative z-10">

                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className={`flex items-center gap-2 mb-3 px-1 py-1 rounded-xl transition-all group ${isDark ? 'text-white/40 hover:text-white/70' : 'text-slate-400 hover:text-slate-700'}`}
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                    <span className="text-xs font-bold uppercase tracking-wider">Back</span>
                </button>

                {/* Breadcrumb — compact on mobile */}
                <nav className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-4 sm:mb-6 overflow-x-auto whitespace-nowrap no-scrollbar">
                    <Link href="/shop" className={`transition-colors ${isDark ? 'text-white/30 hover:text-white/60' : 'text-slate-400 hover:text-slate-600'}`}>Shop</Link>
                    <ChevronRight size={10} className={isDark ? 'text-white/15' : 'text-slate-300'} />
                    <span
                        className="transition-colors"
                        style={{ color: isDark ? `${primaryColor}90` : primaryColor }}
                    >
                        {categoryName}
                    </span>
                    <ChevronRight size={10} className={isDark ? 'text-white/15' : 'text-slate-300'} />
                    <span className={isDark ? 'text-white/60' : 'text-slate-700'}>
                        {product.title.length > 20 ? product.title.substring(0, 20) + '...' : product.title}
                    </span>
                </nav>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-14">

                    {/* ====== LEFT: PRODUCT IMAGE ====== */}
                    <div className="lg:col-span-6">
                        <div
                            className={`aspect-[4/3] sm:aspect-square rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 md:p-16 flex items-center justify-center relative overflow-hidden ${isDark ? 'bg-[#0c0e16]' : 'bg-white shadow-sm'
                                }`}
                            style={{
                                border: isDark ? `1px solid ${primaryColor}15` : '1px solid #e2e8f0',
                                boxShadow: isDark
                                    ? `0 0 80px ${primaryColor}08, inset 0 0 60px ${primaryColor}05`
                                    : '0 4px 24px rgba(0,0,0,0.04)'
                            }}
                        >
                            {isDark && (
                                <div
                                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full"
                                    style={{
                                        background: `radial-gradient(circle, ${primaryColor}12 0%, transparent 70%)`,
                                        filter: 'blur(40px)'
                                    }}
                                />
                            )}

                            {(() => {
                                const allImages = product.product_images?.length
                                    ? product.product_images
                                    : [];
                                const displayUrl = allImages[selectedImageIndex] || null;
                                return displayUrl ? (
                                    <img
                                        src={displayUrl}
                                        alt={product.title}
                                        className={`w-full h-full object-contain relative z-10 ${isDark ? '' : 'mix-blend-multiply'}`}
                                    />
                                ) : (
                                    <div className={`flex flex-col items-center justify-center ${isDark ? 'text-white/10' : 'text-slate-200'}`}>
                                        <Package size={60} strokeWidth={1} />
                                    </div>
                                );
                            })()}

                            {isOutOfStock && <OutOfStockOverlay />}

                            {/* Badges */}
                            <div className="absolute top-3 left-3 sm:top-5 sm:left-5 flex flex-col gap-1.5 z-20">
                                {savingsPercent > 0 && (
                                    <div className="text-white px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-black shadow-lg"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {savingsPercent}% OFF
                                    </div>
                                )}
                                <div
                                    className="px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white"
                                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                                >
                                    {categoryName}
                                </div>
                            </div>

                            {/* Wishlist Heart Button */}
                            <button
                                onClick={toggleWishlist}
                                disabled={wishlistLoading}
                                className="absolute top-3 right-3 sm:top-5 sm:right-5 w-10 h-10 rounded-full bg-white/90 dark:bg-[#080a10]/80 backdrop-blur-sm flex items-center justify-center shadow-md transition-all hover:scale-110 active:scale-95 z-30 border border-white/20"
                                style={isDark ? { borderColor: `${primaryColor}20` } : {}}
                            >
                                {wishlistLoading
                                    ? <Loader2 size={16} className="animate-spin text-slate-400" />
                                    : <Heart
                                        size={18}
                                        className={isWishlisted ? 'text-pink-500' : (isDark ? 'text-white/40' : 'text-slate-400')}
                                        fill={isWishlisted ? 'currentColor' : 'none'}
                                        strokeWidth={isWishlisted ? 0 : 2}
                                    />
                                }
                            </button>
                        </div>

                        {/* Thumbnail strip — shown only when multiple images exist */}
                        {(() => {
                            const allImages = product.product_images?.length > 1
                                ? product.product_images
                                : null;
                            if (!allImages) return null;
                            return (
                                <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
                                    {allImages.map((url, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setSelectedImageIndex(idx)}
                                            className={`shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${idx === selectedImageIndex
                                                ? isDark
                                                    ? 'border-white/40 scale-105'
                                                    : 'border-slate-700 scale-105'
                                                : isDark
                                                    ? 'border-white/10 opacity-60 hover:opacity-100'
                                                    : 'border-slate-200 opacity-70 hover:opacity-100'
                                                }`}
                                            style={idx === selectedImageIndex ? { borderColor: primaryColor } : {}}
                                        >
                                            <img
                                                src={url}
                                                alt={`View ${idx + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>

                    {/* ====== RIGHT: PRODUCT INFO ====== */}
                    <div className="lg:col-span-6 flex flex-col">

                        {/* Title + Description */}
                        <h1 className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight leading-tight mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {product.title}
                        </h1>
                        {productIsOOS && <OutOfStockBadge variant="solid" size="md" className="mb-3" />}
                        <p className={`text-xs sm:text-sm font-medium leading-relaxed mb-4 line-clamp-3 ${isDark ? 'text-white/35' : 'text-slate-500'}`}>
                            {product.description || 'Premium quality product vetted by InTrust for our customers.'}
                        </p>

                        {isOutOfStock && (
                            <div className="mb-4">
                                <OutOfStockBanner />
                            </div>
                        )}

                        <div className="mb-6">
                            <div className="flex items-baseline gap-2">
                                <span className={`text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    ₹{(sellingPrice / 100).toLocaleString('en-IN')}
                                </span>
                                {finalMrp > sellingPrice && (
                                    <span className={`text-lg line-through ${isDark ? 'text-white/20' : 'text-slate-400'}`}>
                                        ₹{(finalMrp / 100).toLocaleString('en-IN')}
                                    </span>
                                )}
                            </div>
                            {savingsPercent > 0 && (
                                <p className="text-xs font-bold mt-1" style={{ color: primaryColor }}>
                                    Save ₹{(savings / 100).toLocaleString('en-IN')} ({savingsPercent}% OFF)
                                </p>
                            )}
                        </div>

                        {allOffers.length > 1 && (
                            <div className="mb-6">
                                <p className={`text-[10px] uppercase tracking-wider font-extrabold mb-2 ${isDark ? 'text-white/25' : 'text-slate-400'}`}>
                                    Available from
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {allOffers.map((offer) => {
                                        const isOOS = isOfferOOS(offer);
                                        const isReallySelected = offer.is_platform_direct 
                                            ? selectedOffer.is_platform_direct 
                                            : selectedOffer.id === offer.id;
                                        
                                        if (isOOS) {
                                            return (
                                                <span 
                                                    key={offer.id || 'platform'}
                                                    className={`px-3 py-2 rounded-lg text-xs font-black opacity-40 line-through cursor-not-allowed border ${isDark ? 'bg-white/5 border-white/10 text-white/50' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                                                >
                                                    {offer.merchant_name}
                                                </span>
                                            );
                                        }

                                        return (
                                            <button
                                                key={offer.id || 'platform'}
                                                onClick={() => setSelectedOfferId(offer.is_platform_direct ? 'platform' : offer.id)}
                                                className={`px-3 py-2 rounded-lg text-xs font-black transition-all border ${
                                                    isReallySelected
                                                        ? 'border-primary shadow-sm'
                                                        : isDark ? 'bg-white/5 border-white/10 text-white/60 hover:border-white/20' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                                }`}
                                                style={isReallySelected ? { borderColor: primaryColor, color: primaryColor, backgroundColor: isDark ? `${primaryColor}10` : `${primaryColor}05` } : {}}
                                            >
                                                {offer.merchant_name}
                                            </button>
                                        );
                                    })}
                                </div>
                                {selectedOfferIsOOS && (
                                    <p className="text-xs text-red-600 font-bold mt-1 flex items-center gap-1">
                                        <AlertCircle size={12}/> This option is currently unavailable
                                    </p>
                                )}
                                {/* TODO: extend per-attribute when product_variants table lands */}
                            </div>
                        )}

                        {/* ====== DESKTOP ACTIONS ====== */}
                        <div className="hidden sm:block mb-4 space-y-3">
                                    {/* Quantity + Add to Cart row */}
                                    <div className="flex items-center gap-3">
                                        {/* Quantity stepper */}
                                        <div
                                            className={`flex items-center p-1 rounded-xl flex-shrink-0 ${isDark ? 'bg-white/[0.04]' : 'bg-white shadow-sm'}`}
                                            style={{ 
                                                border: isDark ? `1px solid ${primaryColor}15` : '1px solid #e2e8f0',
                                                opacity: isOutOfStock ? 0.5 : 1,
                                                pointerEvents: isOutOfStock ? 'none' : 'auto'
                                            }}
                                        >
                                            <button
                                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                                className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${isDark ? 'text-white/50 hover:text-white hover:bg-white/[0.06]' : 'text-slate-500 hover:bg-slate-100'}`}
                                            >
                                                <Minus size={16} strokeWidth={3} />
                                            </button>
                                            <span className={`w-10 text-center font-black text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                {quantity}
                                            </span>
                                            <button
                                                onClick={() => setQuantity(quantity + 1)}
                                                className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${isDark ? 'text-white/50 hover:text-white hover:bg-white/[0.06]' : 'text-slate-500 hover:bg-slate-100'}`}
                                            >
                                                <Plus size={16} strokeWidth={3} />
                                            </button>
                                        </div>

                                        {/* Add to Cart */}
                                        <motion.button
                                            whileTap={{ scale: 0.97 }}
                                            whileHover={{ scale: 1.02 }}
                                            onClick={addToCart}
                                            disabled={loading || isOutOfStock}
                                            animate={{
                                                x: isClosedAnimation ? [-2, 2, -2, 2, 0] : 0,
                                                backgroundColor: isOutOfStock ? (isDark ? '#1e293b' : '#f1f5f9') : (isStoreOpen ? (addedToCart ? '#10b981' : primaryColor) : '#ef4444')
                                            }}
                                            transition={{
                                                x: { type: 'keyframes', duration: 0.4 },
                                                default: { type: 'spring', stiffness: 400, damping: 25 }
                                            }}
                                            className={`flex-1 h-12 rounded-xl font-black text-sm flex items-center justify-center gap-2.5 transition-all disabled:opacity-80 overflow-hidden relative shadow-lg ${isOutOfStock ? (isDark ? 'text-white/20' : 'text-slate-400') : 'text-white'}`}
                                        >
                                            <AnimatePresence mode="wait">
                                                {isOutOfStock ? (
                                                    <motion.div key="oos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                                        <OutOfStockBadge variant="solid" size="md" icon={true}/>
                                                    </motion.div>
                                                ) : !isStoreOpen ? (
                                                    <motion.div key="closed" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 line-clamp-1 px-2">
                                                        <Store size={18} strokeWidth={2.5} />
                                                        <span>STORE CLOSED</span>
                                                    </motion.div>
                                                ) : loading ? (
                                                    <motion.div key="loading" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 font-bold">
                                                        <Loader2 className="animate-spin" size={18} />
                                                        <span>Adding...</span>
                                                    </motion.div>
                                                ) : addedToCart ? (
                                                    <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 font-bold">
                                                        <CheckCircle2 size={18} strokeWidth={2.5} />
                                                        <span>In Cart!</span>
                                                    </motion.div>
                                                ) : (
                                                    <motion.div key="default" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 font-bold">
                                                        <ShoppingCart size={18} strokeWidth={2.5} />
                                                        <span>Add to Cart</span>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.button>
                                    </div>

                                    {(productIsOOS || selectedOfferIsOOS) && (
                                        <NotifyMeButton
                                            productId={product.id}
                                            inventoryId={selectedOffer?.is_platform_direct ? undefined : selectedOffer?.id}
                                            email={customer?.email}
                                            className="mt-1"
                                        />
                                    )}

                                    <motion.button
                                        whileTap={{ scale: 0.97 }}
                                        whileHover={{ scale: 1.01 }}
                                        onClick={buyNow}
                                        disabled={buyNowLoading || isOutOfStock}
                                        animate={{
                                            x: isClosedAnimation ? [-2, 2, -2, 2, 0] : 0,
                                            borderColor: isOutOfStock ? (isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0') : (isStoreOpen ? (isDark ? 'rgba(255,255,255,0.1)' : 'transparent') : '#ef4444'),
                                            backgroundColor: isOutOfStock ? (isDark ? 'transparent' : '#f8fafc') : (isStoreOpen ? (isDark ? 'rgba(255,255,255,0.06)' : '#0f172a') : '#ef4444')
                                        }}
                                        transition={{
                                            x: { type: 'keyframes', duration: 0.4 },
                                            default: { type: 'spring', stiffness: 400, damping: 25 }
                                        }}
                                        className={`w-full h-12 rounded-xl font-black text-sm flex items-center justify-center gap-2.5 transition-all border-2 ${isOutOfStock ? (isDark ? 'text-white/20' : 'text-slate-400') : 'text-white'}`}
                                    >
                                        {buyNowLoading ? (
                                            <><Loader2 className="animate-spin" size={18} /><span className="ml-1">Processing...</span></>
                                        ) : isOutOfStock ? (
                                            <span>{OOS_LABEL}</span>
                                        ) : !isStoreOpen ? (
                                            <><Store size={18} strokeWidth={2.5} /><span>NOT ACCEPTING ORDERS</span></>
                                        ) : (
                                            <><CreditCard size={18} strokeWidth={2.5} /><span>Buy Now</span></>
                                        )}
                                    </motion.button>
                        </div>

                        {/* ====== MERCHANT INFO ====== */}
                        <div
                            className={`p-3 sm:p-4 rounded-xl flex items-center justify-between mb-4 ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}
                            style={{ border: isDark ? `1px solid ${primaryColor}10` : '1px solid #e2e8f0' }}
                        >
                            <div className="flex items-center gap-2.5">
                                <div
                                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${isDark ? '' : 'bg-white shadow-sm border border-slate-200 text-slate-500'}`}
                                    style={isDark ? {
                                        background: `${primaryColor}15`,
                                        border: `1px solid ${primaryColor}20`,
                                        color: primaryColor
                                    } : {}}
                                >
                                    <Store size={16} strokeWidth={2} />
                                </div>
                                <div className="min-w-0">
                                    <p className={`text-[9px] sm:text-[10px] uppercase tracking-wider font-extrabold ${isDark ? 'text-white/25' : 'text-slate-400'}`}>Sold by</p>
                                    <div className="flex items-center gap-1">
                                        <p className={`font-black text-xs sm:text-sm truncate ${isDark ? 'text-white/80' : 'text-slate-800'}`}>{selectedOffer.merchant_name}</p>
                                        <BadgeCheck size={12} className="shrink-0" style={{ color: primaryColor }} />
                                    </div>
                                </div>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                                <div className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider`}
                                    style={{
                                        backgroundColor: isOutOfStock
                                            ? (isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)')
                                            : (isDark ? `${primaryColor}20` : `${primaryColor}10`),
                                        color: isOutOfStock ? '#ef4444' : primaryColor
                                    }}
                                >
                                    {isOutOfStock ? 'Out of Stock' : 'In Stock'}
                                </div>
                                {!isOutOfStock && <p className={`text-[9px] font-bold mt-0.5 ${isDark ? 'text-white/20' : 'text-slate-500'}`}>{selectedOffer.stock} left</p>}
                            </div>
                        </div>

                        {/* ====== TRUST BADGES ====== */}
                        <div className="grid grid-cols-4 gap-2 sm:gap-3">
                            {[
                                { icon: ShieldCheck, title: "Quality", sub: "Original" },
                                { icon: Truck, title: "Delivery", sub: "Tracked" },
                                { icon: CheckCircle2, title: "Secure", sub: "Safe Pay" },
                                { icon: BadgeCheck, title: "Genuine", sub: "Verified" }
                            ].map((f, i) => (
                                <div
                                    key={i}
                                    className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg sm:rounded-xl text-center ${isDark ? 'bg-white/[0.02]' : 'bg-white shadow-sm'}`}
                                    style={{ border: isDark ? `1px solid ${primaryColor}08` : '1px solid #f1f5f9' }}
                                >
                                    <f.icon
                                        className="mb-1"
                                        size={16}
                                        strokeWidth={1.5}
                                        style={{ color: isDark ? `${primaryColor}80` : '#64748b' }}
                                    />
                                    <p className={`text-[9px] sm:text-[10px] font-black leading-tight ${isDark ? 'text-white/50' : 'text-slate-700'}`}>{f.title}</p>
                                    <p className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider ${isDark ? 'text-white/15' : 'text-slate-400'}`}>{f.sub}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ====== RECOMMENDED PRODUCTS ====== */}
                {recommendedProducts.length > 0 && (
                    <div className="mt-8 sm:mt-12">
                        <h2 className={`text-lg sm:text-xl font-black mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            More in {categoryName}
                        </h2>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 -mx-3 px-3">
                            {recommendedProducts.map(item => {
                                const rProduct = item.shopping_products;
                                const rPrice = (item.retail_price_paise || 0) / 100;
                                const rMrp = (rProduct.mrp_paise || rProduct.suggested_retail_price_paise || item.retail_price_paise || 0) / 100;
                                const rSavings = rMrp > rPrice ? Math.round(((rMrp - rPrice) / rMrp) * 100) : 0;

                                return (
                                    <Link
                                        key={item.id}
                                        href={`/shop/product/${item.shopping_products?.slug}`}
                                        className={`flex-shrink-0 w-[140px] sm:w-[160px] rounded-xl overflow-hidden transition-all hover:shadow-md group ${isDark ? 'bg-[#12151c] border' : 'bg-white border border-slate-100 shadow-sm'
                                            }`}
                                        style={isDark ? { borderColor: `${primaryColor}10` } : {}}
                                    >
                                        <div className={`aspect-square p-3 flex items-center justify-center relative ${isDark ? 'bg-[#0c0e14]' : 'bg-slate-50/50'}`}>
                                            {rSavings > 0 && (
                                                <div className="absolute top-1.5 left-1.5 text-[9px] font-black text-white px-1.5 py-0.5 rounded-md z-10"
                                                    style={{ backgroundColor: primaryColor }}
                                                >
                                                    {rSavings}% OFF
                                                </div>
                                            )}
                                            {rProduct.product_images?.[0] ? (
                                                <img src={rProduct.product_images[0]} alt={rProduct.title} className={`w-[80%] h-[80%] object-contain group-hover:scale-105 transition-transform ${isDark ? '' : 'mix-blend-multiply'}`} />
                                            ) : (
                                                <Package size={24} className={isDark ? 'text-white/10' : 'text-slate-200'} />
                                            )}
                                        </div>
                                        <div className="p-2.5">
                                            <p className={`text-[10px] font-bold truncate mb-0.5 ${isDark ? 'text-white/25' : 'text-slate-400'}`}>
                                                Sold by {item.merchants?.business_name || 'InTrust Official'}
                                            </p>
                                            <h4 className={`text-xs font-bold line-clamp-2 leading-tight min-h-[2.4em] mb-1.5 ${isDark ? 'text-white/70' : 'text-slate-800'}`}>
                                                {rProduct.title}
                                            </h4>
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                    ₹{rPrice.toLocaleString('en-IN')}
                                                </span>
                                                {rMrp > rPrice && (
                                                    <span className={`text-[10px] line-through ${isDark ? 'text-white/20' : 'text-slate-400'}`}>
                                                        ₹{rMrp.toLocaleString('en-IN')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* ====== MOBILE STICKY ADD TO CART BAR ====== */}
            <div className={`fixed bottom-0 left-0 w-full z-50 sm:hidden backdrop-blur-xl border-t ${isDark ? 'bg-[#080a10]/90 border-white/[0.06]' : 'bg-white/95 border-slate-200'}`}>
                <div className="flex flex-col w-full">
                    <div className="flex items-center gap-3 px-3 py-3">
                        <div className="flex-1 min-w-0">
                            <p className={`text-lg font-black leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                ₹{((sellingPrice * quantity) / 100).toLocaleString('en-IN')}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        disabled={isOutOfStock}
                                        className={`w-6 h-6 flex items-center justify-center rounded-md text-xs font-black ${isOutOfStock ? 'opacity-20' : (isDark ? 'bg-white/[0.08] text-white/60' : 'bg-slate-100 text-slate-600')}`}
                                    >
                                        <Minus size={12} strokeWidth={3} />
                                    </button>
                                    <span className={`text-xs font-black w-5 text-center ${isOutOfStock ? 'opacity-20' : (isDark ? 'text-white/70' : 'text-slate-700')}`}>{quantity}</span>
                                    <button
                                        onClick={() => setQuantity(quantity + 1)}
                                        disabled={isOutOfStock}
                                        className={`w-6 h-6 flex items-center justify-center rounded-md text-xs font-black ${isOutOfStock ? 'opacity-20' : (isDark ? 'bg-white/[0.08] text-white/60' : 'bg-slate-100 text-slate-600')}`}
                                    >
                                        <Plus size={12} strokeWidth={3} />
                                    </button>
                                </div>
                                {savings > 0 && quantity > 0 && (
                                    <span className={`text-[10px] font-bold`} style={{ color: primaryColor }}>
                                        Save ₹{((savings * quantity) / 100).toLocaleString('en-IN')}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={addToCart}
                                    disabled={loading || isOutOfStock}
                                    animate={{
                                        x: isClosedAnimation ? [-2, 2, -2, 2, 0] : 0,
                                        backgroundColor: isOutOfStock ? (isDark ? '#1e293b' : '#f1f5f9') : (isStoreOpen ? (addedToCart ? '#10b981' : primaryColor) : '#ef4444')
                                    }}
                                    transition={{
                                        x: { type: 'keyframes', duration: 0.4 },
                                        default: { type: 'spring', stiffness: 400, damping: 25 }
                                    }}
                                    className={`flex-1 h-12 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-80 relative overflow-hidden ${isOutOfStock ? (isDark ? 'text-white/20' : 'text-slate-400') : 'text-white'}`}
                                    style={{
                                        boxShadow: addedToCart
                                            ? '0 0 20px rgba(16,185,129,0.45)'
                                            : (isOutOfStock ? 'none' : `0 4px 14px ${primaryColor}35`)
                                    }}
                                >
                                    <AnimatePresence mode="wait">
                                        {isOutOfStock ? (
                                            <motion.div key="oos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                                {OOS_LABEL}
                                            </motion.div>
                                        ) : !isStoreOpen ? (
                                            <motion.div key="closed" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                                                <Store size={18} strokeWidth={2.5} />
                                                <span>CLOSED</span>
                                            </motion.div>
                                        ) : loading ? (
                                            <motion.div key="loading" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="flex items-center gap-2">
                                                <Loader2 className="animate-spin" size={16} />
                                            </motion.div>
                                        ) : addedToCart ? (
                                            <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 400 }} className="flex items-center gap-1.5">
                                                <CheckCircle2 size={16} strokeWidth={2.5} />
                                                <span>Added!</span>
                                            </motion.div>
                                        ) : (
                                            <motion.div key="default" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                                                <ShoppingCart size={16} strokeWidth={2.5} />
                                                <span>Add</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.button>

                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={buyNow}
                                    disabled={buyNowLoading || isOutOfStock}
                                    className={`h-12 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all border-2 shrink-0 ${
                                        isOutOfStock 
                                            ? (isDark ? 'bg-white/5 text-white/20 border-white/5' : 'bg-slate-50 text-slate-400 border-slate-100')
                                            : (isDark ? 'bg-white/[0.08] text-white border-white/10' : 'bg-slate-900 text-white border-slate-900')
                                    }`}
                                >
                                    {buyNowLoading ? (
                                        <Loader2 className="animate-spin" size={15} />
                                    ) : isOutOfStock ? (
                                        <span>{OOS_LABEL}</span>
                                    ) : (
                                        <><CreditCard size={15} strokeWidth={2.5} /><span>Buy Now</span></>
                                    )}
                                </motion.button>
                    </div>
                    {(productIsOOS || selectedOfferIsOOS) && (
                        <div className="px-3 pb-3">
                            <NotifyMeButton
                                productId={product.id}
                                inventoryId={selectedOffer?.is_platform_direct ? undefined : selectedOffer?.id}
                                email={customer?.email}
                                variant="outline"
                                className="w-full h-10 text-xs"
                            />
                        </div>
                    )}
                </div>
            </div>

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
