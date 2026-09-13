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
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import CustomerBreadcrumbs from '@/components/common/CustomerBreadcrumbs';
import ConfirmModal from '@/components/ui/ConfirmModal';
import MerchantCard from '@/components/customer/shop/MerchantCard';
import MiniCartDrawer from '@/components/customer/shop/MiniCartDrawer';
import { MERCHANT_DEPARTMENTS, getDepartmentMeta } from '@/lib/constants/departments';
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
    const [selectedDepartment, setSelectedDepartment] = useState('all');
    const [isMiniCartOpen, setIsMiniCartOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterOnlyOpen, setFilterOnlyOpen] = useState(false);
    const [filterMinRating, setFilterMinRating] = useState(0);
    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [addedProductId, setAddedProductId] = useState(null);
    const [visibleProductCount, setVisibleProductCount] = useState(8);
    const [productWishlistIds, setProductWishlistIds] = useState(new Set());
    const [wishlistLoading, setWishlistLoading] = useState(new Set());
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const handleOpenMiniCart = () => setIsMiniCartOpen(true);
        window.addEventListener('openMiniCart', handleOpenMiniCart);
        return () => window.removeEventListener('openMiniCart', handleOpenMiniCart);
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

        if (wishlistLoading.has(prod.id)) return;

        setWishlistLoading(prev => new Set(prev).add(prod.id));

        const isSaved = productWishlistIds.has(prod.id);
        if (isSaved) {
            setProductWishlistIds(prev => {
                const next = new Set(prev);
                next.delete(prod.id);
                return next;
            });
        } else {
            setProductWishlistIds(prev => new Set([...prev, prod.id]));
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
                setProductWishlistIds(prev => new Set([...prev, prod.id]));
            } else {
                setProductWishlistIds(prev => {
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

    // Filter merchants based on search, department, open status & rating
    const filteredMerchants = useMemo(() => {
        return merchants.filter((m) => {
            if (m.id === 'official' || m.slug === 'official' || m.slug === 'intrust-official') return false; // Handled in dedicated hub
            if (searchQuery && !m.business_name?.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }
            if (selectedDepartment && selectedDepartment !== 'all') {
                const mDept = (m.department || 'general').toLowerCase();
                if (mDept !== selectedDepartment.toLowerCase()) return false;
            }
            if (filterOnlyOpen && !m.is_open) return false;
            const rating = ratingsMap[m.id]?.avg_rating || 4.5;
            if (filterMinRating > 0 && rating < filterMinRating) return false;
            return true;
        });
    }, [merchants, searchQuery, selectedDepartment, filterOnlyOpen, filterMinRating, ratingsMap]);


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
    const [dealFilter, setDealFilter] = useState('all');

    const scrollCategorySlider = (direction) => {
        if (!categoryScrollRef.current) return;
        const scrollAmount = 350;
        categoryScrollRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    };

    // Compute dynamic categories for the creative carousel with proper routing
    const carouselDepartments = useMemo(() => {
        const list = [];
        MERCHANT_DEPARTMENTS.forEach(dept => {
            const slug = dept.key.replace(/_/g, '-');
            list.push({
                key: dept.key,
                label: dept.label,
                shortLabel: dept.label.split('&')[0].trim(),
                badge: dept.badge || 'Same Day',
                slug: slug,
                gradient: dept.gradient || 'from-blue-600 to-indigo-600',
                image: getCategoryImage(dept.label)
            });
        });
        const deptSlugs = new Set(MERCHANT_DEPARTMENTS.map(d => d.key.replace(/_/g, '-')));
        (categories || []).forEach(cat => {
            const slug = getCategorySlug(cat);
            if (!deptSlugs.has(slug)) {
                const label = cat.name || cat.label || slug;
                list.push({
                    key: slug,
                    label: label,
                    shortLabel: label.split('&')[0].trim(),
                    badge: 'Verified',
                    slug: slug,
                    gradient: 'from-indigo-600 to-blue-600',
                    image: cat.image_url || getCategoryImage(label)
                });
            }
        });
        return list;
    }, [categories]);

    // Filter deals / top products strictly limited to 8 items
    const displayedDeals = useMemo(() => {
        let list = [...filteredProducts];
        if (dealFilter === 'under_500') {
            list = list.filter(p => Number(p.selling_price || p.price || 0) <= 500);
        } else if (dealFilter === 'under_1500') {
            list = list.filter(p => Number(p.selling_price || p.price || 0) <= 1500);
        } else if (dealFilter === 'discount_20') {
            list = list.filter(p => {
                const sp = Number(p.selling_price || p.price || 0);
                if (!p.mrp || !sp) return false;
                return Math.round(((p.mrp - sp) / p.mrp) * 100) >= 20;
            });
        }
        return list.slice(0, 8);
    }, [filteredProducts, dealFilter]);

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

            setAddedProductId(product.id);
            setTimeout(() => setAddedProductId(null), 2000);
            window.dispatchEvent(new Event('cartUpdated'));
            toast.success(`Added ${product.title} to cart`);
        } catch (err) {
            console.error('Error adding to cart:', err);
            toast.error('Failed to add product to cart');
        }
    };

    const handleAddToCart = (e, product) => {
        e.preventDefault();
        e.stopPropagation();

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(50); } catch (e) {}
        }

        if (!activeCustomer?.id) {
            toast.error('Please sign in to add items to cart');
            router.push('/login?next=/shop');
            return;
        }

        executeAddToCart(product);
    };

    const handleConfirmClearCart = async () => {
        setConfirmModalOpen(false);
        if (!pendingCartProduct) return;

        try {
            const { error: clearError } = await supabase
                .from('shopping_cart')
                .delete()
                .eq('customer_id', activeCustomer.id);

            if (clearError) throw clearError;

            await executeAddToCart(pendingCartProduct);
            toast.success('Cart updated with new store items');
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
        <div className="w-full space-y-6 font-body-md text-slate-900 dark:text-on-surface transition-colors duration-500">
            {/* Top Breadcrumbs */}
            <CustomerBreadcrumbs items={[{ label: 'Shop & Local Stores' }]} className="mb-2" />

            {/* ── 1. MAIN HERO BANNER (Softened, Vibrant & Clean) ── */}
            <div className="relative w-full rounded-3xl overflow-hidden shadow-md border border-outline-variant/30 min-h-[190px] sm:min-h-[230px] flex items-center group bg-gradient-to-r from-blue-950/80 via-slate-900/60 to-slate-950/40">
                <img
                    src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1400"
                    alt="Everyday Essentials"
                    className="absolute inset-0 w-full h-full object-cover object-center opacity-55 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
                />
                {/* Soft, translucent gradient overlay that does not hide the picture */}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-900/40 to-transparent pointer-events-none" />

                <div className="relative z-10 p-6 sm:p-8 max-w-xl flex flex-col justify-between h-full">
                    <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] sm:text-[11px] font-black tracking-widest uppercase text-sky-300 bg-sky-500/25 px-3 py-1 rounded-full border border-sky-400/30 w-fit backdrop-blur-md flex items-center gap-1.5">
                                <Zap size={12} className="fill-sky-400 text-sky-400" />
                                Guaranteed Same-Day Delivery
                            </span>
                            <span className="text-[10px] sm:text-[11px] font-bold text-white/90 bg-white/10 px-2.5 py-1 rounded-full border border-white/20 backdrop-blur-md">
                                100% InTrust Guarantee
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight drop-shadow-sm">
                            Everything You Need, Delivered In Minutes
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                            Shop fresh groceries, daily essentials, electronics &amp; local partner inventory with express doorstep fulfillment.
                        </p>
                    </div>

                    <div className="pt-4 flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setSelectedDepartment('grocery')}
                            className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-blue-600/30 transition-all active:scale-95"
                        >
                            <span>Shop Daily Essentials</span>
                            <ArrowRight size={14} />
                        </button>
                        <Link
                            href="/shop/category"
                            className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm backdrop-blur-md border border-white/20 transition-all active:scale-95"
                        >
                            Browse All Departments
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── 2. UNIFIED STORE SWITCHER, SEARCH & DEPARTMENT FILTER BAR ── */}
            <div className="p-4 sm:p-5 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-3.5">
                {/* Top Row: Store Mode Switcher + Omnibox Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Animated Store Mode Toggle Switcher with InTrust Logo */}
                    <div className="p-1 rounded-2xl bg-surface-container-low flex items-center gap-1 shrink-0 border border-outline-variant/20 self-start sm:self-auto relative">
                        <motion.button
                            type="button"
                            whileTap={{ scale: 0.95 }}
                            onClick={() => { setPickupMode('all'); handleCategoryClick(''); }}
                            className={`relative px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 z-10 ${
                                pickupMode === 'all' && selectedCategory !== 'official'
                                    ? 'text-blue-600 dark:text-sky-400 font-black'
                                    : 'text-on-surface-variant hover:text-on-surface'
                            }`}
                        >
                            {pickupMode === 'all' && selectedCategory !== 'official' && (
                                <motion.div
                                    layoutId="storeToggleIndicator"
                                    className="absolute inset-0 bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/30 -z-10"
                                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                />
                            )}
                            <Store size={14} />
                            <span>All Stores</span>
                        </motion.button>
                        <motion.button
                            type="button"
                            whileTap={{ scale: 0.95 }}
                            onClick={() => router.push('/shop/official')}
                            className={`relative px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 z-10 ${
                                selectedCategory === 'official' || pickupMode === 'official'
                                    ? 'text-blue-600 dark:text-sky-400 font-black'
                                    : 'text-on-surface-variant hover:text-blue-600 dark:hover:text-sky-400'
                            }`}
                        >
                            {(selectedCategory === 'official' || pickupMode === 'official') && (
                                <motion.div
                                    layoutId="storeToggleIndicator"
                                    className="absolute inset-0 bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/30 -z-10"
                                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                />
                            )}
                            <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center overflow-hidden p-0.5 border border-slate-200 dark:border-white/20 shadow-2xs">
                                <Image src="/icons/intrustLogo.png" alt="InTrust" width={14} height={14} className="object-contain" />
                            </div>
                            <span>InTrust Official</span>
                        </motion.button>
                    </div>

                    {/* Search Omnibox */}
                    <div className="flex-1 relative flex items-center">
                        <Search size={17} className="absolute left-4 text-brand-steel pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search local stores, groceries, gadgets, items..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-11 pl-11 pr-10 rounded-2xl bg-surface-container-low text-on-surface text-xs sm:text-sm font-medium placeholder:text-brand-steel focus:outline-none focus:bg-surface-container-lowest border border-transparent focus:border-blue-500 shadow-inner transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 text-brand-steel hover:text-on-surface p-1"
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Department-Only Filter Chips */}
                <div className="w-full flex items-center gap-2 overflow-x-auto no-scrollbar pt-0.5">
                    <button
                        type="button"
                        onClick={() => setSelectedDepartment('all')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-xs ${
                            selectedDepartment === 'all'
                                ? 'bg-blue-600 text-white shadow-sm font-black'
                                : 'bg-white hover:bg-slate-100 text-slate-700 dark:bg-surface-container-low dark:hover:bg-surface-container-high dark:text-on-surface-variant border border-slate-200 dark:border-outline-variant/20'
                        }`}
                    >
                        All Stores
                    </button>
                    {MERCHANT_DEPARTMENTS.map((dept) => {
                        const isActive = selectedDepartment === dept.key;
                        return (
                            <button
                                key={dept.key}
                                type="button"
                                onClick={() => setSelectedDepartment(dept.key)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shadow-xs ${
                                    isActive
                                        ? 'bg-blue-600 text-white shadow-sm font-black'
                                        : 'bg-white hover:bg-slate-100 text-slate-700 dark:bg-surface-container-lowest dark:hover:bg-surface-container-low dark:text-on-surface-variant border border-slate-200 dark:border-outline-variant/30'
                                }`}
                            >
                                <span>{dept.label.split('&')[0].trim()}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── 3. SHOP BY CATEGORY • DYNAMIC QUICK COMMERCE CAROUSEL ── */}
            <div className="w-full space-y-3 pt-1">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
                                Shop by Category
                            </h2>
                            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-black uppercase tracking-wider border border-sky-500/20">
                                Same-Day Delivery
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5">
                            Select any department to browse live inventory &amp; express deals
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {/* Desktop Carousel Scroll Arrows */}
                        <div className="hidden sm:flex items-center gap-1 mr-1">
                            <button
                                type="button"
                                onClick={() => scrollCategorySlider('left')}
                                aria-label="Previous departments"
                                className="w-8 h-8 rounded-full bg-surface-container-lowest hover:bg-surface-container-low border border-outline-variant/30 flex items-center justify-center text-on-surface transition-all active:scale-95 shadow-xs"
                            >
                                <ChevronLeft size={15} />
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollCategorySlider('right')}
                                aria-label="Next departments"
                                className="w-8 h-8 rounded-full bg-surface-container-lowest hover:bg-surface-container-low border border-outline-variant/30 flex items-center justify-center text-on-surface transition-all active:scale-95 shadow-xs"
                            >
                                <ChevronRight size={15} />
                            </button>
                        </div>
                        <Link
                            href="/shop/category"
                            className="text-xs sm:text-sm font-black text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 shrink-0"
                        >
                            <span>View All</span>
                            <ChevronRight size={14} />
                        </Link>
                    </div>
                </div>

                {/* Horizontal Scroll Carousel with Direct Department Redirects */}
                <div
                    ref={categoryScrollRef}
                    className="w-full flex items-stretch gap-3 overflow-x-auto no-scrollbar scroll-smooth py-1"
                >
                    {carouselDepartments.map((cat) => {
                        const Icon = getCategoryIcon(cat.label);
                        const href = `/shop/category/${cat.slug}`;

                        return (
                            <Link
                                key={cat.slug}
                                href={href}
                                className="group shrink-0 w-[120px] sm:w-[136px] p-3 rounded-2xl sm:rounded-3xl bg-surface-container-lowest hover:bg-surface-container-low border border-outline-variant/25 hover:border-blue-500/50 transition-all duration-300 flex flex-col items-center text-center justify-between shadow-xs hover:shadow-lg active:scale-95 cursor-pointer"
                            >
                                <div className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center p-2 mb-2 transition-transform group-hover:scale-110 shadow-xs bg-gradient-to-tr ${cat.gradient} text-white overflow-hidden`}>
                                    <Icon size={26} strokeWidth={2.2} className="relative z-10 text-white drop-shadow-xs" />
                                </div>
                                
                                <div className="space-y-0.5 w-full">
                                    <span className="text-[12px] sm:text-xs font-black text-on-surface group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors line-clamp-1 leading-tight">
                                        {cat.shortLabel}
                                    </span>
                                    <span className="text-[9px] sm:text-[10px] font-bold text-on-surface-variant block truncate">
                                        {cat.badge}
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* ── 4. TRUSTED STORES NEAR YOU ── */}
            <div className="w-full space-y-4 pt-2">
                <div className="relative w-full rounded-3xl p-6 sm:p-8 overflow-hidden border border-blue-500/25 bg-gradient-to-br from-[#070b14] via-[#0c142b] to-[#070b18] shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group">
                    {/* ── Rich InTrust Theme Background Illustration & Grid ── */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        {/* Soft Ambient Radial Orbs */}
                        <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl" />
                        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-sky-500/15 rounded-full blur-3xl" />
                        <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl" />

                        {/* Architectural Network Grid & Store Vectors */}
                        <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <pattern id="store-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-blue-400" />
                                    <circle cx="0" cy="0" r="1.5" fill="currentColor" className="text-sky-400" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#store-grid)" />
                            {/* Curved Network Connection Waypoints */}
                            <path d="M 200 120 Q 380 40 600 90 T 950 50" fill="none" stroke="url(#net-gradient)" strokeWidth="1.5" strokeDasharray="4 4" />
                            <path d="M 150 70 Q 420 130 750 80" fill="none" stroke="url(#net-gradient)" strokeWidth="1" strokeDasharray="3 3" />
                            <defs>
                                <linearGradient id="net-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.1" />
                                    <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.6" />
                                    <stop offset="100%" stopColor="#818cf8" stopOpacity="0.1" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>

                    {/* Left: Content & Badges */}
                    <div className="relative z-10 max-w-xl space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-sky-300 bg-sky-500/20 border border-sky-400/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 backdrop-blur-md">
                                <svg className="w-3 h-3 text-[#0095F6] shrink-0" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" fill="#0095F6" />
                                    <path d="M8.5 12.5L10.8 14.8L15.5 9.8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <span>Verified Local Network</span>
                            </span>
                            <span className="text-[11px] text-sky-200/80 font-bold flex items-center gap-1">
                                <Zap size={12} className="text-sky-400 fill-sky-400" />
                                <span>Same-Day Dispatch</span>
                            </span>
                        </div>

                        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                            Trusted Stores Near You
                        </h2>
                        
                        <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                            Direct neighborhood store inventory, transparent merchant pricing, and guaranteed same-day doorstep delivery.
                        </p>

                        {/* Feature Tags Row */}
                        <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-300 font-semibold">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
                                <ShieldCheck size={13} className="text-emerald-400" />
                                <span>100% Genuine Stock</span>
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
                                <Sparkles size={13} className="text-amber-400" />
                                <span>Zero Commission Markup</span>
                            </span>
                        </div>
                    </div>

                    {/* Right: Graphic Card with InTrust Storefront Illustration & Live Store Count */}
                    <div className="relative z-10 shrink-0 self-stretch sm:self-auto flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3">
                        {/* Live Active Store Count Pill */}
                        <div className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-xl border border-white/20 text-xs font-black text-white flex items-center gap-2.5 shadow-lg shadow-black/20 transition-all">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                            </span>
                            <span>{filteredMerchants.length} Active Stores Nearby</span>
                        </div>

                        {/* Storefront Illustration Accent (Desktop & Tablet) */}
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-950/40 border border-blue-500/20 text-[10px] font-bold text-sky-200">
                            <Store size={14} className="text-blue-400" />
                            <span>Bhopal Metro Region</span>
                        </div>
                    </div>
                </div>

                {filteredMerchants.length === 0 ? (
                    <div className="p-10 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 text-center space-y-2">
                        <Store size={36} className="mx-auto text-on-surface-variant/40" />
                        <h4 className="font-black text-base text-on-surface">No stores found in this department</h4>
                        <p className="text-xs text-on-surface-variant">Try selecting "All Stores" to explore other verified sellers.</p>
                        <button
                            type="button"
                            onClick={() => setSelectedDepartment('all')}
                            className="mt-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
                        >
                            View All Stores
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredMerchants.map((merchant) => (
                            <MerchantCard
                                key={merchant.id}
                                merchant={merchant}
                                variant="showcase"
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ── 5. CURATED FLASH DEALS & TOP PRODUCTS (Amazon-Grade Clean & Premium) ── */}
            <div className="w-full space-y-4 pt-4 border-t border-outline-variant/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider border border-rose-500/20">
                                Today's Deals
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-brand-steel font-semibold">
                                Best Value Picks
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight flex items-center gap-2">
                            <span>⚡ Top Curated Deals</span>
                        </h2>
                    </div>

                    {/* Price & Discount Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'all', label: 'All Deals' },
                            { id: 'under_500', label: 'Under ₹500' },
                            { id: 'under_1500', label: 'Under ₹1,500' },
                            { id: 'discount_20', label: '20%+ Off' },
                        ].map((f) => (
                            <button
                                key={f.id}
                                type="button"
                                onClick={() => setDealFilter(f.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-2xs ${
                                    dealFilter === f.id
                                        ? 'bg-blue-600 text-white shadow-xs font-black'
                                        : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Amazon-Grade Clean Product Grid — 8 items max */}
                {displayedDeals.length === 0 ? (
                    <div className="p-10 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 text-center space-y-2">
                        <Package size={36} className="mx-auto text-on-surface-variant/40" />
                        <h4 className="font-black text-base text-on-surface">No products match this deal filter</h4>
                        <p className="text-xs text-on-surface-variant">Try selecting "All Deals" to see all curated products.</p>
                        <button
                            type="button"
                            onClick={() => setDealFilter('all')}
                            className="mt-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
                        >
                            Reset Deal Filter
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                        {displayedDeals.map((prod) => {
                            const discount = prod.mrp && prod.selling_price 
                                ? Math.round(((prod.mrp - prod.selling_price) / prod.mrp) * 100)
                                : 0;

                            const isAdded = addedProductId === prod.id;
                            const isWishlisted = productWishlistIds.has(prod.id);
                            const isWishlistBusy = wishlistLoading.has(prod.id);
                            const imageUrl = getProductFallbackImage(prod);
                            const isOfficial = (prod.merchants?.business_name || '').toLowerCase().includes('official');

                            return (
                                <div
                                    key={prod.id}
                                    onClick={() => router.push(`/shop/product/${prod.slug || prod.id}`)}
                                    className="group relative flex flex-col justify-between bg-surface-container-lowest hover:bg-surface-container-low rounded-3xl p-3 sm:p-3.5 border border-outline-variant/30 hover:border-blue-500/40 shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer"
                                >
                                    <div>
                                        {/* Product Image Container */}
                                        <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900/40 mb-2.5 flex items-center justify-center p-3 border border-slate-100 dark:border-white/5">
                                            <img
                                                src={imageUrl}
                                                alt={prod.title}
                                                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                                loading="lazy"
                                            />

                                            {/* Clean Deal Badge on Top-Left */}
                                            {discount > 0 ? (
                                                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs z-10">
                                                    {discount}% off
                                                </div>
                                            ) : (
                                                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-blue-600/90 text-white text-[10px] font-black tracking-tight flex items-center gap-1 shadow-xs z-10">
                                                    <Zap size={10} className="fill-white" />
                                                    <span>TOP PICK</span>
                                                </span>
                                            )}

                                            {/* Wishlist Heart Button on Top-Right */}
                                            <motion.button
                                                type="button"
                                                disabled={isWishlistBusy}
                                                whileTap={isWishlistBusy ? {} : { scale: 1.25 }}
                                                whileHover={isWishlistBusy ? {} : { scale: 1.1 }}
                                                onClick={(e) => {
                                                    if (typeof navigator !== 'undefined' && navigator.vibrate) {
                                                        try { navigator.vibrate(40); } catch (e) {}
                                                    }
                                                    toggleProductWishlist(e, prod);
                                                }}
                                                className={`absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all z-20 shadow-xs ${
                                                    isWishlistBusy ? 'opacity-70 cursor-wait' : ''
                                                } ${
                                                    isWishlisted 
                                                        ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-500 border border-rose-200 dark:border-rose-800 shadow-sm'
                                                        : 'bg-white/90 dark:bg-black/60 text-slate-400 hover:text-rose-500 border border-slate-200/60 dark:border-white/10'
                                                }`}
                                                title={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
                                            >
                                                {isWishlisted && (
                                                    <motion.span
                                                        key={`burst-${prod.id}`}
                                                        initial={{ scale: 0.8, opacity: 0.8 }}
                                                        animate={{ scale: 1.8, opacity: 0 }}
                                                        transition={{ duration: 0.45, ease: "easeOut" }}
                                                        className="absolute inset-0 rounded-full border-2 border-rose-500 pointer-events-none"
                                                    />
                                                )}
                                                <motion.div
                                                    animate={isWishlisted ? { 
                                                        scale: [1, 1.45, 0.85, 1.15, 1],
                                                        rotate: [0, -10, 10, -5, 0]
                                                    } : { scale: 1, rotate: 0 }}
                                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                                >
                                                    <Heart 
                                                        size={14} 
                                                        className={`transition-colors duration-300 ${
                                                            isWishlisted 
                                                                ? "fill-rose-500 text-rose-500 drop-shadow-[0_2px_6px_rgba(244,63,94,0.45)]" 
                                                                : "currentColor"
                                                        }`} 
                                                    />
                                                </motion.div>
                                            </motion.button>
                                        </div>

                                        {/* Merchant Tag with Instagram-Style Blue Verified Badge */}
                                        <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1 truncate">
                                            <Store size={11} className={isOfficial ? "text-blue-600 dark:text-sky-400 shrink-0" : "text-sky-600 dark:text-sky-400 shrink-0"} />
                                            <span className="truncate">{prod.merchants?.business_name || 'Verified Store'}</span>
                                            <svg className="w-3.5 h-3.5 text-[#0095F6] shrink-0 inline-block" viewBox="0 0 24 24" fill="none">
                                                <circle cx="12" cy="12" r="10" fill="#0095F6" />
                                                <path d="M8.5 12.5L10.8 14.8L15.5 9.8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>

                                        {/* Title */}
                                        <h3 className="font-bold text-xs sm:text-sm text-on-surface line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
                                            {prod.title}
                                        </h3>

                                        {/* Amazon Rating & Same-Day Badge Row */}
                                        <div className="flex items-center gap-1.5 mt-1.5 text-[11px]">
                                            <div className="flex items-center text-amber-500 font-bold">
                                                <Star size={11} className="fill-amber-500 text-amber-500" />
                                                <span className="ml-1 text-slate-800 dark:text-slate-200">{prod.rating || '4.8'}</span>
                                            </div>
                                            <span className="text-slate-400 text-[10px]">(120+)</span>
                                            <span className="text-slate-300 dark:text-slate-600">•</span>
                                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 truncate">
                                                <Zap size={9} className="fill-emerald-600 text-emerald-600" />
                                                Same-Day
                                            </span>
                                        </div>
                                    </div>

                                    {/* Amazon-Style Price Block & Action Button */}
                                    <div className="pt-2 mt-2 border-t border-slate-100 dark:border-white/5 space-y-2">
                                        <div className="flex items-baseline gap-1.5 flex-wrap">
                                            <span className="text-base sm:text-lg font-black text-on-surface">
                                                ₹{Number(prod.selling_price).toLocaleString('en-IN')}
                                            </span>
                                            {prod.mrp && prod.mrp > prod.selling_price && (
                                                <span className="text-[11px] text-slate-400 dark:text-slate-500 line-through font-semibold">
                                                    M.R.P. ₹{Number(prod.mrp).toLocaleString('en-IN')}
                                                </span>
                                            )}
                                        </div>

                                        {/* Full-width Responsive Action Button — Never overflows */}
                                        <div onClick={(e) => e.stopPropagation()} className="w-full">
                                            {isAdded ? (
                                                <div className="w-full h-8 sm:h-9 flex items-center justify-center bg-blue-700 text-white rounded-xl gap-1.5 text-xs font-black shadow-xs">
                                                    <Check size={14} strokeWidth={3} />
                                                    <span>Added to Cart</span>
                                                </div>
                                            ) : (
                                                <motion.button
                                                    type="button"
                                                    whileTap={{ scale: 0.96 }}
                                                    onClick={(e) => handleAddToCart(e, prod)}
                                                    className="w-full h-8 sm:h-9 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-blue-600/25"
                                                >
                                                    <ShoppingBag size={13} />
                                                    <span>Add to Cart</span>
                                                </motion.button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Browse Full Catalog Button */}
                <div className="flex justify-center pt-2">
                    <Link
                        href="/shop/category"
                        className="px-6 py-3 rounded-2xl bg-surface-container-low hover:bg-surface-container-high text-on-surface font-black text-xs uppercase tracking-wider border border-outline-variant/30 flex items-center gap-2 shadow-xs transition-all active:scale-95"
                    >
                        <span>Browse Complete Catalog in Categories</span>
                        <ArrowRight size={14} />
                    </Link>
                </div>
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

            {/* Slide-over Mini Cart Drawer */}
            <MiniCartDrawer
                isOpen={isMiniCartOpen}
                onClose={() => setIsMiniCartOpen(false)}
            />
        </div>
    );
}
