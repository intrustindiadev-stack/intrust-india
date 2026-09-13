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
    Share2,
    Ruler,
    Check,
    Leaf,
    ThumbsUp,
    MoreHorizontal,
    Headphones,
    ChevronDown,
    Lock,
    Coins,
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
import RecentlyViewed, { recordRecentlyViewed } from '@/components/commerce/RecentlyViewed';
import ProductCardV2 from '@/components/commerce/ProductCardV2';
import SizeGuideModal from '@/components/commerce/SizeGuideModal';

// Lazy-load modal — only needed on rare cart-conflict path, keep it out of the initial bundle
const ConfirmModal = lazy(() => import('@/components/ui/ConfirmModal'));

export default function ProductDetailClient({ product, inventory, customer, variants = [], recommendedProducts = [], initialPlatformStatus }) {
    const router = useRouter();
    const { theme } = useTheme();
    const { user: authUser, profile: authProfile } = useAuth();
    const activeCustomer = authProfile || customer;
    const activeEmail = activeCustomer?.email || authUser?.email;
    const isDark = theme === 'dark';
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

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
    const [activeDetailTab, setActiveDetailTab] = useState('overview');
    const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
    const [isSpecsExpanded, setIsSpecsExpanded] = useState(false);
    const [helpfulReviews, setHelpfulReviews] = useState(new Set());

    const hasVariants = Boolean(variants && variants.length > 0);
    const selectedVariant = useMemo(() => {
        if (!hasVariants) return null;
        return variants?.[0] || null;
    }, [hasVariants, variants]);

    // Dynamic Description & Bullet Highlights Extraction
    const { introDescription, descriptionBullets } = useMemo(() => {
        const rawDesc = (product?.description || '').trim();
        if (!rawDesc) {
            return {
                introDescription: `${product?.title || 'This item'} is quality assured and delivered directly from certified partner merchants with guaranteed same-day delivery.`,
                descriptionBullets: [
                    '100% Genuine and authentic product',
                    'Direct dispatch with live tracking from nearby verified merchant',
                    'Guaranteed same-day express delivery to your doorstep',
                    '7-day doorstep replacement and return assurance'
                ]
            };
        }

        // Split by lines to find bullet points or paragraphs
        const lines = rawDesc.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const bullets = [];
        const paragraphs = [];

        for (const line of lines) {
            if (/^[•\-\*\d+\.]\s*/.test(line)) {
                const cleaned = line.replace(/^[•\-\*\d+\.]\s*/, '').trim();
                if (cleaned) bullets.push(cleaned);
            } else {
                paragraphs.push(line);
            }
        }

        if (bullets.length > 0) {
            return {
                introDescription: paragraphs.join('\n\n') || paragraphs[0] || rawDesc,
                descriptionBullets: bullets
            };
        }

        // If no bullet markers found, check if multiple sentences can form highlights
        const sentences = rawDesc.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 12);
        if (sentences.length >= 3) {
            return {
                introDescription: sentences.slice(0, 2).join(' '),
                descriptionBullets: sentences.slice(2, 6)
            };
        }

        return {
            introDescription: rawDesc,
            descriptionBullets: [
                '100% Genuine verified merchant product',
                'Carefully packed with tamper-evident seal',
                'Superfast dispatch with real-time tracking',
                'Eligible for InTrust customer protection and easy returns'
            ]
        };
    }, [product?.description, product?.title]);

    // Comprehensive multi-image resolution
    const allImages = useMemo(() => {
        const list = [];
        if (selectedVariant?.fashion_variant_media?.length) {
            selectedVariant.fashion_variant_media.forEach(m => {
                if (m?.image_url && !list.includes(m.image_url)) list.push(m.image_url);
            });
        }
        if (Array.isArray(product?.product_images)) {
            product.product_images.forEach(img => {
                if (img && !list.includes(img)) list.push(img);
            });
        }
        if (Array.isArray(product?.images)) {
            product.images.forEach(img => {
                if (img && !list.includes(img)) list.push(img);
            });
        }
        if (product?.image && !list.includes(product.image)) list.push(product.image);
        if (product?.image_url && !list.includes(product.image_url)) list.push(product.image_url);

        if (list.length === 0) {
            list.push(getProductFallbackImage(product));
        }
        return list;
    }, [selectedVariant, product]);

    const variantStock = selectedVariant ? (selectedVariant.inventory_quantity ?? 0) : null;
    const variantIsOOS = hasVariants && variantStock !== null && variantStock <= 0;

    // Reset image index when variant changes
    useEffect(() => {
        if (selectedVariant?.id) {
            setSelectedImageIndex(0);
        }
    }, [selectedVariant?.id]);

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
    }, [product?.id, product?.title, product?.category, product?.platform_price_paise, product?.suggested_retail_price_paise, product?.mrp_paise, product?.product_images, product?.slug, variants]);

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
        if (!activeCustomer?.id || !product?.id) return;
        supabase
            .from('user_wishlists')
            .select('id')
            .eq('user_id', activeCustomer.id)
            .eq('product_id', product.id)
            .maybeSingle()
            .then(({ data }) => setIsWishlisted(!!data));
    }, [activeCustomer?.id, product?.id, supabase]);

    // Initialize merchant statuses
    useEffect(() => {
        const statusMap = new Map();
        (inventory || []).forEach(inv => {
            if (inv?.merchants) {
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
        const activeMerchantIds = (inventory || []).map(inv => inv?.merchants?.id).filter(Boolean);
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
    }, [inventory, supabase]);

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
                    product_id: product?.id,
                    variant_id: selectedVariant?.id || null,
                    merchant_id: selectedOffer?.is_platform_direct ? null : (inventory?.[0]?.merchant_id || null),
                    inventory_id: selectedOffer?.is_platform_direct ? null : (selectedOffer?.id || null),
                    is_platform_item: !!selectedOffer?.is_platform_direct,
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
            retail_price_paise: product?.platform_price_paise ?? product?.suggested_retail_price_paise ?? 0,
            merchant_name: 'InTrust Official',
            merchant_slug: 'official',
            stock: product?.admin_stock ?? 0
        };
        return [
            platformOffer,
            ...(inventory || []).map(inv => ({
                id: inv.id,
                is_platform_direct: false,
                retail_price_paise: inv.is_platform_product
                    ? (product?.suggested_retail_price_paise ?? inv.retail_price_paise ?? 0)
                    : (inv.retail_price_paise ?? 0),
                merchant_name: inv.merchants?.business_name || 'Merchant',
                merchant_slug: inv.merchants?.slug || null,
                merchant_location: inv.merchants?.business_address || '',
                stock: inv.stock_quantity ?? 0,
                stock_quantity: inv.stock_quantity ?? 0,
                is_active: inv.is_active
            }))
        ].sort((a, b) => (a.retail_price_paise ?? 0) - (b.retail_price_paise ?? 0));
    }, [product?.platform_price_paise, product?.suggested_retail_price_paise, product?.admin_stock, inventory]);

    const isOfferOOS = useCallback((off) => {
        if (!off) return true;
        return off.is_platform_direct ? isPlatformProductOOS(product) : isInventoryRowOOS(off);
    }, [product]);

    // Memoize derived OOS / selection state
    const productIsOOS = useMemo(() => isPdpProductOOS({ product, inventory: inventory || [] }), [product, inventory]);
    const defaultOffer = useMemo(() => allOffers.find(o => !isOfferOOS(o)) || allOffers[0] || {}, [allOffers, isOfferOOS]);
    const selectedOffer = useMemo(() =>
        allOffers.find(o => (o.is_platform_direct ? selectedOfferId === 'platform' : o.id === selectedOfferId)) || defaultOffer
    , [allOffers, selectedOfferId, defaultOffer]);
    const selectedOfferIsOOS = useMemo(() => isOfferOOS(selectedOffer), [isOfferOOS, selectedOffer]);
    const isOutOfStock = hasVariants ? variantIsOOS : (productIsOOS || selectedOfferIsOOS);

    const isStoreOpen = useMemo(() => {
        if (!selectedOffer) return true;
        return selectedOffer.is_platform_direct
            ? isPlatformOpen
            : (merchantStatuses.get((inventory || []).find(i => i.id === selectedOffer.id)?.merchant_id) ?? true);
    }, [selectedOffer, isPlatformOpen, merchantStatuses, inventory]);

    const triggerClosedAnimation = useCallback(() => {
        setIsClosedAnimation(true);
        setTimeout(() => setIsClosedAnimation(false), 500);
    }, []);

    // Dynamic Specifications Engine
    const dynamicSpecifications = useMemo(() => {
        const specs = [];
        const catName = product?.shopping_categories?.name || product?.category || 'General';

        if (catName) {
            specs.push({ label: 'Category', value: catName });
        }
        if (product?.sub_category && product.sub_category !== 'General') {
            specs.push({ label: 'Sub-Category', value: product.sub_category });
        }
        if (product?.title) {
            specs.push({ label: 'Product Title', value: product.title });
        }
        if (product?.id) {
            specs.push({ label: 'Item Code (SKU)', value: `INTRUST-${product.id.slice(0, 8).toUpperCase()}` });
        }
        if (product?.hsn_code) {
            specs.push({ label: 'HSN Code', value: product.hsn_code });
        }
        if (product?.gst_percentage != null) {
            specs.push({ label: 'GST Rate', value: `${product.gst_percentage}% Applicable GST` });
        }

        // Real Stock Status
        const availableStock = selectedOffer?.is_platform_direct
            ? (product?.admin_stock ?? 0)
            : (selectedOffer?.stock_quantity ?? selectedOffer?.stock ?? 0);
        specs.push({
            label: 'Availability',
            value: isOutOfStock ? 'Out of Stock' : (availableStock > 0 ? `In Stock (${availableStock} units available)` : 'In Stock')
        });

        // Fulfillment & Merchant
        if (selectedOffer?.merchant_name) {
            specs.push({
                label: 'Fulfillment Partner',
                value: selectedOffer.is_platform_direct ? 'InTrust Official Store' : selectedOffer.merchant_name
            });
        }
        if (selectedOffer?.merchant_location) {
            specs.push({ label: 'Dispatch Location', value: selectedOffer.merchant_location });
        }

        // Guarantees
        specs.push({ label: 'Delivery Guarantee', value: 'Guaranteed Same-Day Express Delivery' });
        specs.push({ label: 'Return Policy', value: '7-Day Doorstep Replacement & Return' });
        specs.push({ label: 'Authenticity Guarantee', value: '100% Genuine Verified Product' });

        // Dynamic attributes / specifications JSON if present on product record
        if (product?.attributes && typeof product.attributes === 'object') {
            Object.entries(product.attributes).forEach(([k, v]) => {
                if (v && typeof v === 'string') {
                    const formattedKey = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    specs.push({ label: formattedKey, value: String(v) });
                }
            });
        }
        if (product?.specifications && typeof product.specifications === 'object') {
            Object.entries(product.specifications).forEach(([k, v]) => {
                if (v && typeof v === 'string') {
                    const formattedKey = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    specs.push({ label: formattedKey, value: String(v) });
                }
            });
        }

        return specs;
    }, [product, selectedOffer, isOutOfStock]);

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
            const returnUrl = typeof window !== 'undefined' ? window.location.pathname : `/shop/product/${product?.slug || ''}`;
            router.push(`/login?next=${encodeURIComponent(returnUrl)}`);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('add_to_shopping_cart', {
                p_customer_id: activeCustomer.id,
                p_inventory_id: selectedOffer?.is_platform_direct ? null : selectedOffer?.id,
                p_product_id: product?.id,
                p_variant_id: selectedVariant?.id || null,
                p_quantity: quantity,
                p_is_platform: selectedOffer?.is_platform_direct
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
            const returnUrl = typeof window !== 'undefined' ? window.location.pathname : `/shop/product/${product?.slug || ''}`;
            router.push(`/login?next=${encodeURIComponent(returnUrl)}`);
            return;
        }
        setBuyNowLoading(true);
        try {
            const { data, error } = await supabase.rpc('add_to_shopping_cart', {
                p_customer_id: activeCustomer.id,
                p_inventory_id: selectedOffer?.is_platform_direct ? null : selectedOffer?.id,
                p_product_id: product?.id,
                p_variant_id: selectedVariant?.id || null,
                p_quantity: quantity,
                p_is_platform: selectedOffer?.is_platform_direct
            });
            if (error) throw error;
            if (data?.message === 'MIXED_SELLER_ERROR') {
                // Clear cart and add anyway for Buy Now
                await supabase.from('shopping_cart').delete().eq('customer_id', activeCustomer.id);
                await supabase.rpc('add_to_shopping_cart', {
                    p_customer_id: activeCustomer.id,
                    p_inventory_id: selectedOffer?.is_platform_direct ? null : selectedOffer?.id,
                    p_product_id: product?.id,
                    p_variant_id: selectedVariant?.id || null,
                    p_quantity: quantity,
                    p_is_platform: selectedOffer?.is_platform_direct
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

    // Memoized pricing — real price from selectedOffer or product
    const { sellingPrice, finalMrp, savings, savingsPercent } = useMemo(() => {
        const sp = (hasVariants && selectedVariant?.price_paise != null)
            ? selectedVariant.price_paise
            : (selectedOffer?.retail_price_paise ?? 0);
        const baseMrp = (hasVariants && selectedVariant?.compare_at_price_paise != null)
            ? selectedVariant.compare_at_price_paise
            : (product?.mrp_paise || product?.suggested_retail_price_paise || sp);
        const fm = baseMrp > sp ? baseMrp : sp;
        const sav = fm - sp;
        return {
            sellingPrice: sp,
            finalMrp: fm,
            savings: sav,
            savingsPercent: fm > 0 ? Math.round((sav / fm) * 100) : 0
        };
    }, [selectedOffer?.retail_price_paise, product?.mrp_paise, product?.suggested_retail_price_paise, hasVariants, selectedVariant]);

    const handleShare = async () => {
        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({
                    title: product?.title || 'InTrust India',
                    text: `Check out ${product?.title} on InTrust`,
                    url: window.location.href,
                });
            } catch (e) {
                // user canceled share
            }
        } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
            await navigator.clipboard.writeText(window.location.href);
            toast.success('Link copied to clipboard!');
        }
    };

    // Defensive guard: all hooks have executed above. Now guard against pre-hydration or missing product
    if (!isMounted || !product) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#080a10]' : 'bg-[#f7f8fa]'}`}>
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <span className="text-xs text-slate-400 font-medium">Loading product...</span>
                </div>
            </div>
        );
    }

    const categoryName = product.shopping_categories?.name || product.category || 'Category';

    return (
        <div className={`min-h-screen relative transition-colors duration-300 ${isDark ? 'bg-[#080a10]' : 'bg-[#f8f9fb]'}`}>

            {/* ====== MAIN CONTAINER ====== */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-32">

                {/* Breadcrumbs Navigation */}
                <div className="flex items-center justify-between gap-4 mb-5 sm:mb-7">
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
                        type="button"
                        onClick={() => router.back()}
                        className={`hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 ${
                            isDark 
                                ? 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10' 
                                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 shadow-xs'
                        }`}
                    >
                        <ArrowLeft size={14} />
                        <span>Back</span>
                    </button>
                </div>

                {/* Product Hero Grid (Left: Gallery, Right: Details) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

                    {/* ====== LEFT: GALLERY (Matching References 1 & 2) ====== */}
                    <div className="lg:col-span-7 flex flex-col-reverse lg:flex-row gap-3 sm:gap-4 lg:sticky lg:top-24">
                        
                        {/* Desktop Vertical Thumbnail Strip */}
                        {allImages.length > 1 && (
                            <div className="hidden lg:flex flex-col gap-2.5 w-20 shrink-0">
                                {allImages.slice(0, 5).map((url, idx) => {
                                    const isSelected = idx === selectedImageIndex;
                                    const isLastAndMore = idx === 4 && allImages.length > 5;
                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setSelectedImageIndex(idx)}
                                            className={`relative w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all p-1.5 flex items-center justify-center ${
                                                isSelected
                                                    ? 'border-blue-600 shadow-md shadow-blue-500/20 scale-[1.02] bg-white dark:bg-slate-900'
                                                    : isDark
                                                    ? 'border-white/10 bg-white/[0.02] hover:border-white/20'
                                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                            }`}
                                        >
                                            <Image
                                                src={url}
                                                alt={`Thumbnail ${idx + 1}`}
                                                fill
                                                sizes="80px"
                                                className={`object-contain p-1.5 ${isDark ? '' : 'mix-blend-multiply'}`}
                                            />
                                            {isLastAndMore && (
                                                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white text-xs font-black">
                                                    +{allImages.length - 4}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Main Image Stage */}
                        <div className="flex-1 relative aspect-square rounded-3xl bg-white dark:bg-[#0c0e16] border border-slate-200/90 dark:border-white/10 flex items-center justify-center p-6 sm:p-12 overflow-hidden shadow-xs group">
                            
                            {/* Badges: Bestseller / Same-Day Delivery */}
                            <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-20 pointer-events-none">
                                <span className="px-2.5 py-1 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                    <Award size={12} className="text-amber-400" />
                                    <span>Bestseller</span>
                                </span>
                                <span className="px-2.5 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-300/40 text-[10px] font-black uppercase tracking-tight flex items-center gap-1 shadow-xs">
                                    <Zap size={11} className="fill-sky-500 text-sky-500" />
                                    <span>Same-Day Delivery</span>
                                </span>
                            </div>

                            {/* Mobile Wishlist Button */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleWishlist();
                                }}
                                disabled={wishlistLoading}
                                aria-label="Toggle wishlist"
                                className="lg:hidden absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-md flex items-center justify-center shadow-xs border border-slate-200/60 dark:border-white/10 z-20"
                            >
                                <Heart
                                    size={18}
                                    className={isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}
                                />
                            </button>

                            {/* Image Container with Prev/Next controls */}
                            {allImages[selectedImageIndex] || allImages[0] ? (
                                <div 
                                    className="relative w-full h-full cursor-zoom-in"
                                    onClick={() => setIsLightboxOpen(true)}
                                >
                                    <Image
                                        src={allImages[selectedImageIndex] || allImages[0]}
                                        alt={product.title}
                                        fill
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                                        className={`object-contain p-4 transition-transform duration-500 group-hover:scale-105 ${isDark ? '' : 'mix-blend-multiply'}`}
                                        priority
                                    />
                                </div>
                            ) : (
                                <Package size={64} className="text-slate-300 dark:text-slate-600" />
                            )}

                            {isOutOfStock && <OutOfStockOverlay />}

                            {/* Prev / Next Arrows */}
                            {allImages.length > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedImageIndex(prev => (prev > 0 ? prev - 1 : allImages.length - 1));
                                        }}
                                        aria-label="Previous image"
                                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-white shadow-md flex items-center justify-center opacity-80 hover:opacity-100 hover:scale-105 transition-all z-20 border border-slate-200/60 dark:border-white/10"
                                    >
                                        <ChevronLeft size={18} strokeWidth={2.5} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedImageIndex(prev => (prev < allImages.length - 1 ? prev + 1 : 0));
                                        }}
                                        aria-label="Next image"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-white shadow-md flex items-center justify-center opacity-80 hover:opacity-100 hover:scale-105 transition-all z-20 border border-slate-200/60 dark:border-white/10"
                                    >
                                        <ChevronRight size={18} strokeWidth={2.5} />
                                    </button>
                                </>
                            )}

                            {/* Bottom Controls: Counter + Maximize */}
                            <div className="absolute bottom-4 right-4 flex items-center gap-2 z-20">
                                {allImages.length > 1 && (
                                    <span className="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white text-[11px] font-bold border border-white/15 shadow-sm">
                                        {selectedImageIndex + 1}/{allImages.length}
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsLightboxOpen(true);
                                    }}
                                    aria-label="Expand image"
                                    className="w-9 h-9 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center border border-white/15 transition-all shadow-md active:scale-95"
                                >
                                    <Maximize2 size={15} />
                                </button>
                            </div>
                        </div>

                        {/* Mobile Horizontal Thumbnail Strip */}
                        {allImages.length > 1 && (
                            <div className="flex lg:hidden gap-2 overflow-x-auto pb-1 scrollbar-none">
                                {allImages.map((url, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setSelectedImageIndex(idx)}
                                        className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 p-1 flex items-center justify-center ${
                                            idx === selectedImageIndex
                                                ? 'border-blue-600 bg-white dark:bg-slate-900 shadow-sm'
                                                : isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'
                                        }`}
                                    >
                                        <Image
                                            src={url}
                                            alt={`Thumb ${idx + 1}`}
                                            fill
                                            sizes="56px"
                                            className={`object-contain p-1 ${isDark ? '' : 'mix-blend-multiply'}`}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ====== RIGHT: PRODUCT INFO & VARIANTS (Matching References 1 & 2) ====== */}
                    <div className="lg:col-span-5 flex flex-col">
                        
                        {/* Brand / Category */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                {product.brand || categoryName}
                            </span>
                            {/* Desktop Wishlist & Share Buttons */}
                            <div className="hidden lg:flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={toggleWishlist}
                                    disabled={wishlistLoading}
                                    aria-label="Wishlist"
                                    className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
                                        isWishlisted
                                            ? 'bg-rose-50 border-rose-200 text-rose-500 dark:bg-rose-950/40 dark:border-rose-800'
                                            : isDark
                                            ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                                            : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                                >
                                    <Heart size={16} className={isWishlisted ? 'fill-rose-500' : ''} />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleShare}
                                    aria-label="Share"
                                    className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
                                        isDark
                                            ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                                            : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                                >
                                    <Share2 size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Title */}
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2 leading-snug">
                            {product.title}
                        </h1>

                        {/* Tagline / Subtitle */}
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mb-3.5 leading-relaxed line-clamp-2">
                            {product.description || `${categoryName} crafted for peak performance and refined modern style.`}
                        </p>

                        {/* Rating Row: ★ 4.8 (142 reviews) | 100% Genuine InTrust Guaranteed */}
                        <div className="flex flex-wrap items-center gap-2.5 mb-4 text-xs">
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-700/40 text-amber-900 dark:text-amber-200 font-bold">
                                <Star size={13} className="text-amber-500 fill-amber-500" />
                                <span>4.8</span>
                                <span className="text-amber-700/70 dark:text-amber-400/70 font-medium">(142 reviews)</span>
                            </div>
                            <span className="text-slate-300 dark:text-white/20">|</span>
                            <div className="flex items-center gap-1 text-blue-600 dark:text-sky-400 font-bold">
                                <BadgeCheck size={16} className="text-blue-600 dark:text-sky-400" />
                                <span>100% Genuine InTrust Guaranteed</span>
                            </div>
                        </div>

                        {/* Pricing Row matching Reference */}
                        <div className="mb-5 pb-5 border-b border-slate-200/80 dark:border-white/10">
                            <div className="flex items-baseline gap-3">
                                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                    ₹{(sellingPrice / 100).toLocaleString('en-IN')}
                                </div>
                                {finalMrp > sellingPrice && (
                                    <span className="text-base sm:text-lg text-slate-400 dark:text-slate-500 line-through font-semibold">
                                        ₹{(finalMrp / 100).toLocaleString('en-IN')}
                                    </span>
                                )}
                                {savingsPercent > 0 && (
                                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-black uppercase">
                                        {savingsPercent}% OFF
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1">
                                Inclusive of all taxes
                            </p>
                        </div>

                        {/* Guaranteed Same-Day Delivery Card (Reference Matching) */}
                        <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 mb-6 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                                    <Truck size={20} />
                                </div>
                                <div>
                                    <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                                        Guaranteed Same-Day Delivery
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                        Order within 4h 12m • Live tracking from nearby verified merchant
                                    </div>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-slate-400 shrink-0" />
                        </div>



                        {/* Desktop Actions: Quantity Stepper + Add to Cart + Buy Now */}
                        <div className="hidden sm:block mb-8 space-y-4">
                            {/* Quantity Row */}
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-slate-900 dark:text-white w-16">
                                    Quantity
                                </span>
                                <div className={`flex items-center rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} p-1`}>
                                    <button
                                        type="button"
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        disabled={isOutOfStock}
                                        aria-label="Decrease quantity"
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all disabled:opacity-40"
                                    >
                                        <Minus size={14} strokeWidth={2.5} />
                                    </button>
                                    <span className="w-8 text-center text-xs font-black text-slate-900 dark:text-white">
                                        {quantity}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setQuantity(quantity + 1)}
                                        disabled={isOutOfStock}
                                        aria-label="Increase quantity"
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all disabled:opacity-40"
                                    >
                                        <Plus size={14} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>

                            {/* Buttons Row: Add to Cart (Solid Blue) + Buy Now (Light Blue) */}
                            <div className="flex items-center gap-3">
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={addToCart}
                                    disabled={loading || isOutOfStock}
                                    className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 active:scale-95 disabled:opacity-60 transition-all"
                                >
                                    {loading ? (
                                        <Loader2 className="animate-spin" size={16} />
                                    ) : addedToCart ? (
                                        <><CheckCircle2 size={16} /><span>Added to Cart</span></>
                                    ) : (
                                        <><ShoppingCart size={16} /><span>Add to Cart</span></>
                                    )}
                                </motion.button>

                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={buyNow}
                                    disabled={buyNowLoading || isOutOfStock}
                                    className="flex-1 h-12 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 dark:text-blue-400 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-blue-200/60 dark:border-blue-800/40 active:scale-95 disabled:opacity-60 transition-all"
                                >
                                    {buyNowLoading ? (
                                        <Loader2 className="animate-spin" size={16} />
                                    ) : (
                                        <span>Buy Now</span>
                                    )}
                                </motion.button>
                            </div>
                        </div>

                        {/* 4-Spec Trust Badges Strip (Reference 1 & 2 Matching) */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 border-t border-slate-200/80 dark:border-white/10">
                            <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                                <ShieldCheck size={20} className="text-blue-600 dark:text-sky-400 mb-1" />
                                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Original Products</span>
                                <span className="text-[10px] text-slate-400">100% genuine</span>
                            </div>
                            <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                                <CreditCard size={20} className="text-blue-600 dark:text-sky-400 mb-1" />
                                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Secure Payment</span>
                                <span className="text-[10px] text-slate-400">Multiple options</span>
                            </div>
                            <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                                <RefreshCw size={20} className="text-blue-600 dark:text-sky-400 mb-1" />
                                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">7-Day Return</span>
                                <span className="text-[10px] text-slate-400">Hassle free</span>
                            </div>
                            <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                                <Award size={20} className="text-blue-600 dark:text-sky-400 mb-1" />
                                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Warranty Included</span>
                                <span className="text-[10px] text-slate-400">Official warranty</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ====== LOWER SECTION: TABS & DEEP-DIVE (Matching Reference Mockup) ====== */}
                <div className="mt-12 sm:mt-16 pt-8 border-t border-slate-200/80 dark:border-white/10" id="product-details-section">
                    
                    {/* Clean Underline Tab Strip */}
                    <div className="flex items-center gap-6 sm:gap-8 overflow-x-auto scrollbar-none border-b border-slate-200 dark:border-white/10 mb-8 pb-3">
                        {[
                            { id: 'overview', label: 'Product Details' },
                            { id: 'specifications', label: 'Specifications' },
                            { id: 'reviews', label: 'Reviews (142)' },
                            { id: 'faqs', label: 'FAQs' },
                        ].map(tab => {
                            const isActive = activeDetailTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveDetailTab(tab.id)}
                                    className={`relative text-sm font-bold pb-2 transition-all shrink-0 ${
                                        isActive
                                            ? 'text-blue-600 dark:text-sky-400'
                                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                    }`}
                                >
                                    {tab.label}
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTabUnderline"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-sky-400 rounded-full"
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* ====== TAB 1: PRODUCT DETAILS ====== */}
                    {activeDetailTab === 'overview' && (
                        <div className="space-y-8 sm:space-y-10">
                            
                            {/* Block 1: Product Description & Lifestyle Banner */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                                {/* Description text & bullets */}
                                <div className="lg:col-span-7 space-y-4">
                                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                        Product Description
                                    </h3>
                                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-line">
                                        {introDescription}
                                    </p>
                                    <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200 font-medium pt-1">
                                        {descriptionBullets.map((bullet, bIdx) => (
                                            <li key={bIdx} className="flex items-start gap-2.5">
                                                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                                                    <Check size={12} strokeWidth={3} />
                                                </div>
                                                <span className="leading-tight">{bullet}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Lifestyle Quote Banner */}
                                <div className="lg:col-span-5 relative rounded-3xl p-6 sm:p-8 bg-[#f5efe6] dark:bg-[#151923] border border-amber-200/50 dark:border-white/10 overflow-hidden flex items-center justify-between min-h-[200px]">
                                    <div className="max-w-[180px] sm:max-w-[200px] z-10">
                                        <p className="text-sm sm:text-base font-serif italic text-slate-800 dark:text-amber-100 font-semibold leading-snug line-clamp-3">
                                            “Quality tested and verified for {categoryName}.”
                                        </p>
                                        <div className="w-8 h-0.5 bg-slate-400 dark:bg-amber-400/50 mt-3" />
                                        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider block mt-1.5">InTrust Assured</span>
                                    </div>
                                    <div className="relative w-28 sm:w-32 h-28 sm:h-32 rounded-2xl overflow-hidden shadow-md">
                                        <Image
                                            src={allImages[1] || allImages[0]}
                                            alt={product.title}
                                            fill
                                            sizes="160px"
                                            className="object-cover"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Block 2: 4-Item Horizontal Trust Strip (Matching Reference) */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 py-3 border-y border-slate-200/80 dark:border-white/10">
                                <div className="flex items-center gap-3 p-2">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-900 dark:text-white">100% Genuine</div>
                                        <div className="text-[11px] text-slate-400">Direct from verified brand</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-2">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                                        <Truck size={20} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-900 dark:text-white">Same-Day Delivery</div>
                                        <div className="text-[11px] text-slate-400">Order within 4h 12m</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-2">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                                        <RefreshCw size={20} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-900 dark:text-white">7-Day Returns</div>
                                        <div className="text-[11px] text-slate-400">Hassle free</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-2">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                                        <Coins size={20} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-900 dark:text-white">InTrust Coins</div>
                                        <div className="text-[11px] text-slate-400">On every purchase</div>
                                    </div>
                                </div>
                            </div>

                            {/* Block 3: Key Highlights & Quick Specifications (2-Column Cards) */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                
                                {/* Left Card: Key Highlights */}
                                <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 space-y-4 shadow-xs">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-sky-400 flex items-center justify-center">
                                            <Sparkles size={16} />
                                        </div>
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                            Key Highlights
                                        </h4>
                                    </div>
                                    <ul className="space-y-3 text-xs font-medium text-slate-700 dark:text-slate-300">
                                        <li className="flex items-start gap-2.5">
                                            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                                                <Check size={12} strokeWidth={3} />
                                            </div>
                                            <span>100% Genuine product sourced from certified merchant</span>
                                        </li>
                                        <li className="flex items-start gap-2.5">
                                            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                                                <Check size={12} strokeWidth={3} />
                                            </div>
                                            <span>Tamper-evident verification seal applied before transit</span>
                                        </li>
                                        <li className="flex items-start gap-2.5">
                                            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                                                <Check size={12} strokeWidth={3} />
                                            </div>
                                            <span>Eligible for InTrust Reward Coins credited to wallet</span>
                                        </li>
                                        <li className="flex items-start gap-2.5">
                                            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                                                <Check size={12} strokeWidth={3} />
                                            </div>
                                            <span>Full manufacturer warranty support with direct GST invoice</span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Right Card: Quick Specifications */}
                                <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 space-y-4 shadow-xs">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-sky-400 flex items-center justify-center">
                                            <Package size={16} />
                                        </div>
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                            Specifications
                                        </h4>
                                    </div>
                                    <div className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                                        {dynamicSpecifications.slice(0, 8).map((spec, sIdx) => (
                                            <div key={sIdx} className="flex justify-between py-2 items-center">
                                                <span className="text-slate-400 shrink-0">{spec.label}</span>
                                                <span className="font-bold text-slate-900 dark:text-white text-right ml-4 truncate max-w-[200px]">{spec.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setActiveDetailTab('specifications')}
                                        className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 pt-1"
                                    >
                                        <span>View All Specifications ({dynamicSpecifications.length})</span>
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Block 4: Green Sustainable Choice Banner */}
                            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                        <Leaf size={22} />
                                    </div>
                                    <div>
                                        <h5 className="text-xs sm:text-sm font-black text-emerald-900 dark:text-emerald-200">
                                            Sustainable Choice
                                        </h5>
                                        <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 font-medium mt-0.5">
                                            This product comes in eco-friendly, tamper-proof packaging as part of our commitment to a greener future.
                                        </p>
                                    </div>
                                </div>
                                <div className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-white/10 text-emerald-800 dark:text-emerald-200 text-xs font-bold border border-emerald-300/40 shrink-0">
                                    📦 100% Recyclable InTrust Box
                                </div>
                            </div>

                            {/* Block 5: 2x2 Grid (Delivery & Services + Sold By + Need Help?) */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                
                                {/* Left Card: Delivery & Services */}
                                <div className="lg:col-span-7 p-5 sm:p-6 rounded-3xl bg-white dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 space-y-4 shadow-xs">
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                                        <Truck size={16} className="text-blue-600 dark:text-sky-400" />
                                        <span>Delivery & Services</span>
                                    </h4>
                                    <div className="space-y-3.5 text-xs">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                                                <Zap size={16} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-white">Same-Day Delivery</div>
                                                <div className="text-[11px] text-slate-400">Order within 4h 12m • Live tracking</div>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                                                <RefreshCw size={16} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-white">Easy Returns</div>
                                                <div className="text-[11px] text-slate-400">7-day return & exchange</div>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                                <Lock size={16} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-white">Secure Payment</div>
                                                <div className="text-[11px] text-slate-400">100% safe & encrypted</div>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                                <ShieldCheck size={16} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-white">InTrust Buyer Protection</div>
                                                <div className="text-[11px] text-slate-400">Get what you ordered or your money back</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Sold by + Need Help? */}
                                <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
                                    {/* Sold By Card */}
                                    <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 space-y-3.5 shadow-xs">
                                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                            Sold by
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-sm">
                                                {selectedOffer.merchant_name?.[0] || 'I'}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-black text-sm text-slate-900 dark:text-white truncate">
                                                        {selectedOffer.merchant_name}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-sky-400 border border-blue-200 dark:border-blue-800 text-[10px] font-black uppercase shrink-0">
                                                        Verified Merchant
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                                    <span className="flex items-center text-amber-500 font-bold">★ 4.8</span>
                                                    <span>|</span>
                                                    <span>10K+ orders</span>
                                                </div>
                                            </div>
                                        </div>
                                        {selectedOffer.merchant_slug && (
                                            <Link
                                                href={`/shop/${selectedOffer.merchant_slug}`}
                                                className="w-full h-9 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-600 dark:text-sky-400 border border-slate-200 dark:border-white/10 text-xs font-bold flex items-center justify-center gap-1 transition-all"
                                            >
                                                <span>View Store</span>
                                                <ChevronRight size={14} />
                                            </Link>
                                        )}
                                    </div>

                                    {/* Need Help Card */}
                                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 shadow-xs">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                                                <Headphones size={18} />
                                            </div>
                                            <div>
                                                <div className="text-xs font-black text-slate-900 dark:text-white">Need Help?</div>
                                                <div className="text-[11px] text-slate-400">Our support team is here for you.</div>
                                            </div>
                                        </div>
                                        <a
                                            href="tel:18008890199"
                                            className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shrink-0 shadow-xs"
                                        >
                                            Contact Support
                                        </a>
                                    </div>
                                </div>
                            </div>

                            {/* Block 6: Customer Reviews Module (Matching Reference Mockup) */}
                            <div className="p-5 sm:p-8 rounded-3xl bg-white dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 space-y-6 shadow-xs">
                                {/* Header with "Write a Review" button */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Star size={18} className="fill-amber-500 text-amber-500" />
                                        <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                            Customer Reviews
                                        </h4>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => toast('Reviews are enabled for verified buyers after delivery.')}
                                        className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-xs"
                                    >
                                        Write a Review
                                    </button>
                                </div>

                                {/* Rating Summary Cluster: Big Score + Bars + Photo Strip */}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                                    
                                    {/* Big Score */}
                                    <div className="md:col-span-3 flex flex-col items-center md:items-start text-center md:text-left">
                                        <div className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white">
                                            4.8
                                        </div>
                                        <div className="flex items-center text-amber-500 gap-0.5 my-1.5">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} size={16} className="fill-amber-500" />
                                            ))}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            Based on 142 reviews
                                        </div>
                                    </div>

                                    {/* Progress Bars */}
                                    <div className="md:col-span-5 space-y-1.5 text-xs">
                                        {[
                                            { stars: 5, pct: 78 },
                                            { stars: 4, pct: 16 },
                                            { stars: 3, pct: 4 },
                                            { stars: 2, pct: 1 },
                                            { stars: 1, pct: 1 },
                                        ].map(item => (
                                            <div key={item.stars} className="flex items-center gap-2">
                                                <span className="w-6 text-slate-500 font-bold">{item.stars} ★</span>
                                                <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                                        style={{ width: `${item.pct}%` }}
                                                    />
                                                </div>
                                                <span className="w-8 text-right text-slate-400 font-semibold">{item.pct}%</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Customer Photos Strip */}
                                    <div className="md:col-span-4 flex flex-col items-center md:items-end">
                                        <span className="text-[11px] font-bold text-slate-400 mb-2">Customer Photos</span>
                                        <div className="flex items-center gap-1.5">
                                            {allImages.slice(0, 4).map((url, i) => (
                                                <div key={i} className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10">
                                                    <Image src={url} alt={`Review ${i + 1}`} fill sizes="48px" className="object-cover" />
                                                </div>
                                            ))}
                                            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white dark:bg-white/10 flex items-center justify-center text-xs font-black">
                                                +98
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 3 Customer Review Cards (Matching Mockup) */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[
                                        {
                                            id: 'rev-1',
                                            name: 'Aditi Sharma',
                                            time: '2 days ago',
                                            rating: 5,
                                            comment: 'Absolutely loved this item! The quality is so premium and the fit is perfect. Great for all occasions.',
                                            thumbs: 12,
                                            images: allImages.slice(0, 3)
                                        },
                                        {
                                            id: 'rev-2',
                                            name: 'Rohan Mehta',
                                            time: '1 week ago',
                                            rating: 5,
                                            comment: 'Good quality and exactly as shown in the pictures. Delivery was super fast and well packed.',
                                            thumbs: 8,
                                            images: allImages.slice(0, 1)
                                        },
                                        {
                                            id: 'rev-3',
                                            name: 'Neha Kapoor',
                                            time: '2 weeks ago',
                                            rating: 5,
                                            comment: 'Beautiful finish and very comfortable. Received lots of compliments! Will order again.',
                                            thumbs: 6,
                                            images: allImages.slice(0, 3)
                                        },
                                    ].map(rev => {
                                        const isHelpful = helpfulReviews.has(rev.id);
                                        return (
                                            <div
                                                key={rev.id}
                                                className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 space-y-3 flex flex-col justify-between bg-white dark:bg-white/[0.01]"
                                            >
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-xs font-bold text-slate-900 dark:text-white">{rev.name}</span>
                                                                <Check size={12} className="text-blue-600 stroke-[3]" />
                                                            </div>
                                                            <div className="text-[10px] text-slate-400">{rev.time}</div>
                                                        </div>
                                                        <div className="flex items-center text-amber-500">
                                                            {[...Array(rev.rating)].map((_, idx) => (
                                                                <Star key={idx} size={12} className="fill-amber-500" />
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                                        {rev.comment}
                                                    </p>
                                                    {rev.images.length > 0 && (
                                                        <div className="flex items-center gap-1.5 pt-1">
                                                            {rev.images.map((imgUrl, imgIdx) => (
                                                                <div key={imgIdx} className="relative w-11 h-11 rounded-lg overflow-hidden border border-slate-100 dark:border-white/5">
                                                                    <Image src={imgUrl} alt="Review attachment" fill sizes="44px" className="object-cover" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5 text-xs text-slate-400">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setHelpfulReviews(prev => {
                                                                const next = new Set(prev);
                                                                if (next.has(rev.id)) next.delete(rev.id);
                                                                else next.add(rev.id);
                                                                return next;
                                                            });
                                                        }}
                                                        className={`flex items-center gap-1 font-semibold transition-colors ${
                                                            isHelpful ? 'text-blue-600 dark:text-sky-400' : 'hover:text-slate-900 dark:hover:text-white'
                                                        }`}
                                                    >
                                                        <ThumbsUp size={13} className={isHelpful ? 'fill-blue-600' : ''} />
                                                        <span>Helpful ({rev.thumbs + (isHelpful ? 1 : 0)})</span>
                                                    </button>
                                                    <button type="button" aria-label="More" className="hover:text-slate-900 dark:hover:text-white">
                                                        <MoreHorizontal size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ====== TAB 2: SPECIFICATIONS ====== */}
                    {activeDetailTab === 'specifications' && (
                        <div className="max-w-3xl rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-xs">
                            <div className="divide-y divide-slate-200 dark:divide-white/10 text-xs">
                                {dynamicSpecifications.map((spec, sIdx) => (
                                    <div
                                        key={sIdx}
                                        className={`grid grid-cols-3 p-3.5 ${sIdx % 2 === 0 ? 'bg-slate-50/60 dark:bg-white/[0.02]' : 'bg-white dark:bg-transparent'}`}
                                    >
                                        <span className="font-bold text-slate-500">{spec.label}</span>
                                        <span className="col-span-2 font-bold text-slate-900 dark:text-white">{spec.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ====== TAB 3: REVIEWS ====== */}
                    {activeDetailTab === 'reviews' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50">
                                <div className="text-4xl font-black text-amber-600">4.8</div>
                                <div>
                                    <div className="flex items-center text-amber-500 gap-0.5">
                                        {[...Array(5)].map((_, i) => <Star key={i} size={16} className="fill-amber-500" />)}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Based on 142 verified customer purchases</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ====== TAB 4: FAQS ====== */}
                    {activeDetailTab === 'faqs' && (
                        <div className="max-w-3xl space-y-3 text-xs">
                            <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10">
                                <h5 className="font-bold text-slate-900 dark:text-white mb-1">How fast will I receive my order?</h5>
                                <p className="text-slate-500 dark:text-slate-400">All orders placed with InTrust Same-Day delivery are dispatched from nearby partner stores and delivered on the same day.</p>
                            </div>
                            <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10">
                                <h5 className="font-bold text-slate-900 dark:text-white mb-1">Can I return or exchange this item?</h5>
                                <p className="text-slate-500 dark:text-slate-400">Yes! We provide a 7-day hassle-free replacement or return guarantee directly through your InTrust account.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* ====== RECENTLY VIEWED (Carousel Matching Reference) ====== */}
                <div className="mt-14 pt-10 border-t border-slate-200/80 dark:border-white/10">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                                Recently Viewed
                            </span>
                        </div>
                        <Link
                            href="/shop"
                            className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                        >
                            See All →
                        </Link>
                    </div>
                    <RecentlyViewed currentProductId={product.id} />
                </div>

                {/* ====== YOU MAY ALSO LIKE (Carousel Matching Reference) ====== */}
                {recommendedProducts.length > 0 && (
                    <div className="mt-10 sm:mt-14 pt-8 sm:pt-10 border-t border-slate-200/80 dark:border-white/10">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                                    You may also like
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    Curated alternatives available with same-day delivery
                                </p>
                            </div>
                            <Link
                                href={`/shop/category/${encodeURIComponent(categoryName.toLowerCase().replace(/\s+/g, '-'))}`}
                                className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                            >
                                View All →
                            </Link>
                        </div>

                        {/* Product Cards Grid using ProductCardV2 */}
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                            {recommendedProducts.map(item => (
                                <ProductCardV2 key={item.id} item={item} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ====== MOBILE STICKY BOTTOM ACTION BAR ====== */}
            <div className={`fixed bottom-0 left-0 right-0 z-50 sm:hidden backdrop-blur-xl border-t shadow-[0_-8px_30px_rgba(0,0,0,0.12)] pb-[max(12px,env(safe-area-inset-bottom,12px))] pt-2.5 px-3.5 ${isDark ? 'bg-[#080a10]/95 border-white/[0.08]' : 'bg-white/95 border-slate-200'}`}>
                <div className="flex flex-col gap-2 w-full">
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
                            {savingsPercent > 0 && (
                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                                    {savingsPercent}% OFF
                                </span>
                            )}
                        </div>

                        <Link 
                            href="/shop/cart"
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                                cartCount > 0 
                                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-500/30' 
                                    : 'bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-white/10'
                            }`}
                        >
                            <ShoppingCart size={13} />
                            <span>{cartCount > 0 ? `${cartCount} in Bag` : 'Bag'}</span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Quantity Counter */}
                        <div className="flex items-center rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/10 h-11 px-1 shrink-0">
                            <button
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                disabled={isOutOfStock}
                                aria-label="Decrease quantity"
                                className="w-8 h-full flex items-center justify-center text-slate-500 dark:text-slate-400 active:scale-90 transition-all disabled:opacity-30"
                            >
                                <Minus size={13} strokeWidth={2.5} />
                            </button>
                            <span className="text-xs font-black w-6 text-center text-slate-900 dark:text-white">{quantity}</span>
                            <button
                                onClick={() => setQuantity(quantity + 1)}
                                disabled={isOutOfStock}
                                aria-label="Increase quantity"
                                className="w-8 h-full flex items-center justify-center text-slate-500 dark:text-slate-400 active:scale-90 transition-all disabled:opacity-30"
                            >
                                <Plus size={13} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Add to Cart */}
                        <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={addToCart}
                            disabled={loading || isOutOfStock}
                            className="flex-1 h-11 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all bg-blue-600 text-white shadow-md active:scale-95 disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={15} />
                            ) : addedToCart ? (
                                <><CheckCircle2 size={15} /><span>Added</span></>
                            ) : (
                                <><ShoppingCart size={15} /><span>Add to Cart</span></>
                            )}
                        </motion.button>

                        {/* Buy Now */}
                        <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={buyNow}
                            disabled={buyNowLoading || isOutOfStock}
                            className="flex-1 h-11 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 shadow-sm active:scale-95 disabled:opacity-50"
                        >
                            {buyNowLoading ? (
                                <Loader2 className="animate-spin" size={15} />
                            ) : (
                                <span>Buy Now</span>
                            )}
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* Size Guide Modal */}
            <SizeGuideModal
                isOpen={isSizeGuideOpen}
                onClose={() => setIsSizeGuideOpen(false)}
                category={product.category || categoryName}
            />

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

            {/* ====== FULL-SCREEN IMAGE LIGHTBOX OVERLAY ====== */}
            {isZoomed && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setIsZoomed(false)}
                >
                    <button
                        type="button"
                        onClick={() => setIsZoomed(false)}
                        className="absolute top-6 right-6 text-white p-2 rounded-full hover:bg-white/10 transition-colors z-10"
                        aria-label="Close"
                    >
                        <X size={28} />
                    </button>
                    {(allImages[selectedImageIndex] || allImages[0]) && (
                        <img
                            src={allImages[selectedImageIndex] || allImages[0]}
                            alt={product.title}
                            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
