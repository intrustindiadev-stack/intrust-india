'use client';

import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
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
    ChevronLeft,
    Maximize2,
    ZoomIn,
    ZoomOut,
    X,
    Zap,
    ArrowLeft,
    Heart,
    CreditCard,
    AlertCircle,
    Phone,
    Sparkles,
    ShoppingBag,
    MapPin,
    RefreshCw,
    Star,
    Award,
} from 'lucide-react';
import CustomerBreadcrumbs from '@/components/common/CustomerBreadcrumbs';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { isPdpProductOOS, isInventoryRowOOS, OOS_LABEL, isPlatformProductOOS } from '@/lib/shopping/stock';
import { getProductFallbackImage } from '@/lib/shopping/categories';
import OutOfStockOverlay from '@/components/ui/OutOfStockOverlay';
import OutOfStockBadge from '@/components/ui/OutOfStockBadge';
import OutOfStockBanner from '@/components/ui/OutOfStockBanner';
import NotifyMeButton from '@/components/ui/NotifyMeButton';
import RecentlyViewed, { recordRecentlyViewed } from '@/components/commerce/RecentlyViewed';

// Lazy-load modal — only needed on rare cart-conflict path, keep it out of the initial bundle
const ConfirmModal = lazy(() => import('@/components/ui/ConfirmModal'));

