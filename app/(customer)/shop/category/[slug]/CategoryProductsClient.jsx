'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
    Search,
    X,
    Star, 
    Store, 
    Sparkles, 
    Package, 
    Check, 
    ArrowUpDown, 
    Plus, 
    Minus, 
    ShoppingBag, 
    CheckCircle2, 
    ChevronRight,
    Zap,
    Clock,
    ShieldCheck,
    ShoppingBasket,
    Headphones,
    Smartphone,
    Shirt,
    Home,
    Sun,
    Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { getCategorySlug, getCategoryIcon, getCategoryImage, getProductFallbackImage, FALLBACK_CATEGORIES } from '@/lib/shopping/categories';
import { getSubCategories } from '@/lib/constants/categories';
import FloatingCart from '@/app/(customer)/shop/[merchantSlug]/FloatingCart';

export default function CategoryProductsClient({ initialProducts = [], categoryName = '', categories = [] }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user } = useAuth();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', 'under_500', 'under_1500', 'discount_20', 'in_stock'
    const [selectedMerchantFilter, setSelectedMerchantFilter] = useState('all'); // 'all', 'official', 'local'
    const [selectedSubCategory, setSelectedSubCategory] = useState(searchParams?.get('sub_category') || 'all'); // 'all' or a valid sub-category name
    const [sortBy, setSortBy] = useState('popular'); // 'popular', 'price_asc', 'price_desc', 'rating'
    const [cartQuantities, setCartQuantities] = useState({}); // { [productId]: quantity }
    const [cartItemDetails, setCartItemDetails] = useState({}); // { [productId]: { price, mrp } }
    const [justAddedProduct, setJustAddedProduct] = useState(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Sync active cart from database on mount if logged in
    useEffect(() => {
        if (!user?.id) return;
        const fetchExistingCart = async () => {
            try {
                const { data, error } = await supabase
                    .from('shopping_cart')
                    .select(`
                        id,
                        product_id,
                        inventory_id,
                        quantity,
                        is_platform_item,
                        merchant_inventory (
                            id,
                            retail_price_paise,
                            custom_title
                        ),
                        shopping_products (
                            id,
                            title,
                            platform_price_paise,
                            suggested_retail_price_paise,
                            mrp_paise
                        )
                    `)
                    .eq('customer_id', user.id);

                if (!error && data) {
                    const qMap = {};
                    const detailsMap = {};
                    data.forEach(item => {
                        const key = item.inventory_id || item.product_id;
                        const qty = Number(item.quantity) || 1;
                        if (key) {
                            qMap[key] = (qMap[key] || 0) + qty;
                        }
                        const pricePaise = item.is_platform_item
                            ? (item.shopping_products?.platform_price_paise || item.shopping_products?.suggested_retail_price_paise || 0)
                            : (item.merchant_inventory?.retail_price_paise || item.shopping_products?.suggested_retail_price_paise || 0);
                        const mrpPaise = item.shopping_products?.mrp_paise || pricePaise;
                        const unitPrice = Math.round(Number(pricePaise) / 100);
                        const unitMrp = Math.round(Number(mrpPaise) / 100);

                        if (key) detailsMap[key] = { price: unitPrice, mrp: unitMrp };
                        if (item.product_id) detailsMap[item.product_id] = { price: unitPrice, mrp: unitMrp };
                        if (item.inventory_id) detailsMap[item.inventory_id] = { price: unitPrice, mrp: unitMrp };
                    });
                    setCartQuantities(qMap);
                    setCartItemDetails(detailsMap);
                }
            } catch (err) {
                console.error('Error fetching initial cart:', err);
            }
        };
        fetchExistingCart();
    }, [user?.id]);

    // Compute available sub-categories for the current category (canonical + dynamic from products)
    const availableSubCategories = useMemo(() => {
        const canonical = getSubCategories(categoryName);
        const dynamic = new Set();
        initialProducts.forEach(p => {
            if (p.sub_category && p.sub_category !== 'General') {
                dynamic.add(p.sub_category);
            }
        });
        return Array.from(new Set([...canonical, ...Array.from(dynamic)]));
    }, [categoryName, initialProducts]);

    const filteredAndSortedProducts = useMemo(() => {
        let list = [...initialProducts];

        // Search Query Filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(p => 
                p.title?.toLowerCase().includes(q) ||
                p.description?.toLowerCase().includes(q) ||
                p.sub_category?.toLowerCase().includes(q) ||
                (p.merchants?.business_name || '').toLowerCase().includes(q)
            );
        }

        // Merchant Filter
        if (selectedMerchantFilter === 'official') {
            list = list.filter(p => (p.merchants?.business_name || '').toLowerCase().includes('official'));
        } else if (selectedMerchantFilter === 'local') {
            list = list.filter(p => !(p.merchants?.business_name || '').toLowerCase().includes('official'));
        }

        // Sub-Category Filter
        if (selectedSubCategory !== 'all') {
            list = list.filter(p => {
                const pSub = (p.sub_category || '').toLowerCase();
                const pCat = (p.category || '').toLowerCase();
                const target = selectedSubCategory.toLowerCase();
                return pSub === target || pCat.includes(target) || target.includes(pCat);
            });
        }

        // Price / Stock / Discount Filtering
        if (selectedFilter === 'under_500') {
            list = list.filter(p => Number(p.sale_price || p.price || p.selling_price || 0) <= 500);
        } else if (selectedFilter === 'under_1500') {
            list = list.filter(p => Number(p.sale_price || p.price || p.selling_price || 0) <= 1500);
        } else if (selectedFilter === 'discount_20') {
            list = list.filter(p => {
                const sp = Number(p.sale_price || p.price || p.selling_price || 0);
                if (!p.mrp || !sp) return false;
                const disc = Math.round(((p.mrp - sp) / p.mrp) * 100);
                return disc >= 20;
            });
        } else if (selectedFilter === 'in_stock') {
            list = list.filter(p => (p.stock_quantity === undefined || p.stock_quantity > 0));
        }

        // Sorting
        if (sortBy === 'price_asc') {
            list.sort((a, b) => Number(a.sale_price || a.price || a.selling_price || 0) - Number(b.sale_price || b.price || b.selling_price || 0));
        } else if (sortBy === 'price_desc') {
            list.sort((a, b) => Number(b.sale_price || b.price || b.selling_price || 0) - Number(a.sale_price || a.price || a.selling_price || 0));
        } else if (sortBy === 'rating') {
            list.sort((a, b) => (Number(b.rating) || 4.5) - (Number(a.rating) || 4.5));
        }

        return list;
    }, [initialProducts, searchQuery, selectedFilter, selectedMerchantFilter, selectedSubCategory, sortBy]);

    const totalCartItems = useMemo(() => {
        return Object.values(cartQuantities).reduce((acc, q) => acc + (Number(q) || 0), 0);
    }, [cartQuantities]);

    const totalCartAmount = useMemo(() => {
        return Object.entries(cartQuantities).reduce((acc, [pId, qty]) => {
            const prod = initialProducts.find(x => 
                x.id === pId || 
                x.product_id === pId || 
                (x.inventory_id && x.inventory_id === pId) || 
                x.slug === pId
            );
            const price = Number(
                prod?.sale_price || 
                prod?.price || 
                prod?.selling_price || 
                cartItemDetails[pId]?.price || 
                0
            );
            return acc + (price * Number(qty || 0));
        }, 0);
    }, [cartQuantities, initialProducts, cartItemDetails]);

    const totalSavings = useMemo(() => {
        return Object.entries(cartQuantities).reduce((acc, [pId, qty]) => {
            const prod = initialProducts.find(x => 
                x.id === pId || 
                x.product_id === pId || 
                (x.inventory_id && x.inventory_id === pId) || 
                x.slug === pId
            );
            const price = Number(
                prod?.sale_price || 
                prod?.price || 
                prod?.selling_price || 
                cartItemDetails[pId]?.price || 
                0
            );
            const mrp = Number(prod?.mrp || cartItemDetails[pId]?.mrp || 0);
            if (mrp > price) {
                return acc + ((mrp - price) * Number(qty || 0));
            }
            return acc;
        }, 0);
    }, [cartQuantities, initialProducts, cartItemDetails]);

    // Blinkit-style Add to Cart
    const handleAddToCart = useCallback(async (product, e) => {
        if (e) e.stopPropagation();

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(50);
        }

        if (!user) {
            toast.error('Please login to add items to your cart');
            const returnUrl = pathname + (typeof window !== 'undefined' ? window.location.search : '');
            router.push(`/login?next=${encodeURIComponent(returnUrl)}`);
            return;
        }

        setCartQuantities(prev => ({
            ...prev,
            [product.id]: (prev[product.id] || 0) + 1
        }));

        const pPrice = Number(product.sale_price || product.price || product.selling_price || 0);
        const pMrp = Number(product.mrp || 0);
        setCartItemDetails(prev => ({
            ...prev,
            [product.id]: { price: pPrice, mrp: pMrp },
            ...(product.product_id ? { [product.product_id]: { price: pPrice, mrp: pMrp } } : {}),
            ...(product.inventory_id ? { [product.inventory_id]: { price: pPrice, mrp: pMrp } } : {})
        }));

        setJustAddedProduct(product);
        setTimeout(() => setJustAddedProduct(null), 2500);

        try {
            const isPlatform = !!product.is_platform;
            const { data, error } = await supabase.rpc('add_to_shopping_cart', {
                p_customer_id: user.id,
                p_inventory_id: isPlatform ? null : product.id,
                p_product_id: isPlatform ? product.id : (product.product_id || product.id),
                p_quantity: 1,
                p_is_platform: isPlatform
            });

            if (error) throw error;

            if (data?.message === 'MIXED_SELLER_ERROR') {
                toast((t) => (
                    <div className="flex flex-col gap-1 text-xs">
                        <span className="font-black text-amber-600">Different Store in Cart</span>
                        <span>Your bag contains items from another store. Please complete or clear your cart first.</span>
                        <Link href="/shop/cart" className="text-blue-600 font-bold underline mt-1" onClick={() => toast.dismiss(t.id)}>
                            View Current Bag →
                        </Link>
                    </div>
                ), { duration: 5000 });

                setCartQuantities(prev => {
                    const next = { ...prev };
                    delete next[product.id];
                    if (product.product_id) delete next[product.product_id];
                    if (product.inventory_id) delete next[product.inventory_id];
                    return next;
                });
            }
        } catch (err) {
            console.error('Cart add error:', err);
            toast.error('Failed to update cart');
            setCartQuantities(prev => {
                const next = { ...prev };
                if (next[product.id] > 1) {
                    next[product.id] -= 1;
                } else {
                    delete next[product.id];
                    if (product.product_id) delete next[product.product_id];
                    if (product.inventory_id) delete next[product.inventory_id];
                }
                return next;
            });
        }
    }, [user, router]);

    const handleRemoveFromCart = useCallback(async (product, e) => {
        if (e) e.stopPropagation();

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(40);
        }

        setCartQuantities(prev => {
            const current = prev[product.id] || 0;
            if (current <= 1) {
                const next = { ...prev };
                delete next[product.id];
                if (product.product_id) delete next[product.product_id];
                if (product.inventory_id) delete next[product.inventory_id];
                return next;
            }
            return {
                ...prev,
                [product.id]: current - 1
            };
        });

        try {
            if (user?.id) {
                const isPlatform = !!product.is_platform;
                const { data } = await supabase
                    .from('shopping_cart')
                    .select('id, quantity')
                    .eq('customer_id', user.id)
                    .eq('product_id', isPlatform ? product.id : (product.product_id || product.id))
                    .maybeSingle();

                if (data) {
                    if (data.quantity > 1) {
                        await supabase
                            .from('shopping_cart')
                            .update({ quantity: data.quantity - 1 })
                            .eq('id', data.id);
                    } else {
                        await supabase
                            .from('shopping_cart')
                            .delete()
                            .eq('id', data.id);
                    }
                }
            }
        } catch (err) {
            console.error('Remove from cart error:', err);
        }
    }, [user]);

    const handleSubCategorySelect = useCallback((sub) => {
        setSelectedSubCategory(sub);
        try {
            const currentParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
            if (sub === 'all') {
                currentParams.delete('sub_category');
            } else {
                currentParams.set('sub_category', sub);
            }
            const qs = currentParams.toString();
            router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
        } catch (e) {
            console.error('URL replace error:', e);
        }
    }, [pathname, router]);

    if (!isMounted) return null;

    return (
        <div className="space-y-4 transition-colors duration-500">
            {/* Search, Store Mode Switcher & Filter Toolbar (Matching Shop Hub) */}
            <div className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-[#0c0e16] border border-slate-200/90 dark:border-white/[0.08] shadow-xs space-y-3">
                {/* Top Row: Store Switcher & Search Omnibox */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Animated Store Toggle Segmented Control */}
                    <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shrink-0">
                        <motion.button
                            type="button"
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedMerchantFilter('all')}
                            className={`relative px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 z-10 ${
                                selectedMerchantFilter === 'all'
                                    ? 'text-slate-900 dark:text-white font-black'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            {selectedMerchantFilter === 'all' && (
                                <motion.div
                                    layoutId="catStoreToggleIndicator"
                                    className="absolute inset-0 bg-white dark:bg-[#141824] rounded-xl shadow-xs border border-slate-200/80 dark:border-white/10 -z-10"
                                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                />
                            )}
                            <Store size={14} />
                            <span>All Stores</span>
                        </motion.button>

                        <motion.button
                            type="button"
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedMerchantFilter('official')}
                            className={`relative px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 z-10 ${
                                selectedMerchantFilter === 'official'
                                    ? 'text-blue-600 dark:text-sky-400 font-black'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-sky-400'
                            }`}
                        >
                            {selectedMerchantFilter === 'official' && (
                                <motion.div
                                    layoutId="catStoreToggleIndicator"
                                    className="absolute inset-0 bg-white dark:bg-[#141824] rounded-xl shadow-xs border border-slate-200/80 dark:border-white/10 -z-10"
                                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                />
                            )}
                            <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center overflow-hidden p-0.5 border border-slate-200 dark:border-white/20 shadow-2xs shrink-0">
                                <Image src="/icons/intrustLogo.png" alt="InTrust" width={14} height={14} className="object-contain" />
                            </div>
                            <span>InTrust Official</span>
                        </motion.button>
                    </div>

                    {/* Search Omnibox */}
                    <div className="flex-1 relative flex items-center min-w-0">
                        <Search size={16} className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none shrink-0" />
                        <input
                            type="text"
                            placeholder={`Search ${categoryName || 'products'}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-10 pl-10 pr-9 rounded-2xl bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white text-xs sm:text-sm font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-[#0c0e16] border border-slate-200/80 dark:border-white/10 focus:border-blue-500 shadow-inner transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Sub-Category Filter Chips (if any exist for category) */}
                {availableSubCategories.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 border-t border-slate-100 dark:border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1 shrink-0">
                            Subcategory:
                        </span>
                        <button
                            key="sub-all"
                            onClick={() => handleSubCategorySelect('all')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                selectedSubCategory === 'all'
                                    ? 'bg-blue-600 text-white shadow-xs font-black'
                                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
                            }`}
                        >
                            All
                        </button>
                        {availableSubCategories.map((sub) => {
                            const active = selectedSubCategory === sub;
                            return (
                                <button
                                    key={sub}
                                    onClick={() => handleSubCategorySelect(sub)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                        active
                                            ? 'bg-blue-600 text-white shadow-xs font-black'
                                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    {sub}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Bottom Row: Price / Stock Filter Chips + Sort Dropdown */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                        {[
                            { id: 'all', label: 'All Products' },
                            { id: 'in_stock', label: 'In Stock' },
                            { id: 'under_500', label: 'Under ₹500' },
                            { id: 'under_1500', label: 'Under ₹1,500' },
                            { id: 'discount_20', label: '20%+ Off' },
                        ].map((f) => {
                            const active = selectedFilter === f.id;
                            return (
                                <button
                                    key={f.id}
                                    onClick={() => setSelectedFilter(f.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                        active
                                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs font-black'
                                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            aria-label="Sort products"
                            className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white text-xs font-bold rounded-xl px-2.5 py-1.5 outline-none cursor-pointer"
                        >
                            <option value="popular">Popular First</option>
                            <option value="price_asc">Price: Low to High</option>
                            <option value="price_desc">Price: High to Low</option>
                            <option value="rating">Highest Rated</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Products Grid — Clean, Wide & Spacious */}
            {filteredAndSortedProducts.length === 0 ? (
                <div className="p-12 rounded-3xl bg-white dark:bg-[#0c0e16] border border-slate-200/90 dark:border-white/[0.08] text-center space-y-3">
                    <Package size={40} className="mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                    <h3 className="text-base font-black text-slate-800 dark:text-white">No products match your filter</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Try resetting filters or searching for something else.</p>
                    <button
                        onClick={() => { setSelectedFilter('all'); setSelectedMerchantFilter('all'); setSelectedSubCategory('all'); setSearchQuery(''); }}
                        className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 transition-colors"
                    >
                        Reset All Filters
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
                    {filteredAndSortedProducts.map((prod) => {
                        const pPrice = Number(prod.sale_price || prod.price || prod.selling_price || 0);
                        const pMrp = Number(prod.mrp || 0);
                        const discount = pMrp > pPrice
                            ? Math.round(((pMrp - pPrice) / pMrp) * 100)
                            : 0;

                        const qty = cartQuantities[prod.id] || cartQuantities[prod.product_id] || (prod.inventory_id ? cartQuantities[prod.inventory_id] : 0) || 0;
                        const isOfficial = (prod.merchants?.business_name || '').toLowerCase().includes('official');
                        const merchantName = prod.merchants?.business_name || 'InTrust Official';

                        const targetSlug = prod.slug || prod.product_id || prod.id;
                        const merchantSlugParam = prod.merchants?.slug && prod.merchants.slug !== 'official' ? `?merchant=${prod.merchants.slug}` : '';
                        const targetUrl = targetSlug ? `/shop/product/${targetSlug}${merchantSlugParam}` : '/shop';

                        return (
                            <div
                                key={prod.id}
                                onClick={() => router.push(targetUrl)}
                                className="group relative bg-white dark:bg-[#0c0e16] hover:bg-slate-50 dark:hover:bg-white/[0.02] rounded-3xl p-2.5 sm:p-3.5 border border-slate-200/90 dark:border-white/[0.08] hover:border-blue-500/40 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer"
                            >
                                <div>
                                    {/* Product Image & Badges */}
                                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900 mb-2.5 flex items-center justify-center p-2.5 border border-slate-100 dark:border-white/5">
                                        <img
                                            src={getProductFallbackImage(prod)}
                                            alt={prod.title}
                                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                            loading="lazy"
                                        />

                                        {/* Delivery Badge — Same-Day Delivery */}
                                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-white/95 dark:bg-slate-900/95 text-blue-800 dark:text-sky-300 text-[10px] font-black tracking-tight flex items-center gap-1 shadow-xs border border-blue-500/25">
                                            <Zap size={10} className="text-blue-600 dark:text-sky-400 fill-blue-500" />
                                            <span>SAME DAY</span>
                                        </span>

                                        {/* Discount Badge */}
                                        {discount > 0 && (
                                            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[10px] font-black uppercase shadow-xs">
                                                {discount}% OFF
                                            </span>
                                        )}

                                        {/* Rating */}
                                        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-lg bg-white/95 dark:bg-slate-900/90 text-slate-800 dark:text-white text-[10px] font-black flex items-center gap-0.5 shadow-xs border border-slate-200/60 dark:border-white/10">
                                            <Star size={10} className="text-amber-500 fill-amber-500" />
                                            <span>{prod.rating || '4.8'}</span>
                                        </span>
                                    </div>

                                    {/* Unit Size */}
                                    <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                                        1 Unit • Standard Pack
                                    </p>

                                    {/* Title */}
                                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
                                        {prod.title}
                                    </h3>

                                    {/* Merchant / Seller Tag with Instagram-Style Blue Verified Badge */}
                                    <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1.5 truncate">
                                        <Store size={11} className={isOfficial ? "text-blue-600 dark:text-sky-400 shrink-0" : "text-sky-600 dark:text-sky-400 shrink-0"} />
                                        <span className="truncate">{merchantName}</span>
                                        <svg className="w-3.5 h-3.5 text-[#0095F6] shrink-0 inline-block" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" fill="#0095F6" />
                                            <path d="M8.5 12.5L10.8 14.8L15.5 9.8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        {prod.sub_category && prod.sub_category !== 'General' && (
                                            <>
                                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                                <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 truncate">{prod.sub_category}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Price and Action Section — Vertical Stack to Never Collapse on Mobile */}
                                <div className="mt-2.5 w-full pt-2 border-t border-slate-100 dark:border-white/5 space-y-1.5">
                                    {/* Price Line */}
                                    <div className="flex items-baseline justify-between gap-1">
                                        <div className="flex items-baseline gap-1.5 min-w-0 flex-wrap">
                                            <span className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white">
                                                ₹{pPrice.toLocaleString('en-IN')}
                                            </span>
                                            {pMrp > pPrice && (
                                                <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 line-through font-semibold">
                                                    ₹{pMrp.toLocaleString('en-IN')}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                                            Earn Coins
                                        </span>
                                    </div>

                                    {/* Full-width Action Stepper / ADD Button */}
                                    <div className="w-full relative z-10" onClick={(e) => e.stopPropagation()}>
                                        {qty > 0 ? (
                                            <div className="w-full flex items-center justify-between bg-blue-600 text-white rounded-xl h-8 px-1.5 shadow-sm shadow-blue-600/20">
                                                <motion.button
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={(e) => handleRemoveFromCart(prod, e)}
                                                    className="w-7 h-7 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors"
                                                >
                                                    <Minus size={13} strokeWidth={3} />
                                                </motion.button>
                                                <span className="text-xs font-black w-6 text-center">{qty}</span>
                                                <motion.button
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={(e) => handleAddToCart(prod, e)}
                                                    className="w-7 h-7 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors"
                                                >
                                                    <Plus size={13} strokeWidth={3} />
                                                </motion.button>
                                            </div>
                                        ) : (
                                            <motion.button
                                                whileTap={{ scale: 0.94 }}
                                                onClick={(e) => handleAddToCart(prod, e)}
                                                className="w-full h-8 rounded-xl bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 dark:bg-blue-500/15 dark:text-sky-400 dark:hover:bg-blue-600 dark:hover:text-white border-2 border-blue-600 dark:border-sky-500/50 text-xs font-black uppercase tracking-wider shadow-xs transition-all active:scale-95 flex items-center justify-center"
                                            >
                                                ADD
                                            </motion.button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Persistent Theme-Adaptive Floating Cart */}
            <FloatingCart
                count={totalCartItems}
                total={totalCartAmount * 100}
                savings={totalSavings * 100}
            />
        </div>
    );
}
