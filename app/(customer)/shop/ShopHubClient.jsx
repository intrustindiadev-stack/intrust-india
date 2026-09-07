'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { 
    Search, 
    MapPin, 
    Star, 
    ShieldCheck, 
    Heart, 
    Sparkles, 
    Package, 
    SlidersHorizontal, 
    ChevronRight, 
    ChevronLeft,
    X, 
    Bolt, 
    Store, 
    Plus, 
    Check, 
    ShoppingBag, 
    ArrowRight, 
    Percent, 
    Clock, 
    Phone,
    Headphones,
    Smartphone,
    Shirt,
    Home,
    ShoppingBasket,
    Sun,
    Zap
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import CustomerBreadcrumbs from '@/components/common/CustomerBreadcrumbs';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { getCategorySlug, getCategoryIcon, getCategoryImage, getProductFallbackImage, FALLBACK_CATEGORIES } from '@/lib/shopping/categories';
import { getSubCategories } from '@/lib/constants/categories';

export default function ShopHubClient({ merchants = [], ratingsMap = {}, categories = [], merchantProductsMap = {} }) {
    const router = useRouter();
    const { user, profile } = useAuth();
    const activeCustomer = profile || user;
    const searchParams = useSearchParams();
    const urlCategory = searchParams?.get('category') || '';
    const urlSubCategory = searchParams?.get('sub_category') || '';

    const [searchQuery, setSearchQuery] = useState('');
    const [pickupMode, setPickupMode] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState(urlCategory);
    const [selectedSubCategory, setSelectedSubCategory] = useState(urlSubCategory || 'all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterOnlyOpen, setFilterOnlyOpen] = useState(false);
    const [filterMinRating, setFilterMinRating] = useState(0);
    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [addedProductId, setAddedProductId] = useState(null);
    const [visibleProductCount, setVisibleProductCount] = useState(8);
    const [productWishlistIds, setProductWishlistIds] = useState(new Set());
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Load product wishlists from DB
    useEffect(() => {
        if (activeCustomer?.id) {
            supabase
                .from('user_wishlists')
                .select('product_id')
                .eq('user_id', activeCustomer.id)
                .then(({ data }) => {
                    if (data) setProductWishlistIds(new Set(data.map(r => r.product_id)));
                });
        }
    }, [activeCustomer?.id]);

    const toggleProductWishlist = async (e, prod) => {
        e.preventDefault();
        e.stopPropagation();

        if (!activeCustomer?.id) {
            toast.error('Please sign in to save items');
            router.push('/login?next=/shop');
            return;
        }

        const isSaved = productWishlistIds.has(prod.id);
        if (isSaved) {
            setProductWishlistIds(prev => {
                const next = new Set(prev);
                next.delete(prod.id);
                return next;
            });
            await supabase.from('user_wishlists').delete().eq('user_id', activeCustomer.id).eq('product_id', prod.id);
            toast.success('Removed from wishlist');
        } else {
            setProductWishlistIds(prev => new Set([...prev, prod.id]));
            await supabase.from('user_wishlists').upsert({
                user_id: activeCustomer.id,
                product_id: prod.id,
                is_platform_item: true
            }, { onConflict: 'user_id,product_id' });
            toast.success('Saved to wishlist! ♥');
        }
    };

    // Sync selectedCategory and selectedSubCategory if URL parameter changes
    useEffect(() => {
        if (urlCategory) {
            setSelectedCategory(urlCategory);
        }
        if (urlSubCategory) {
            setSelectedSubCategory(urlSubCategory);
        } else if (urlCategory) {
            setSelectedSubCategory('all');
        }
    }, [urlCategory, urlSubCategory]);

    const handleCategoryClick = useCallback((catSlug) => {
        setSelectedCategory(catSlug);
        setSelectedSubCategory('all');
        const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
        if (catSlug && catSlug !== 'all') {
            params.set('category', catSlug);
        } else {
            params.delete('category');
        }
        params.delete('sub_category');
        router.push(`/shop?${params.toString()}`, { scroll: false });
    }, [searchParams, router]);

    const handleSubCategoryClick = useCallback((sub) => {
        setSelectedSubCategory(sub);
        const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
        if (sub && sub !== 'all') {
            params.set('sub_category', sub);
        } else {
            params.delete('sub_category');
        }
        router.push(`/shop?${params.toString()}`, { scroll: false });
    }, [searchParams, router]);

    // Fetch real products from shopping_products table using valid schema columns
    useEffect(() => {
        const fetchProducts = async () => {
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
                        category,
                        sub_category,
                        is_active
                    `)
                    .eq('is_active', true)
                    .order('created_at', { ascending: false });

                if (!error && data && data.length > 0) {
                    const mapped = data.map((p, idx) => ({
                        id: p.id,
                        title: p.title,
                        slug: p.slug,
                        description: p.description,
                        selling_price: Math.round(((p.platform_price_paise || p.suggested_retail_price_paise || 0) / 100)),
                        mrp: Math.round(((p.mrp_paise || p.suggested_retail_price_paise || 0) / 100)),
                        stock_quantity: p.admin_stock,
                        images: Array.isArray(p.product_images) && p.product_images.length > 0 
                            ? p.product_images 
                            : [],
                        category: p.category || 'all',
                        sub_category: p.sub_category || null,
                        rating: 4.8,
                        merchants: { business_name: 'InTrust Official', slug: 'intrust-official' }
                    }));
                    setProducts(mapped);
                } else {
                    setProducts([]);
                }
            } catch (err) {
                console.error('Failed to load shopping products:', err);
                setProducts([]);
            } finally {
                setProductsLoading(false);
            }
        };

        fetchProducts();
    }, []);

    // Filter merchants based on search, open status & rating
    const filteredMerchants = useMemo(() => {
        return merchants.filter((m) => {
            if (m.id === 'official' || m.slug === 'official' || m.slug === 'intrust-official') return false; // Handled in dedicated hub
            if (searchQuery && !m.business_name?.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }
            if (filterOnlyOpen && !m.is_open) return false;
            const rating = ratingsMap[m.id]?.avg_rating || 4.5;
            if (filterMinRating > 0 && rating < filterMinRating) return false;
            return true;
        });
    }, [merchants, searchQuery, filterOnlyOpen, filterMinRating, ratingsMap]);


    // Compute dynamic categories based on shopping_categories and active products
    const dynamicCategoryList = useMemo(() => {
        const list = [{ label: 'All Categories', slug: '', icon: Sparkles, image: '' }];
        
        const baseCategories = (categories && categories.length > 0)
            ? categories
            : FALLBACK_CATEGORIES;

        baseCategories.forEach(cat => {
            const slug = getCategorySlug(cat);
            const label = cat.name || cat.label || slug;
            const Icon = getCategoryIcon(label);
            const image = cat.image_url || getCategoryImage(cat);
            list.push({ label, slug, icon: Icon, image });
        });

        // Add any categories present in products not already in the list
        const existingSlugs = new Set(list.map(c => c.slug));
        products.forEach(p => {
            if (p.category) {
                const slug = getCategorySlug(p.category);
                if (slug && !existingSlugs.has(slug)) {
                    existingSlugs.add(slug);
                    list.push({ 
                        label: p.category, 
                        slug, 
                        icon: getCategoryIcon(p.category),
                        image: getCategoryImage(p.category)
                    });
                }
            }
        });

        return list;
    }, [categories, products]);

    // Compute available sub-categories for active category
    const availableSubCategories = useMemo(() => {
        if (!selectedCategory || selectedCategory === 'all') {
            // If no category selected, collect all distinct non-General sub-categories across catalog
            const allSubs = new Set();
            products.forEach(p => {
                if (p.sub_category && p.sub_category !== 'General') {
                    allSubs.add(p.sub_category);
                }
            });
            return Array.from(allSubs).slice(0, 12);
        }
        
        const matchedCat = dynamicCategoryList.find(
            c => c.slug === selectedCategory || c.label.toLowerCase() === selectedCategory.toLowerCase()
        );
        const catName = matchedCat?.label || selectedCategory;
        const canonical = getSubCategories(catName);

        const productSubs = new Set();
        products.forEach(p => {
            if (p.category && (p.category.toLowerCase() === catName.toLowerCase() || getCategorySlug(p.category) === selectedCategory)) {
                if (p.sub_category && p.sub_category !== 'General') {
                    productSubs.add(p.sub_category);
                }
            }
        });

        return Array.from(new Set([...canonical, ...Array.from(productSubs)]));
    }, [selectedCategory, dynamicCategoryList, products]);

    // Filter products based on search, category & sub_category
    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
            if (searchQuery) {
                const matchTitle = p.title?.toLowerCase().includes(searchQuery.toLowerCase());
                const matchDesc = p.description?.toLowerCase().includes(searchQuery.toLowerCase());
                if (!matchTitle && !matchDesc) return false;
            }
            if (selectedCategory && selectedCategory !== 'all') {
                const prodCatSlug = getCategorySlug(p.category);
                const selCatSlug = getCategorySlug(selectedCategory);
                if (prodCatSlug !== selCatSlug && !(p.category || '').toLowerCase().includes(selCatSlug)) {
                    return false;
                }
            }
            if (selectedSubCategory && selectedSubCategory !== 'all') {
                const pSub = (p.sub_category || '').toLowerCase();
                const target = selectedSubCategory.toLowerCase();
                if (pSub !== target && !pSub.includes(target) && !target.includes(pSub)) {
                    return false;
                }
            }
            return true;
        });
    }, [products, searchQuery, selectedCategory, selectedSubCategory]);

    const categoryScrollRef = useRef(null);
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [pendingCartProduct, setPendingCartProduct] = useState(null);

    const scrollCategories = (direction) => {
        if (!categoryScrollRef.current) return;
        const scrollAmount = 300;
        categoryScrollRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    };

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
                setPendingCartProduct(product);
                setConfirmModalOpen(true);
                return;
            }

            window.dispatchEvent(new Event('cartUpdated'));
            setAddedProductId(product.id);
            toast.success(`Added ${product.title} to cart! 🛒`);

            setTimeout(() => {
                setAddedProductId(null);
            }, 2000);
        } catch (err) {
            console.error('Add to cart error:', err);
            toast.error(err.message || 'Failed to add item to cart');
        }
    };

    const handleAddToCart = async (e, product) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (!activeCustomer?.id) {
            toast.error('Please sign in to add items to your cart');
            router.push('/login?next=/shop');
            return;
        }

        await executeAddToCart(product);
    };

    const handleConfirmClearCart = async () => {
        if (!pendingCartProduct || !activeCustomer?.id) return;
        setConfirmModalOpen(false);
        try {
            await supabase.from('shopping_cart').delete().eq('customer_id', activeCustomer.id);
            await executeAddToCart(pendingCartProduct);
        } catch (err) {
            console.error('Error clearing cart:', err);
            toast.error('Failed to replace cart');
        }
        setPendingCartProduct(null);
    };

    const handleCancelClearCart = () => {
        setConfirmModalOpen(false);
        setPendingCartProduct(null);
    };

    if (!isMounted) return null;

    return (
        <div className="w-full space-y-6 font-body-md text-slate-900 dark:text-on-surface">
            {/* Top Breadcrumbs */}
            <CustomerBreadcrumbs items={[{ label: 'Shop & Local Stores' }]} className="mb-2" />

            {/* ── EDITORIAL HEADER SECTION (Stitch Screen #30703825561c4f3c9ce69d33b63f890a) ── */}
            <div className="relative overflow-hidden rounded-3xl bg-surface-container-lowest p-6 sm:p-8 border border-outline-variant/30 shadow-sm">
                <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
                <div className="absolute left-1/3 -bottom-20 h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col gap-6">
                    {/* Top Row: Title + Fast Pickup Switcher */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div className="max-w-3xl">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] uppercase tracking-wider font-extrabold">
                                    Bhopal Hub Central
                                </span>
                                <span className="text-on-surface-variant text-xs">•</span>
                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                                    <ShieldCheck size={14} /> 100% Buyer Protection
                                </span>
                            </div>
                            <h1 className="text-2xl sm:text-4xl font-black text-on-surface tracking-tight leading-tight">
                                Explore Shop &amp; Local Bhopal Stores
                            </h1>
                            <p className="text-xs sm:text-sm text-on-surface-variant mt-2 max-w-2xl font-medium leading-relaxed">
                                Browse verified Bhopal merchant inventory, top brand electronics, and genuine local store selections backed by InTrust Buyer Guarantee.
                            </p>
                        </div>

                        {/* Store Mode Switcher */}
                        <div className="p-1.5 rounded-2xl bg-surface-container-low flex items-center gap-1 self-start md:self-auto shrink-0 border border-outline-variant/20">
                            <button
                                onClick={() => { setPickupMode('all'); handleCategoryClick(''); }}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    pickupMode === 'all' && selectedCategory !== 'official'
                                        ? 'bg-surface-container-lowest text-primary shadow-sm'
                                        : 'text-on-surface-variant hover:text-on-surface'
                                }`}
                            >
                                <ShoppingBag size={14} />
                                <span>All Stores</span>
                            </button>
                            <Link
                                href="/shop/official"
                                className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-lowest"
                            >
                                <Sparkles size={14} className="text-blue-500" />
                                <span>InTrust Official</span>
                            </Link>
                        </div>
                    </div>

                    {/* Integrated Search & Category Pills */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center pt-2">
                        {/* Omnibox search */}
                        <div className="lg:col-span-4 relative flex items-center">
                            <Search size={18} className="absolute left-3.5 text-brand-steel pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search gadgets, verified dealers, SKU..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-11 pl-11 pr-4 rounded-2xl bg-surface-container-low text-on-surface text-xs font-medium placeholder:text-brand-steel focus:outline-none focus:bg-surface-container-lowest border border-transparent focus:border-primary shadow-inner transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 text-brand-steel hover:text-on-surface"
                                >
                                    <X size={15} />
                                </button>
                            )}
                        </div>

                        {/* Horizontal Dynamic Category Chips */}
                        <div className="lg:col-span-8 flex items-center gap-2 overflow-x-auto pb-1.5 lg:pb-0 scrollbar-none">
                            {dynamicCategoryList.map((cat, idx) => {
                                const Icon = cat.icon;
                                const isActive = (selectedCategory === '' && cat.slug === '') || 
                                    (cat.slug !== '' && (selectedCategory === cat.slug || selectedCategory.toLowerCase() === cat.label.toLowerCase()));

                                return (
                                    <button
                                        key={cat.slug || idx}
                                        onClick={() => handleCategoryClick(cat.slug)}
                                        className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shadow-xs active:scale-95 ${
                                            isActive
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-950 dark:bg-surface-container-low dark:hover:bg-surface-container-high dark:text-on-surface-variant dark:hover:text-on-surface border border-slate-200 dark:border-outline-variant/20'
                                        }`}
                                    >
                                        {Icon && <Icon size={14} className={isActive ? 'text-white' : 'text-blue-600 dark:text-primary'} />}
                                        <span>{cat.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── DUAL PROMOTIONAL EDITORIAL BANNERS ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Promo 1: Festive Electronics Bonanza */}
                <div className="lg:col-span-7 relative overflow-hidden rounded-3xl text-white p-7 sm:p-8 flex flex-col justify-between shadow-lg group border border-blue-500/30 bg-slate-950 min-h-[300px]">
                    {/* Real Commercial Photography Background */}
                    <img 
                        src="https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&q=80&w=1400" 
                        alt="Tech & Electronics" 
                        className="absolute inset-0 w-full h-full object-cover object-center opacity-40 group-hover:scale-105 transition-transform duration-700 pointer-events-none" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-transparent pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-blue-400/30 backdrop-blur-md">
                                <Sparkles size={11} className="text-amber-400" /> TECH & ELECTRONICS BONANZA
                            </span>
                            <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/90 text-[10px] font-bold backdrop-blur-md border border-white/10">
                                Bhopal Exclusive Deals
                            </span>
                        </div>
                        <div className="max-w-md">
                            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight drop-shadow-sm">
                                Up to 60% Off on Top Tech Brands
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-200 mt-2 font-medium leading-relaxed">
                                Unmatched deals on trending electronics and essentials with exclusive rewards and coins straight back into your InTrust Wallet.
                            </p>
                        </div>
                    </div>

                    <div className="relative z-10 pt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/15 mt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
                                <Sparkles size={20} className="text-[#D4AF37]" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Instant InTrust Credit</p>
                                <p className="text-sm font-black text-white">Wallet Rewards</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleCategoryClick('electronics')}
                            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
                        >
                            <span>Shop Tech Deals</span>
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </div>

                {/* Promo 2: InTrust Official & Express Delivery */}
                <div className="lg:col-span-5 relative overflow-hidden rounded-3xl text-white p-7 sm:p-8 flex flex-col justify-between shadow-lg border border-emerald-500/30 bg-emerald-950 group min-h-[300px]">
                    {/* Real Commercial Photography Background */}
                    <img 
                        src="https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=1200" 
                        alt="InTrust Official Express" 
                        className="absolute inset-0 w-full h-full object-cover object-center opacity-35 group-hover:scale-105 transition-transform duration-700 pointer-events-none" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-emerald-950/85 to-transparent pointer-events-none" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30 backdrop-blur-md flex items-center gap-1">
                                <Zap size={12} className="fill-emerald-400 text-emerald-400" />
                                Express Dispatch
                            </span>
                            <span className="px-2.5 py-1 rounded-full bg-white/10 text-white text-[10px] font-bold backdrop-blur-md border border-white/15">
                                Official Hub
                            </span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-sm">
                            InTrust Official
                        </h3>
                        <p className="text-xs text-slate-200 mt-2 font-medium leading-relaxed">
                            Order genuine essentials and verified gadgets directly from the official InTrust hub with live order tracking and verified fulfillment.
                        </p>
                    </div>

                    <div className="relative z-10 pt-6 mt-6 border-t border-white/15 flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-300 uppercase font-bold">Buyer Protection</span>
                            <span className="text-sm font-black text-emerald-400">100% InTrust Guarantee</span>
                        </div>
                        <Link
                            href="/shop/official"
                            className="px-5 py-2.5 rounded-xl bg-white text-emerald-950 hover:bg-slate-100 font-black text-xs transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                        >
                            <span>Visit Official Store</span>
                            <ArrowRight size={13} />
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── SHOP BY CATEGORY • HORIZONTAL CAROUSEL ── */}
            <div className="w-full space-y-3 pt-1">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider border border-blue-500/20">
                                Curated Categories
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-brand-steel font-semibold">
                                Instant Delivery &amp; Pickup
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            Explore Top Categories
                        </h2>
                    </div>
                    {/* CTA & Carousel Navigation Buttons */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Link
                            href="/shop/category"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white text-xs font-black transition-all border border-blue-500/20 shadow-xs active:scale-95"
                        >
                            <span>Shop by Category</span>
                            <ArrowRight size={13} />
                        </Link>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => scrollCategories('left')}
                                aria-label="Previous categories"
                                className="w-8 h-8 rounded-full bg-white dark:bg-surface-container-low border border-slate-200 dark:border-outline-variant/20 flex items-center justify-center text-slate-700 dark:text-on-surface hover:bg-slate-100 dark:hover:bg-surface-container-high transition-all shadow-xs active:scale-95"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollCategories('right')}
                                aria-label="Next categories"
                                className="w-8 h-8 rounded-full bg-white dark:bg-surface-container-low border border-slate-200 dark:border-outline-variant/20 flex items-center justify-center text-slate-700 dark:text-on-surface hover:bg-slate-100 dark:hover:bg-surface-container-high transition-all shadow-xs active:scale-95"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                <div 
                    ref={categoryScrollRef}
                    className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto scroll-smooth py-2 px-0.5"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {dynamicCategoryList
                        .filter((c) => c.slug !== '')
                        .map((cat) => {
                            const Icon = cat.icon;
                            return (
                                <Link
                                    key={cat.slug}
                                    href={`/shop/category/${cat.slug}`}
                                    className="group shrink-0 w-32 sm:w-36 p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-surface-container-lowest border border-slate-200/80 dark:border-outline-variant/25 hover:border-blue-500/50 dark:hover:border-primary/50 transition-all hover:shadow-md hover:-translate-y-0.5 flex flex-col items-center text-center justify-between"
                                >
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-slate-50 dark:bg-black/20 p-1 flex items-center justify-center relative shadow-xs transition-transform duration-300 group-hover:scale-105">
                                        {cat.image ? (
                                            <img
                                                src={cat.image}
                                                alt={cat.label}
                                                className="w-full h-full object-cover rounded-xl"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    const fallbackEl = e.currentTarget.nextSibling;
                                                    if (fallbackEl) fallbackEl.style.display = 'flex';
                                                }}
                                            />
                                        ) : null}
                                        <div 
                                            className="w-full h-full items-center justify-center text-primary"
                                            style={{ display: cat.image ? 'none' : 'flex' }}
                                        >
                                            <Icon size={24} strokeWidth={2.2} />
                                        </div>
                                    </div>
                                    <div className="w-full mt-2.5 min-h-[32px] flex flex-col items-center justify-center">
                                        <span className="text-xs font-bold text-slate-800 dark:text-on-surface group-hover:text-blue-600 dark:group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                                            {cat.label}
                                        </span>
                                    </div>
                                </Link>
                            );
                        })}
                </div>
            </div>

            {/* ── 1. VERIFIED BHOPAL STORES & MERCHANT CATALOGS (FEATURED FIRST) ── */}
            {filteredMerchants.length > 0 && (
                <div className="w-full space-y-6 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider border border-blue-500/20">
                                    Local Commerce Network
                                </span>
                                <span className="text-[11px] text-slate-500 dark:text-brand-steel font-semibold">
                                    Bhopal Verified Sellers
                                </span>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight flex items-center gap-2">
                                <span>🏬 Verified Stores &amp; Retail Catalogs</span>
                            </h2>
                            <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5">
                                Direct merchant contact with fast local store pickup &amp; 100% InTrust Protection
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredMerchants.map((merchant) => {
                            const banner = merchant.shopping_banner_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80';
                            const merchantPhone = merchant.phone || merchant.business_phone;
                            const isOpen = merchant.is_open !== false;
                            const ratingVal = ratingsMap[merchant.id]?.avg_rating;
                            const storeUrl = `/shop/${merchant.slug || merchant.id}`;

                            // Get ONLY this merchant's products
                            const storeProds = (merchantProductsMap[merchant.id] || []).slice(0, 3);

                            return (
                                <div
                                    key={merchant.id}
                                    onClick={() => router.push(storeUrl)}
                                    className="group bg-white dark:bg-[#0c0e16] hover:bg-slate-50 dark:hover:bg-white/[0.02] rounded-3xl p-4 border border-slate-200/90 dark:border-white/[0.08] hover:border-blue-500/40 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer relative"
                                >
                                    <div>
                                        <div className="relative h-44 w-full rounded-2xl overflow-hidden bg-surface-container-low mb-4">
                                            <img
                                                src={banner}
                                                alt={merchant.business_name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />

                                            <div className="absolute top-3 left-3 flex items-center gap-2">
                                                {isOpen ? (
                                                    <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                        Open Now
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-1 rounded-full bg-slate-700 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
                                                        Closed
                                                    </span>
                                                )}
                                                <span className="px-2 py-1 rounded-full bg-black/50 backdrop-blur-md text-white text-[10px] font-bold">
                                                    Direct Order
                                                </span>
                                            </div>

                                            {/* Top right: Rating */}
                                            {ratingVal != null && (
                                                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                                                    <div className="px-2 py-1 rounded-xl bg-white/95 backdrop-blur-md text-slate-900 text-xs font-black flex items-center gap-1 shadow-sm">
                                                        <Star size={12} className="text-amber-500 fill-amber-500" />
                                                        <span>{Number(ratingVal).toFixed(1)}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {merchant.business_address && (
                                                <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1 text-white text-xs font-semibold truncate">
                                                    <MapPin size={13} className="text-[#D4AF37] shrink-0" />
                                                    <span className="truncate">{merchant.business_address}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-extrabold text-base text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {merchant.business_name}
                                            </h3>
                                            <ShieldCheck size={16} className="text-blue-600 dark:text-primary shrink-0" title="Verified Merchant" />
                                        </div>

                                        {merchant.business_address && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-1 mb-2">
                                                {merchant.business_address}
                                            </p>
                                        )}

                                        {/* Merchant's OWN Products Preview */}
                                        {storeProds.length > 0 ? (
                                            <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-white/5">
                                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-brand-steel mb-2 flex items-center gap-1">
                                                    <Sparkles size={11} className="text-amber-500" />
                                                    Featured in this Store
                                                </p>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {storeProds.map((p) => {
                                                        const pImg = getProductFallbackImage(p);
                                                        return (
                                                            <div 
                                                                key={p.id}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    router.push(`/shop/product/${p.slug || p.id}`);
                                                                }}
                                                                className="p-1.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 hover:border-blue-500/40 transition-all flex flex-col justify-between group/prod"
                                                            >
                                                                <div className="w-full h-12 rounded-lg overflow-hidden bg-white dark:bg-black/20 mb-1 flex items-center justify-center p-0.5">
                                                                    <img src={pImg} alt={p.title} className="w-full h-full object-contain group-hover/prod:scale-105 transition-transform" />
                                                                </div>
                                                                <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{p.title}</span>
                                                                <span className="text-[11px] font-black text-blue-600 dark:text-primary mt-0.5">₹{p.selling_price}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-white/5">
                                                <div className="flex items-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] text-slate-500 dark:text-slate-400 text-[11px] font-semibold">
                                                    <Store size={13} className="text-blue-500" />
                                                    <span>Verified Merchant Catalog • Live Pickup</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3 mt-3">
                                        {merchantPhone && (
                                            <a
                                                href={`tel:${merchantPhone}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white text-xs font-bold flex items-center gap-1.5 border border-slate-200/80 dark:border-white/10 transition-colors"
                                                title="Call Store Merchant"
                                            >
                                                <Phone size={13} className="text-emerald-600 dark:text-emerald-400" />
                                                <span>Call</span>
                                            </a>
                                        )}

                                        <Link
                                            href={storeUrl}
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                                        >
                                            <span>Visit Storefront</span>
                                            <ArrowRight size={13} />
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── 2. CURATED FEATURED PRODUCTS & TRENDING DEALS (LIMITED & CLEAN) ── */}
            <div className="w-full space-y-6 pt-6 border-t border-outline-variant/20">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider border border-rose-500/20">
                                Curated Deals
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-brand-steel font-semibold">
                                Best Value Picks
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight flex items-center gap-2">
                            <span>🔥 Featured Deals &amp; Top Products</span>
                        </h2>
                        <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5">
                            Showing {Math.min(visibleProductCount, filteredProducts.length)} of {filteredProducts.length} curated genuine items
                        </p>
                    </div>

                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="px-3.5 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/20 text-xs font-bold text-on-surface flex items-center gap-1.5 transition-colors"
                    >
                        <SlidersHorizontal size={14} />
                        <span>Filters</span>
                    </button>
                </div>

                {/* Filter Drawers / Chips */}
                {isFilterOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 flex flex-wrap items-center gap-3"
                    >
                        <label className="flex items-center gap-2 text-xs font-bold text-on-surface cursor-pointer">
                            <input
                                type="checkbox"
                                checked={filterOnlyOpen}
                                onChange={(e) => setFilterOnlyOpen(e.target.checked)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span>Open Stores Only</span>
                        </label>

                        <div className="flex items-center gap-2 pl-4 border-l border-outline-variant/20 text-xs font-bold text-on-surface">
                            <span>Rating:</span>
                            {[0, 4.0, 4.5].map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setFilterMinRating(r)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                        filterMinRating === r
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                                    }`}
                                >
                                    {r === 0 ? 'All' : `${r}+ ★`}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Sub-Category Filter Chips */}
                {availableSubCategories.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-brand-steel mr-1 shrink-0 flex items-center gap-1">
                            <Sparkles size={12} className="text-violet-500" />
                            Sub-Category:
                        </span>
                        <button
                            onClick={() => handleSubCategoryClick('all')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                selectedSubCategory === 'all'
                                    ? 'bg-violet-600 text-white shadow-xs font-black'
                                    : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant'
                            }`}
                        >
                            All
                        </button>
                        {availableSubCategories.map((sub) => (
                            <button
                                key={sub}
                                onClick={() => handleSubCategoryClick(sub)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                    selectedSubCategory === sub
                                        ? 'bg-violet-600 text-white shadow-xs font-black'
                                        : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant'
                                }`}
                            >
                                {sub}
                            </button>
                        ))}
                    </div>
                )}

                {/* Products Grid — Responsive 2 cols on mobile */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                    {filteredProducts.slice(0, visibleProductCount).map((prod) => {
                        const discount = prod.mrp && prod.selling_price 
                            ? Math.round(((prod.mrp - prod.selling_price) / prod.mrp) * 100)
                            : 0;

                        const isAdded = addedProductId === prod.id;
                        const isWishlisted = productWishlistIds.has(prod.id);
                        const imageUrl = getProductFallbackImage(prod);

                        return (
                            <Link
                                key={prod.id}
                                href={`/shop/product/${prod.slug || prod.id}`}
                                className="group flex flex-col justify-between bg-surface-container-lowest hover:bg-surface-container-low rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-outline-variant/30 hover:border-blue-500/50 shadow-sm hover:shadow-xl transition-all duration-300 relative"
                            >
                                <div>
                                    <div className="relative w-full aspect-square rounded-xl sm:rounded-2xl overflow-hidden bg-surface-container-low mb-3 sm:mb-4 flex items-center justify-center p-2 sm:p-3">
                                        <img
                                            src={imageUrl}
                                            alt={prod.title}
                                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                        />

                                        {discount > 0 && (
                                            <div className="absolute top-2 left-2 px-1.5 sm:px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-sm">
                                                {discount}% OFF
                                            </div>
                                        )}

                                        <div className="absolute bottom-2 left-2 px-1.5 sm:px-2 py-0.5 rounded-lg bg-surface-container-lowest/90 backdrop-blur-md text-on-surface text-[9px] sm:text-[10px] font-black flex items-center gap-1 shadow-sm">
                                            <Star size={10} className="text-amber-500 fill-amber-500" />
                                            <span>{prod.rating || '4.8'}</span>
                                        </div>

                                        {/* Animated Wishlist Heart Button */}
                                        <motion.button
                                            type="button"
                                            whileTap={{ scale: 1.35 }}
                                            whileHover={{ scale: 1.1 }}
                                            onClick={(e) => toggleProductWishlist(e, prod)}
                                            className={`absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all z-10 ${
                                                isWishlisted 
                                                    ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-500 border border-rose-200 dark:border-rose-800 shadow-sm'
                                                    : 'bg-white/80 dark:bg-black/50 text-slate-400 hover:text-rose-500 border border-slate-200/60 dark:border-white/10'
                                            }`}
                                            title={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
                                        >
                                            <motion.div
                                                animate={isWishlisted ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                <Heart size={14} className={isWishlisted ? "fill-rose-500 text-rose-500" : "currentColor"} />
                                            </motion.div>
                                        </motion.button>
                                    </div>

                                    <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-brand-steel font-semibold mb-1 truncate">
                                        <Store size={11} className="text-blue-600 dark:text-primary shrink-0" />
                                        <span className="truncate">{prod.merchants?.business_name || 'Verified Store'}</span>
                                        {prod.sub_category && prod.sub_category !== 'General' && (
                                            <>
                                                <span>•</span>
                                                <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 truncate">{prod.sub_category}</span>
                                            </>
                                        )}
                                    </div>

                                    <h3 className="font-bold text-xs sm:text-sm text-on-surface line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-primary transition-colors">
                                        {prod.title}
                                    </h3>
                                </div>

                                <div className="pt-4 mt-3 border-t border-outline-variant/20 flex items-center justify-between gap-2">
                                    <div className="flex flex-col">
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-lg font-black text-on-surface">
                                                ₹{Number(prod.selling_price).toLocaleString('en-IN')}
                                            </span>
                                            {prod.mrp && prod.mrp > prod.selling_price && (
                                                <span className="text-xs text-brand-steel line-through font-semibold">
                                                    ₹{Number(prod.mrp).toLocaleString('en-IN')}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                            Earn Coins
                                        </span>
                                    </div>

                                    <motion.button
                                        type="button"
                                        whileTap={{ scale: 0.88 }}
                                        onClick={(e) => handleAddToCart(e, prod)}
                                        className={`w-10 h-10 rounded-xl font-black text-xs flex items-center justify-center transition-all shrink-0 shadow-md ${
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

                {/* Show More Products Button */}
                {filteredProducts.length > visibleProductCount && (
                    <div className="flex justify-center pt-2">
                        <button
                            type="button"
                            onClick={() => setVisibleProductCount(prev => prev + 8)}
                            className="px-6 py-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high text-on-surface font-black text-xs uppercase tracking-wider border border-outline-variant/30 flex items-center gap-2 shadow-xs transition-all active:scale-95"
                        >
                            <span>Explore More Products ({filteredProducts.length - visibleProductCount} more)</span>
                            <ArrowRight size={14} />
                        </button>
                    </div>
                )}
            </div>


            {/* Single Merchant Cart Conflict Modal (Zomato-Style) */}
            <ConfirmModal
                isOpen={confirmModalOpen}
                title="Replace items in cart?"
                message="Your cart already contains products from another store. InTrust supports ordering from one verified merchant at a time to guarantee direct local fulfillment. Would you like to discard the previous items and start a new cart?"
                confirmLabel="Discard & Add"
                cancelLabel="Keep Current Cart"
                onConfirm={handleConfirmClearCart}
                onCancel={handleCancelClearCart}
            />
        </div>
    );
}