export default function ProductDetailClient({ product, inventory, customer, variants = [], recommendedProducts = [], initialPlatformStatus }) {
    const router = useRouter();
    const { theme } = useTheme();
    const { user: authUser, profile: authProfile } = useAuth();
    const activeCustomer = authProfile || customer;
    const activeEmail = activeCustomer?.email || authUser?.email;
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
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [isZoomed, setIsZoomed] = useState(false);
    const [isPlatformOpen, setIsPlatformOpen] = useState(initialPlatformStatus?.is_open ?? true);
    const [merchantStatuses, setMerchantStatuses] = useState(new Map()); // Map<id, is_open>
    const [isClosedAnimation, setIsClosedAnimation] = useState(false);
    const [cartCount, setCartCount] = useState(0);
    const [activeDetailTab, setActiveDetailTab] = useState('highlights');

    // Comprehensive multi-image resolution
    const allImages = useMemo(() => {
        const list = [];
        if (selectedVariant?.fashion_variant_media?.length) {
            selectedVariant.fashion_variant_media.forEach(m => {
                if (m.image_url && !list.includes(m.image_url)) list.push(m.image_url);
            });
        }
        if (Array.isArray(product.product_images)) {
            product.product_images.forEach(img => {
                if (img && !list.includes(img)) list.push(img);
            });
        }
        if (Array.isArray(product.images)) {
            product.images.forEach(img => {
                if (img && !list.includes(img)) list.push(img);
            });
        }
        if (product.image && !list.includes(product.image)) list.push(product.image);
        if (product.image_url && !list.includes(product.image_url)) list.push(product.image_url);

        if (list.length === 0) {
            list.push(getProductFallbackImage(product));
        }
        return list;
    }, [selectedVariant, product]);

    // Keyboard navigation for image lightbox
    useEffect(() => {
        if (!isLightboxOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsLightboxOpen(false);
                setIsZoomed(false);
            } else if (e.key === 'ArrowLeft') {
                setSelectedImageIndex(prev => (prev > 0 ? prev - 1 : allImages.length - 1));
                setIsZoomed(false);
            } else if (e.key === 'ArrowRight') {
                setSelectedImageIndex(prev => (prev < allImages.length - 1 ? prev + 1 : 0));
                setIsZoomed(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isLightboxOpen, allImages.length]);

    // Record recently viewed
    useEffect(() => {
        if (product?.id) {
            recordRecentlyViewed({
                id: product.id,
                title: product.title,
                category: product.category || 'General',
                price_paise: product.platform_price_paise || product.suggested_retail_price_paise || 0,
                compare_at_price_paise: product.mrp_paise || null,
                image: product.product_images?.[0] || null,
                slug: product.slug,
                is_fashion: variants && variants.length > 0
            });
        }
    }, [product.id, product.title, product.category, product.platform_price_paise, product.suggested_retail_price_paise, product.mrp_paise, product.product_images, product.slug, variants]);

    // Variant extraction & management
    const hasVariants = variants && variants.length > 0;
    const colors = useMemo(() => {
        return Array.from(new Set(variants.filter(v => v.color).map(v => v.color)));
    }, [variants]);

    const sizes = useMemo(() => {
        return Array.from(new Set(variants.filter(v => v.size).map(v => v.size)));
    }, [variants]);

    const [selectedColor, setSelectedColor] = useState(colors[0] || '');
    const [selectedSize, setSelectedSize] = useState(sizes[0] || '');

    useEffect(() => {
        if (colors.length > 0 && !colors.includes(selectedColor)) {
            setSelectedColor(colors[0]);
        }
    }, [colors, selectedColor]);

    useEffect(() => {
        if (sizes.length > 0 && !sizes.includes(selectedSize)) {
            setSelectedSize(sizes[0]);
        }
    }, [sizes, selectedSize]);

    const selectedVariant = useMemo(() => {
        if (!hasVariants) return null;
        const match = variants.find(v =>
            (!selectedColor || v.color === selectedColor) &&
            (!selectedSize || v.size === selectedSize)
        );
        return match || variants.find(v => !selectedColor || v.color === selectedColor) || variants[0] || null;
    }, [hasVariants, variants, selectedColor, selectedSize]);

    const variantStock = selectedVariant ? (selectedVariant.inventory_quantity ?? 0) : null;
    const variantIsOOS = hasVariants && variantStock !== null && variantStock <= 0;

    // Reset image index when variant changes
    useEffect(() => {
        if (selectedVariant?.id) {
            setSelectedImageIndex(0);
        }
    }, [selectedVariant?.id]);

    // Memoized supabase client — prevents a new instance on every render
    const supabase = useMemo(() => createClient(), []);

    // Sync active shopping cart count
    useEffect(() => {
        if (!activeCustomer?.id) return;
        const fetchCartCount = async () => {
            try {
                const { data } = await supabase
                    .from('shopping_cart')
                    .select('quantity')
                    .eq('customer_id', activeCustomer.id);
                if (data) {
                    const totalQty = data.reduce((acc, row) => acc + (row.quantity || 1), 0);
                    setCartCount(totalQty);
                }
            } catch (e) {
                console.error('Error fetching cart count:', e);
            }
        };
        fetchCartCount();
    }, [activeCustomer?.id, supabase]);

    useEffect(() => {
        if (!activeCustomer?.id) return;
        supabase
            .from('user_wishlists')
            .select('id')
            .eq('user_id', activeCustomer.id)
            .eq('product_id', product.id)
            .maybeSingle()
            .then(({ data }) => setIsWishlisted(!!data));
    }, [activeCustomer?.id, product.id]);

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
        if (!activeCustomer?.id) {
            toast.error('Please login to save items');
            return;
        }
        setWishlistLoading(true);
        try {
            if (isWishlisted) {
                const { error } = await supabase
                    .from('user_wishlists')
                    .delete()
                    .eq('user_id', activeCustomer.id)
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
                    user_id: activeCustomer.id,
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

    // Memoized offer list — only rebuilds when inventory or product prices change
    const allOffers = useMemo(() => {
        const platformOffer = {
            is_platform_direct: true,
            retail_price_paise: product.platform_price_paise ?? product.suggested_retail_price_paise,
            merchant_name: 'InTrust Official',
            stock: product.admin_stock
        };
        return [
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
    }, [product.platform_price_paise, product.suggested_retail_price_paise, product.admin_stock, inventory]);

    const isOfferOOS = useCallback((off) =>
        off.is_platform_direct ? isPlatformProductOOS(product) : isInventoryRowOOS(off)
    , [product]);

    // Memoize derived OOS / selection state
    const productIsOOS = useMemo(() => isPdpProductOOS({ product, inventory }), [product, inventory]);
    const defaultOffer = useMemo(() => allOffers.find(o => !isOfferOOS(o)) || allOffers[0], [allOffers, isOfferOOS]);
    const selectedOffer = useMemo(() =>
        allOffers.find(o => (o.is_platform_direct ? selectedOfferId === 'platform' : o.id === selectedOfferId)) || defaultOffer
    , [allOffers, selectedOfferId, defaultOffer]);
    const selectedOfferIsOOS = useMemo(() => isOfferOOS(selectedOffer), [isOfferOOS, selectedOffer]);
    const isOutOfStock = hasVariants ? variantIsOOS : (productIsOOS || selectedOfferIsOOS);

    const isStoreOpen = useMemo(() =>
        selectedOffer.is_platform_direct
            ? isPlatformOpen
            : (merchantStatuses.get(inventory.find(i => i.id === selectedOffer.id)?.merchant_id) ?? true)
    , [selectedOffer, isPlatformOpen, merchantStatuses, inventory]);

    const triggerClosedAnimation = useCallback(() => {
        setIsClosedAnimation(true);
        setTimeout(() => setIsClosedAnimation(false), 500);
    }, []);

    const addToCart = async () => {
        if (isOutOfStock) {
            toast.error('This item is currently out of stock');
            return;
        }
        if (!isStoreOpen) {
            triggerClosedAnimation();
            return;
        }
        if (!activeCustomer) {
            toast.error('Please login to add to cart');
            const returnUrl = typeof window !== 'undefined' ? window.location.pathname : `/shop/product/${product.slug}`;
            router.push(`/login?next=${encodeURIComponent(returnUrl)}`);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('add_to_shopping_cart', {
                p_customer_id: activeCustomer.id,
                p_inventory_id: selectedOffer.is_platform_direct ? null : selectedOffer.id,
                p_product_id: product.id,
                p_variant_id: selectedVariant?.id || null,
                p_quantity: quantity,
                p_is_platform: selectedOffer.is_platform_direct
            });

            if (error) throw error;

            if (data?.message === 'MIXED_SELLER_ERROR') {
                setConfirmModalOpen(true);
                return;
            }

            setCartCount(prev => prev + quantity);
            setAddedToCart(true);
            toast.success('Added to cart! 🛒');
            setTimeout(() => { setAddedToCart(false); }, 2500);
        } catch (err) {
            console.error('Add to cart error:', err);
            toast.error('Failed to add to cart');
        } finally {
            setLoading(false);
        }
    };

    const buyNow = async () => {
        if (isOutOfStock) {
            toast.error('This item is currently out of stock');
            return;
        }
        if (!isStoreOpen) {
            triggerClosedAnimation();
            return;
        }
        if (!activeCustomer) {
            toast.error('Please login to purchase');
            const returnUrl = typeof window !== 'undefined' ? window.location.pathname : `/shop/product/${product.slug}`;
            router.push(`/login?next=${encodeURIComponent(returnUrl)}`);
            return;
        }
        setBuyNowLoading(true);
        try {
            const { data, error } = await supabase.rpc('add_to_shopping_cart', {
                p_customer_id: activeCustomer.id,
                p_inventory_id: selectedOffer.is_platform_direct ? null : selectedOffer.id,
                p_product_id: product.id,
                p_variant_id: selectedVariant?.id || null,
                p_quantity: quantity,
                p_is_platform: selectedOffer.is_platform_direct
            });
            if (error) throw error;
            if (data?.message === 'MIXED_SELLER_ERROR') {
                // Clear cart and add anyway for Buy Now
                await supabase.from('shopping_cart').delete().eq('customer_id', activeCustomer.id);
                await supabase.rpc('add_to_shopping_cart', {
                    p_customer_id: activeCustomer.id,
                    p_inventory_id: selectedOffer.is_platform_direct ? null : selectedOffer.id,
                    p_product_id: product.id,
                    p_variant_id: selectedVariant?.id || null,
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
            await supabase.from('shopping_cart').delete().eq('customer_id', activeCustomer.id);
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

    // Memoized pricing — variant price takes precedence for fashion items
    const { sellingPrice, finalMrp, savings, savingsPercent } = useMemo(() => {
        const sp = (hasVariants && selectedVariant?.price_paise != null)
            ? selectedVariant.price_paise
            : selectedOffer.retail_price_paise;
        const mrp = (hasVariants && selectedVariant?.compare_at_price_paise != null)
            ? selectedVariant.compare_at_price_paise
            : (product.mrp_paise || product.suggested_retail_price_paise || sp);
        const fm = mrp > sp ? mrp : sp;
        const sav = fm - sp;
        return {
            sellingPrice: sp,
            finalMrp: fm,
            savings: sav,
            savingsPercent: fm > 0 ? Math.round((sav / fm) * 100) : 0
        };
    }, [selectedOffer.retail_price_paise, product.mrp_paise, product.suggested_retail_price_paise, hasVariants, selectedVariant]);
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
            <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-8 pt-4 sm:pt-6 md:pt-8 pb-32 relative z-10">

                {/* Top Navigation & Breadcrumbs */}
                <div className="flex items-center justify-between gap-4 mb-4 sm:mb-6">
                    <CustomerBreadcrumbs
                        items={[
                            { label: 'Shop Hub', href: '/shop' },
                            { label: categoryName, href: `/shop/category/${encodeURIComponent(categoryName.toLowerCase().replace(/\s+/g, '-'))}` },
                            ...(product.sub_category && product.sub_category !== 'General' ? [{
                                label: product.sub_category,
                                href: `/shop/category/${encodeURIComponent(categoryName.toLowerCase().replace(/\s+/g, '-'))}?sub_category=${encodeURIComponent(product.sub_category)}`
                            }] : []),
                            { label: product.title }
                        ]}
                        className="mb-0"
                    />
                    <button
                        onClick={() => router.back()}
                        className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 ${
                            isDark 
                                ? 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10' 
                                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 shadow-xs'
                        }`}
                    >
                        <ArrowLeft size={14} />
                        <span>Back</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-14">

                    {/* ====== LEFT: PRODUCT IMAGE & GALLERY ====== */}
                    <div className="lg:col-span-6">
                        <div
                            onClick={() => setIsLightboxOpen(true)}
                            className={`aspect-[4/3] sm:aspect-square rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-8 md:p-16 flex items-center justify-center relative overflow-hidden cursor-zoom-in group transition-all duration-300 ${
                                isDark ? 'bg-[#0c0e16]' : 'bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)]'
                            }`}
                            style={{
                                border: isDark ? `1px solid ${primaryColor}15` : '1px solid #e2e8f0',
                                boxShadow: isDark
                                    ? `0 0 80px ${primaryColor}08, inset 0 0 60px ${primaryColor}05`
                                    : '0 8px 40px rgba(0,0,0,0.06)'
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

                            {allImages[selectedImageIndex] || allImages[0] ? (
                                <Image
                                    src={allImages[selectedImageIndex] || allImages[0]}
                                    alt={product.title}
                                    fill
                                    sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 540px"
                                    className={`object-contain relative z-10 transition-transform duration-500 group-hover:scale-105 ${isDark ? '' : 'mix-blend-multiply'}`}
                                    priority
                                    quality={85}
                                />
                            ) : (
                                <div className={`flex flex-col items-center justify-center ${isDark ? 'text-white/10' : 'text-slate-200'}`}>
                                    <Package size={60} strokeWidth={1} />
                                </div>
                            )}

                            {isOutOfStock && <OutOfStockOverlay />}

                            {/* Badges */}
                            <div className="absolute top-3 left-3 sm:top-5 sm:left-5 flex flex-col gap-1.5 z-20 pointer-events-none">
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
                                {product.sub_category && product.sub_category !== 'General' && (
                                    <div className="px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider text-white/90 bg-black/50 backdrop-blur-md border border-white/20 uppercase w-fit">
                                        {product.sub_category}
                                    </div>
                                )}
                            </div>

                            {/* Multi-image indicator & Expand Button */}
                            <div className="absolute bottom-3 right-3 sm:bottom-5 sm:right-5 flex items-center gap-2 z-20">
                                {allImages.length > 1 && (
                                    <span className="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white text-[10px] font-black border border-white/15 shadow-sm">
                                        {selectedImageIndex + 1} / {allImages.length}
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsLightboxOpen(true);
                                    }}
                                    className="w-9 h-9 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center border border-white/15 transition-all shadow-md active:scale-95"
                                    title="Click to expand / view full screen"
                                >
                                    <Maximize2 size={14} />
                                </button>
                            </div>

                            {/* Wishlist Heart Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleWishlist();
                                }}
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

                        {/* Thumbnail Strip for Multiple Images */}
                        {allImages.length > 1 && (
                            <div className="flex gap-2.5 mt-3 overflow-x-auto scrollbar-none pb-1">
                                {allImages.map((url, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setSelectedImageIndex(idx)}
                                        className={`shrink-0 w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all relative ${
                                            idx === selectedImageIndex
                                                ? 'border-blue-600 dark:border-blue-500 scale-105 shadow-md shadow-blue-500/20'
                                                : isDark
                                                ? 'border-white/10 opacity-60 hover:opacity-100 hover:border-white/30'
                                                : 'border-slate-200 opacity-75 hover:opacity-100 hover:border-slate-300'
                                        }`}
                                    >
                                        <Image
                                            src={url}
                                            alt={`View ${idx + 1}`}
                                            fill
                                            sizes="64px"
                                            className={`object-contain p-1.5 ${isDark ? '' : 'mix-blend-multiply'}`}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ====== RIGHT: PRODUCT INFO ====== */}
                    <div className="lg:col-span-6 flex flex-col">

                        {/* Category & Subcategory tags */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Link 
                                href={`/shop/category/${encodeURIComponent(categoryName.toLowerCase().replace(/\s+/g, '-'))}`}
                                className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                            >
                                {categoryName}
                            </Link>
                            {product.sub_category && product.sub_category !== 'General' && (
                                <Link 
                                    href={`/shop/category/${encodeURIComponent(categoryName.toLowerCase().replace(/\s+/g, '-'))}?sub_category=${encodeURIComponent(product.sub_category)}`}
                                    className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-500/20 transition-all"
                                >
                                    {product.sub_category}
                                </Link>
                            )}
                        </div>

                        {/* Title + Description */}
                        <h1 className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight leading-tight mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {product.title}
                        </h1>
                        {productIsOOS && <OutOfStockBadge variant="solid" size="md" className="mb-3" />}
                        <p className={`text-xs sm:text-sm font-medium leading-relaxed mb-4 line-clamp-3 ${isDark ? 'text-white/35' : 'text-slate-500'}`}>
                            {product.description || 'Premium quality product vetted by InTrust for our customers.'}
                        </p>

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
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                {savingsPercent > 0 && (
                                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                        Save ₹{(savings / 100).toLocaleString('en-IN')} ({savingsPercent}% OFF)
                                    </span>
                                )}
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                    <Sparkles size={12} />
                                    <span>InTrust Reward Coins on Order</span>
                                </span>
                            </div>
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
                            </div>
                        )}

                        {/* ====== FASHION VARIANT SELECTOR ====== */}
                        {hasVariants && (
                            <div className="mb-6 space-y-4 pt-4 border-t border-slate-200/60 dark:border-white/10">
                                {/* Color Options */}
                                {colors.length > 0 && (
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                                                Color: <span className="text-sky-500 font-bold">{selectedColor || 'Select color'}</span>
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {colors.map(color => {
                                                const isSelected = selectedColor === color;
                                                return (
                                                    <button
                                                        key={color}
                                                        type="button"
                                                        onClick={() => setSelectedColor(color)}
                                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all border ${
                                                            isSelected
                                                                ? 'bg-sky-500 text-white border-sky-400 shadow-sm shadow-sky-500/25 scale-[1.02]'
                                                                : isDark
                                                                    ? 'bg-white/5 border-white/10 text-white/70 hover:border-white/20'
                                                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        {color}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Size Options */}
                                {sizes.length > 0 && (
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                                                Size: <span className="text-sky-500 font-bold">{selectedSize || 'Select size'}</span>
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {sizes.map(size => {
                                                const isSelected = selectedSize === size;
                                                const matchVar = variants.find(v =>
                                                    (!selectedColor || v.color === selectedColor) && v.size === size
                                                );
                                                const isSizeOOS = matchVar ? (matchVar.inventory_quantity ?? 0) <= 0 : false;

                                                return (
                                                    <button
                                                        key={size}
                                                        type="button"
                                                        onClick={() => setSelectedSize(size)}
                                                        className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all border ${
                                                            isSelected
                                                                ? 'bg-sky-500 text-white border-sky-400 shadow-sm shadow-sky-500/25 scale-[1.02]'
                                                                : isSizeOOS
                                                                    ? isDark
                                                                        ? 'bg-white/[0.02] border-white/5 text-white/25 line-through'
                                                                        : 'bg-slate-100/50 border-slate-200/50 text-slate-400 line-through'
                                                                    : isDark
                                                                        ? 'bg-white/5 border-white/10 text-white/70 hover:border-white/20'
                                                                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        {size}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Variant Attributes: Fit, Fabric, SKU & Stock */}
                                {selectedVariant && (
                                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                                        {selectedVariant.fit && (
                                            <span className={`px-2.5 py-1 rounded-lg font-bold border ${isDark ? 'bg-white/5 border-white/10 text-white/60' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                                                Fit: {selectedVariant.fit}
                                            </span>
                                        )}
                                        {selectedVariant.fabric && (
                                            <span className={`px-2.5 py-1 rounded-lg font-bold border ${isDark ? 'bg-white/5 border-white/10 text-white/60' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                                                Fabric: {selectedVariant.fabric}
                                            </span>
                                        )}
                                        {selectedVariant.sku && (
                                            <span className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold border ${isDark ? 'bg-white/5 border-white/10 text-white/40' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                                SKU: {selectedVariant.sku}
                                            </span>
                                        )}
                                        {variantIsOOS ? (
                                            <span className="px-2.5 py-1 rounded-lg font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                                Variant Out of Stock
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-1 rounded-lg font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                {variantStock} available in stock
                                            </span>
                                        )}
                                    </div>
                                )}

                                {variantIsOOS && (
                                    <div className="pt-2">
                                        <OutOfStockBanner count={1} />
                                        <div className="mt-2 max-w-xs">
                                            <NotifyMeButton productId={product.id} email={activeEmail} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ====== DESKTOP ACTIONS ====== */}
                        <div className="hidden sm:block mb-5 space-y-3">
                            {/* Quantity + Add to Cart row */}
                            <div className="flex items-center gap-3">
                                {/* Minimalist Quantity Stepper */}
                                <div
                                    className={`flex items-center p-1 rounded-2xl flex-shrink-0 ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-slate-50 border-slate-200'} border`}
                                    style={{ 
                                        opacity: isOutOfStock ? 0.5 : 1,
                                        pointerEvents: isOutOfStock ? 'none' : 'auto'
                                    }}
                                >
                                    <button
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${isDark ? 'text-white/60 hover:text-white hover:bg-white/[0.08]' : 'text-slate-500 hover:bg-white hover:shadow-xs'}`}
                                    >
                                        <Minus size={15} strokeWidth={2.5} />
                                    </button>
                                    <span className={`w-9 text-center font-black text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                        {quantity}
                                    </span>
                                    <button
                                        onClick={() => setQuantity(quantity + 1)}
                                        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${isDark ? 'text-white/60 hover:text-white hover:bg-white/[0.08]' : 'text-slate-500 hover:bg-white hover:shadow-xs'}`}
                                    >
                                        <Plus size={15} strokeWidth={2.5} />
                                    </button>
                                </div>

                                {/* Add to Cart */}
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    whileHover={{ scale: 1.01 }}
                                    onClick={addToCart}
                                    disabled={loading || isOutOfStock}
                                    animate={{
                                        x: isClosedAnimation ? [-2, 2, -2, 2, 0] : 0,
                                        backgroundColor: isOutOfStock ? (isDark ? '#1e293b' : '#f1f5f9') : (isStoreOpen ? (addedToCart ? '#0284c7' : '#2563eb') : '#ef4444')
                                    }}
                                    transition={{
                                        x: { type: 'keyframes', duration: 0.4 },
                                        default: { type: 'spring', stiffness: 400, damping: 25 }
                                    }}
                                    className={`flex-1 h-12 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all disabled:opacity-80 overflow-hidden relative shadow-md ${
                                        isOutOfStock 
                                            ? (isDark ? 'text-white/20' : 'text-slate-400') 
                                            : 'text-white shadow-blue-600/20'
                                    }`}
                                >
                                    <AnimatePresence mode="wait">
                                        {isOutOfStock ? (
                                            <motion.div key="oos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                                <OutOfStockBadge variant="solid" size="md" icon={true}/>
                                            </motion.div>
                                        ) : !isStoreOpen ? (
                                            <motion.div key="closed" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 line-clamp-1 px-2">
                                                <Store size={16} strokeWidth={2.5} />
                                                <span>STORE CLOSED</span>
                                            </motion.div>
                                        ) : loading ? (
                                            <motion.div key="loading" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 font-bold">
                                                <Loader2 className="animate-spin" size={16} />
                                                <span>Adding...</span>
                                            </motion.div>
                                        ) : addedToCart ? (
                                            <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 font-bold">
                                                <CheckCircle2 size={16} strokeWidth={2.5} />
                                                <span>Added to Cart</span>
                                            </motion.div>
                                        ) : (
                                            <motion.div key="default" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 font-bold">
                                                <ShoppingCart size={16} strokeWidth={2.5} />
                                                <span>ADD TO CART</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.button>
                            </div>

                            {(productIsOOS || selectedOfferIsOOS) && (
                                <Link
                                    href={`/shop/category/${encodeURIComponent(categoryName.toLowerCase().replace(/\s+/g, '-'))}`}
                                    className="w-full h-11 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/25 transition-all mt-1"
                                >
                                    <Sparkles size={14} />
                                    <span>Explore In-Stock in {categoryName}</span>
                                </Link>
                            )}

                            {/* Order Now (Instant Buyout Button) */}
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                whileHover={{ scale: 1.01 }}
                                onClick={buyNow}
                                disabled={buyNowLoading || isOutOfStock}
                                animate={{
                                    x: isClosedAnimation ? [-2, 2, -2, 2, 0] : 0,
                                    borderColor: isOutOfStock ? (isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0') : (isStoreOpen ? (isDark ? 'rgba(255,255,255,0.15)' : 'transparent') : '#ef4444'),
                                    backgroundColor: isOutOfStock ? (isDark ? 'transparent' : '#f8fafc') : (isStoreOpen ? (isDark ? '#ffffff' : '#0c101c') : '#ef4444')
                                }}
                                transition={{
                                    x: { type: 'keyframes', duration: 0.4 },
                                    default: { type: 'spring', stiffness: 400, damping: 25 }
                                }}
                                className={`w-full h-12 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all border shadow-sm active:scale-95 ${
                                    isOutOfStock 
                                        ? (isDark ? 'text-white/20' : 'text-slate-400') 
                                        : (isDark ? 'text-slate-950' : 'text-white')
                                }`}
                            >
                                {buyNowLoading ? (
                                    <><Loader2 className="animate-spin" size={16} /><span className="ml-1">Processing Order...</span></>
                                ) : isOutOfStock ? (
                                    <span>{OOS_LABEL}</span>
                                ) : !isStoreOpen ? (
                                    <><Store size={16} strokeWidth={2.5} /><span>STORE CLOSED</span></>
                                ) : (
                                    <><Zap size={16} strokeWidth={2.5} className={isDark ? "fill-slate-950" : "fill-white"} /><span>BUY NOW • EXPRESS DISPATCH</span></>
                                )}
                            </motion.button>
                        </div>

                        {/* ====== MINIMALIST PREMIUM TRUST & FULFILLMENT STRIP ====== */}
                        <div
                            className={`p-4 rounded-3xl mb-4 space-y-3 ${isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-slate-50/80 border-slate-200/80'} border shadow-xs`}
                        >
                            <div className="flex items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div
                                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-blue-500/10 text-sky-400 border border-blue-500/20' : 'bg-white shadow-xs border border-slate-200 text-blue-600'}`}
                                    >
                                        <Store size={16} strokeWidth={2} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className={`font-black text-xs truncate ${isDark ? 'text-white/90' : 'text-slate-900'}`}>{selectedOffer.merchant_name}</p>
                                            <BadgeCheck size={14} className="shrink-0 text-blue-600 dark:text-sky-400" />
                                        </div>
                                        <p className={`text-[10px] font-medium truncate ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                                            Verified Bhopal Hub • 100% InTrust Guarantee
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                        isOutOfStock
                                            ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                    }`}>
                                        {isOutOfStock ? 'Out of Stock' : `${selectedOffer.stock || 10} In Stock`}
                                    </span>
                                </div>
                            </div>

                            {/* Minimalist Tri-Spec Badges */}
                            <div className="pt-2.5 border-t border-slate-200/60 dark:border-white/5 grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                <div className="flex items-center justify-center gap-1.5 py-0.5">
                                    <Truck size={13} className="text-sky-500 shrink-0" />
                                    <span>Express Delivery</span>
                                </div>
                                <div className="flex items-center justify-center gap-1.5 py-0.5 border-x border-slate-200/60 dark:border-white/10">
                                    <ShieldCheck size={13} className="text-blue-600 dark:text-sky-400 shrink-0" />
                                    <span>100% Genuine</span>
                                </div>
                                <div className="flex items-center justify-center gap-1.5 py-0.5">
                                    <Phone size={13} className="text-slate-400 shrink-0" />
                                    <a href="tel:18008890199" className="hover:text-blue-600 transition-colors">1800-889-0199</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ====== INTERACTIVE PRODUCT DEEP-DIVE & INTRUST ASSURANCE ====== */}
                <div className={`mt-8 sm:mt-12 rounded-3xl border p-5 sm:p-8 transition-all ${
                    isDark ? 'bg-[#0c0e16] border-white/[0.08]' : 'bg-white border-slate-200/80 shadow-sm'
                }`}>
                    {/* Minimalist Tab Strip */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 border-b border-slate-100 dark:border-white/10 mb-6">
                        {[
                            { id: 'highlights', label: 'Highlights & Specs', icon: Sparkles },
                            { id: 'assurance', label: 'InTrust Buyer Protection', icon: ShieldCheck },
                            { id: 'delivery', label: 'Express Delivery & Bhopal Hub', icon: Truck },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveDetailTab(tab.id)}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                                    activeDetailTab === tab.id
                                        ? isDark 
                                            ? 'bg-white text-slate-950 font-black shadow-xs' 
                                            : 'bg-slate-900 text-white font-black shadow-xs'
                                        : isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                            >
                                <tab.icon size={14} className={activeDetailTab === tab.id ? (isDark ? 'text-blue-600' : 'text-sky-400') : 'text-slate-400'} />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Tab Contents */}
                    {activeDetailTab === 'highlights' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                <h4 className="text-xs font-black uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-3 flex items-center gap-1.5">
                                    <Award size={16} />
                                    <span>Key Highlights</span>
                                </h4>
                                <ul className="space-y-2.5 text-xs sm:text-sm font-medium">
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 size={16} className="text-sky-500 shrink-0" />
                                        <span>100% Genuine product sourced directly from certified merchant</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 size={16} className="text-sky-500 shrink-0" />
                                        <span>Tamper-evident verification seal applied before transit</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 size={16} className="text-sky-500 shrink-0" />
                                        <span>Eligible for InTrust Reward Coins credited to wallet</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 size={16} className="text-sky-500 shrink-0" />
                                        <span>Full manufacturer warranty support with direct GST invoice</span>
                                    </li>
                                </ul>
                            </div>

                            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                <h4 className="text-xs font-black uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-3 flex items-center gap-1.5">
                                    <Package size={16} />
                                    <span>Quick Specifications</span>
                                </h4>
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between py-1.5 border-b border-slate-200/50 dark:border-white/5">
                                        <span className="text-slate-500">Category</span>
                                        <span className="font-bold">{categoryName}</span>
                                    </div>
                                    {product.sub_category && product.sub_category !== 'General' && (
                                        <div className="flex justify-between py-1.5 border-b border-slate-200/50 dark:border-white/5">
                                            <span className="text-slate-500">Sub-Category</span>
                                            <span className="font-bold text-sky-600 dark:text-sky-400">{product.sub_category}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between py-1.5 border-b border-slate-200/50 dark:border-white/5">
                                        <span className="text-slate-500">Fulfilled By</span>
                                        <span className="font-bold">{selectedOffer.merchant_name}</span>
                                    </div>
                                    <div className="flex justify-between py-1.5 border-b border-slate-200/50 dark:border-white/5">
                                        <span className="text-slate-500">Stock Availability</span>
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">Ready for Dispatch</span>
                                    </div>
                                    <div className="flex justify-between py-1.5">
                                        <span className="text-slate-500">Packaging</span>
                                        <span className="font-bold">Eco-Safe InTrust Shield</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeDetailTab === 'assurance' && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                <ShieldCheck size={24} className="text-sky-500 mb-2" />
                                <h4 className="text-sm font-black mb-1">100% InTrust Guarantee</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Zero risk shopping. Your funds are secured until the product is verified and delivered to your doorstep.
                                </p>
                            </div>
                            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                <RefreshCw size={24} className="text-blue-500 mb-2" />
                                <h4 className="text-sm font-black mb-1">7-Day Replacement</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Damaged or defective? Request an instant doorstep replacement through your InTrust customer dashboard.
                                </p>
                            </div>
                            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                <CreditCard size={24} className="text-indigo-500 mb-2" />
                                <h4 className="text-sm font-black mb-1">Flexible Payments</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Pay securely with UPI, InTrust Wallet points, Credit/Debit cards, or Cash on Delivery with no extra fees.
                                </p>
                            </div>
                        </div>
                    )}

                    {activeDetailTab === 'delivery' && (
                        <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                            isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'
                        }`}>
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                                        <span>Express Delivery to Bhopal</span>
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase">Active</span>
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        Order now and get it dispatched via InTrust Express local logistics with live tracking updates in your orders.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-bold text-slate-400">Need assistance?</span>
                                <a
                                    href="tel:18008890199"
                                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-sm"
                                >
                                    <Phone size={13} />
                                    <span>1800-889-0199</span>
                                </a>
                            </div>
                        </div>
                    )}
                </div>

                {/* ====== RECOMMENDED PRODUCTS ====== */}
                {recommendedProducts.length > 0 && (
                    <div className="mt-8 sm:mt-12">
                        <h2 className={`text-lg sm:text-xl font-black mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            More in {categoryName}
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                            {recommendedProducts.map(item => {
                                const rProduct = item.shopping_products;
                                const rPrice = (item.retail_price_paise || 0) / 100;
                                const rMrp = (rProduct.mrp_paise || rProduct.suggested_retail_price_paise || item.retail_price_paise || 0) / 100;
                                const rSavings = rMrp > rPrice ? Math.round(((rMrp - rPrice) / rMrp) * 100) : 0;

                                return (
                                    <Link
                                        key={item.id}
                                        href={`/shop/product/${item.shopping_products?.slug}`}
                                        className={`flex flex-col rounded-2xl overflow-hidden transition-all hover:shadow-[0_4px_20px_rgb(0,0,0,0.08)] group ${isDark ? 'bg-[#0c0e16] border border-white/[0.04]' : 'bg-white border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.04)]'
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
                                                <Image
                                                    src={rProduct.product_images[0]}
                                                    alt={rProduct.title}
                                                    fill
                                                    sizes="160px"
                                                    className={`object-contain p-[10%] group-hover:scale-105 transition-transform ${isDark ? '' : 'mix-blend-multiply'}`}
                                                    loading="lazy"
                                                    quality={70}
                                                />
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

                {/* ====== RECENTLY VIEWED ====== */}
                <RecentlyViewed currentProductId={product.id} />
            </div>

            {/* ====== ENHANCED MOBILE STICKY BOTTOM ACTION BAR ====== */}
            <div className={`fixed bottom-0 left-0 right-0 z-50 sm:hidden backdrop-blur-xl border-t shadow-[0_-6px_24px_rgba(0,0,0,0.08)] pb-[max(12px,env(safe-area-inset-bottom,12px))] pt-3 px-4 ${isDark ? 'bg-[#080a10]/95 border-white/[0.08]' : 'bg-white/95 border-slate-200'}`}>
                <div className="flex flex-col gap-2.5 w-full">
                    {/* Upper row: Price & Cart badge shortcut */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-2">
                            <span className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                ₹{((sellingPrice * quantity) / 100).toLocaleString('en-IN')}
                            </span>
                            {finalMrp > sellingPrice && (
                                <span className={`text-xs line-through ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                                    ₹{((finalMrp * quantity) / 100).toLocaleString('en-IN')}
                                </span>
                            )}
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                Earn Coins
                            </span>
                        </div>

                        {/* Cart count pill */}
                        <Link 
                            href="/shop/cart"
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                                cartCount > 0 
                                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-500/30' 
                                    : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20'
                            }`}
                        >
                            <ShoppingCart size={13} />
                            <span>{cartCount} in Bag</span>
                        </Link>
                    </div>

                    {/* Lower row: Quantity + ADD TO CART + BUY NOW */}
                    <div className="flex items-center gap-2">
                        {/* Quantity Counter */}
                        <div className="flex items-center rounded-xl bg-surface-container-low border border-outline-variant/30 h-11 px-1 shrink-0">
                            <button
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                disabled={isOutOfStock}
                                className="w-8 h-full flex items-center justify-center text-on-surface-variant hover:text-on-surface active:scale-90 transition-all disabled:opacity-30"
                            >
                                <Minus size={13} strokeWidth={2.5} />
                            </button>
                            <span className="text-xs font-black w-6 text-center text-on-surface">{quantity}</span>
                            <button
                                onClick={() => setQuantity(quantity + 1)}
                                disabled={isOutOfStock}
                                className="w-8 h-full flex items-center justify-center text-on-surface-variant hover:text-on-surface active:scale-90 transition-all disabled:opacity-30"
                            >
                                <Plus size={13} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Add to Cart */}
                        <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={addToCart}
                            disabled={loading || isOutOfStock}
                            className={`flex-1 h-11 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 ${
                                isOutOfStock
                                    ? 'bg-surface-container-high text-on-surface-variant'
                                    : addedToCart
                                    ? 'bg-emerald-600 text-white shadow-emerald-500/25'
                                    : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-500/25'
                            }`}
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={15} />
                            ) : addedToCart ? (
                                <><CheckCircle2 size={15} /><span>Added!</span></>
                            ) : (
                                <><ShoppingCart size={15} /><span>Add to Bag</span></>
                            )}
                        </motion.button>

                        {/* Buy Now */}
                        <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={buyNow}
                            disabled={buyNowLoading || isOutOfStock}
                            className="flex-1 h-11 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all bg-slate-950 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-900 dark:hover:bg-slate-100 shadow-md active:scale-95 disabled:opacity-50"
                        >
                            {buyNowLoading ? (
                                <Loader2 className="animate-spin" size={15} />
                            ) : (
                                <><Zap size={14} className="fill-amber-400 text-amber-400 dark:fill-amber-500 dark:text-amber-500" /><span>Buy Now</span></>
                            )}
                        </motion.button>
                    </div>

                    {(productIsOOS || selectedOfferIsOOS) && (
                        <div className="pt-1">
                            <Link
                                href={`/shop/category/${encodeURIComponent(categoryName.toLowerCase().replace(/\s+/g, '-'))}`}
                                className="w-full h-10 rounded-xl flex items-center justify-center gap-2 font-bold text-xs bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/25 active:scale-95 transition-all"
                            >
                                <Sparkles size={14} />
                                <span>Explore In-Stock in {categoryName}</span>
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Persistent Blinkit Quick-Checkout Floating Bar (Desktop only on PDP to prevent mobile overlap) */}
            <AnimatePresence>
                {cartCount > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="hidden sm:flex fixed sm:bottom-6 sm:right-6 sm:w-[420px] z-50 p-4 rounded-3xl bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 text-white shadow-2xl shadow-blue-500/25 border border-sky-300/30 items-center justify-between gap-4 backdrop-blur-xl"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <motion.div 
                                key={cartCount}
                                initial={{ scale: 1.4, rotate: -10 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 450, damping: 18 }}
                                className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 border border-white/20"
                            >
                                <ShoppingBag size={22} className="text-white" />
                            </motion.div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <motion.span 
                                        key={cartCount}
                                        initial={{ scale: 1.3 }}
                                        animate={{ scale: 1 }}
                                        className="text-sm font-black tracking-tight"
                                    >
                                        {cartCount} {cartCount === 1 ? 'ITEM' : 'ITEMS'}
                                    </motion.span>
                                    <span className="text-xs opacity-75">•</span>
                                    <span className="text-xs text-sky-100 font-bold">In Your Bag</span>
                                </div>
                                <p className="text-[11px] text-sky-100 font-bold flex items-center gap-1 truncate">
                                    <Zap size={12} className="fill-sky-200 text-sky-200 shrink-0" />
                                    <span className="truncate">⚡ Express Delivery • Live Tracking</span>
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/shop/cart"
                            className="px-4 py-2.5 rounded-2xl bg-white hover:bg-sky-50 text-blue-900 text-xs font-black uppercase tracking-wider shrink-0 flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                        >
                            <span>View Cart</span>
                            <ChevronRight size={15} strokeWidth={3} />
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>

            <Suspense fallback={null}>
                {confirmModalOpen && (
                    <ConfirmModal
                        isOpen={confirmModalOpen}
                        onConfirm={handleConfirmClearCart}
                        onCancel={handleCancelClearCart}
                        title="Different Store"
                        message="Your cart contains items from another seller. Clear cart to add this item?"
                        confirmLabel="Clear & Add"
                        cancelLabel="Cancel"
                    />
                )}
            </Suspense>

            {/* ====== FULLSCREEN IMAGE LIGHTBOX MODAL ====== */}
            <AnimatePresence>
                {isLightboxOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-6 select-none"
                        onClick={() => { setIsLightboxOpen(false); setIsZoomed(false); }}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between z-10 w-full" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-black border border-white/15">
                                    {selectedImageIndex + 1} of {allImages.length}
                                </span>
                                <h3 className="text-sm font-bold text-white/90 truncate hidden sm:block max-w-md">
                                    {product.title}
                                </h3>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsZoomed(!isZoomed)}
                                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all border border-white/15 active:scale-95"
                                    title={isZoomed ? "Zoom Out" : "Zoom In"}
                                >
                                    {isZoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setIsLightboxOpen(false); setIsZoomed(false); }}
                                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all border border-white/15 active:scale-95"
                                    title="Close (Esc)"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Center: Large Image Preview with Navigation */}
                        <div className="relative flex-1 flex items-center justify-center my-2 sm:my-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            {allImages.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedImageIndex(prev => (prev > 0 ? prev - 1 : allImages.length - 1));
                                        setIsZoomed(false);
                                    }}
                                    className="absolute left-2 sm:left-4 z-20 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all border border-white/20 active:scale-90 shadow-lg"
                                    title="Previous Image (Left Arrow)"
                                >
                                    <ChevronLeft size={22} strokeWidth={2.5} />
                                </button>
                            )}

                            <div 
                                className={`relative w-full h-full max-w-4xl max-h-[72vh] flex items-center justify-center transition-transform duration-300 ${
                                    isZoomed ? 'scale-150 cursor-zoom-out' : 'scale-100 cursor-zoom-in'
                                }`}
                                onClick={() => setIsZoomed(!isZoomed)}
                            >
                                <img
                                    src={allImages[selectedImageIndex] || allImages[0]}
                                    alt={`${product.title} - view ${selectedImageIndex + 1}`}
                                    className="max-w-full max-h-full object-contain rounded-2xl drop-shadow-2xl select-none"
                                />
                            </div>

                            {allImages.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedImageIndex(prev => (prev < allImages.length - 1 ? prev + 1 : 0));
                                        setIsZoomed(false);
                                    }}
                                    className="absolute right-2 sm:right-4 z-20 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all border border-white/20 active:scale-90 shadow-lg"
                                    title="Next Image (Right Arrow)"
                                >
                                    <ChevronRight size={22} strokeWidth={2.5} />
                                </button>
                            )}
                        </div>

                        {/* Modal Footer: Thumbnails */}
                        {allImages.length > 1 && (
                            <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 z-10 scrollbar-none max-w-xl mx-auto" onClick={(e) => e.stopPropagation()}>
                                {allImages.map((url, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            setSelectedImageIndex(idx);
                                            setIsZoomed(false);
                                        }}
                                        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                                            idx === selectedImageIndex
                                                ? 'border-blue-500 scale-105 shadow-lg shadow-blue-500/40 ring-2 ring-blue-500/30'
                                                : 'border-white/20 opacity-50 hover:opacity-100'
                                        }`}
                                    >
                                        <img
                                            src={url}
                                            alt={`Thumbnail ${idx + 1}`}
                                            className="w-full h-full object-contain bg-white/5 p-1"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
