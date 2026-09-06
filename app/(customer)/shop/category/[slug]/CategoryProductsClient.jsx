'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { 
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
    Sun
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { useRouter, usePathname } from 'next/navigation';
import { getCategorySlug, getCategoryIcon, getCategoryImage, FALLBACK_CATEGORIES } from '@/lib/shopping/categories';
import { getSubCategories } from '@/lib/constants/categories';

export default function CategoryProductsClient({ initialProducts = [], categoryName = '', categories = [] }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth();

    const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', 'under_500', 'under_1500', 'discount_20', 'in_stock'
    const [selectedMerchantFilter, setSelectedMerchantFilter] = useState('all'); // 'all', 'official', 'local'
    const [selectedSubCategory, setSelectedSubCategory] = useState('all'); // 'all' or a valid sub-category name
    const [sortBy, setSortBy] = useState('popular'); // 'popular', 'price_asc', 'price_desc', 'rating'
    const [cartQuantities, setCartQuantities] = useState({}); // { [productId]: quantity }
    const [cartItemDetails, setCartItemDetails] = useState({}); // { [productId]: { price, mrp } }
    const [justAddedProduct, setJustAddedProduct] = useState(null);

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

    // Compute available sub-categories for the current category
    const availableSubCategories = useMemo(() => getSubCategories(categoryName), [categoryName]);

    const filteredAndSortedProducts = useMemo(() => {
        let list = [...initialProducts];

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
    }, [initialProducts, selectedFilter, selectedMerchantFilter, selectedSubCategory, sortBy]);

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
            router.push('/login');
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

    const activeSlug = pathname?.split('/').pop()?.toLowerCase() || '';

    // Compute dynamic categories for the left sibling rail
    const dynamicSiblingCategories = useMemo(() => {
        const base = (categories && categories.length > 0) ? categories : FALLBACK_CATEGORIES;
        return base.map(cat => {
            const slug = getCategorySlug(cat);
            const label = cat.name || cat.label || slug;
            const Icon = getCategoryIcon(label);
            const image = cat.image_url || getCategoryImage(cat);
            return { slug, label, icon: Icon, image };
        });
    }, [categories]);

    return (
        <div className="space-y-4">
            {/* Express Delivery Promise Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/25 text-sky-900 dark:text-sky-200">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
                    <Zap size={15} className="text-sky-600 dark:text-sky-400 fill-sky-500" />
                    <span>⚡ Express Delivery • Live Order Tracking</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-sky-800 dark:text-sky-300">
                    <ShieldCheck size={14} className="text-sky-600 dark:text-sky-400" />
                    <span>100% InTrust Buyer Guarantee • Verified Stores</span>
                </div>
            </div>

            {/* ====== BLINKIT 2-COLUMN RAIL LAYOUT ====== */}
            <div className="flex gap-3 sm:gap-6 items-start">
                
                {/* ── Left Category Rail (Blinkit Style) ── */}
                <aside className="w-[84px] sm:w-[110px] md:w-[140px] shrink-0 sticky top-[80px] self-start bg-white dark:bg-[#0c0e16] rounded-3xl p-1.5 sm:p-2 border border-slate-200/90 dark:border-white/[0.08] shadow-xs flex flex-col gap-1.5 z-20">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 pt-1.5 pb-1 hidden sm:block">
                        Categories
                    </div>

                    {dynamicSiblingCategories.map((cat) => {
                        const isCurrent = activeSlug === cat.slug || categoryName.toLowerCase().includes(cat.slug);
                        const Icon = cat.icon;
                        return (
                            <Link
                                key={cat.slug}
                                href={`/shop/category/${cat.slug}`}
                                className={`flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl text-center transition-all group relative ${
                                    isCurrent
                                        ? 'bg-sky-50 dark:bg-sky-500/15 text-sky-900 dark:text-sky-200 border border-sky-500/30 shadow-xs'
                                        : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'
                                }`}
                            >
                                {isCurrent && (
                                    <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-7 rounded-r-full bg-sky-600 dark:bg-sky-400 shadow-sm" />
                                )}
                                <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl overflow-hidden flex items-center justify-center mb-1 transition-transform group-hover:scale-105 p-0.5 relative shadow-xs ${
                                    isCurrent ? 'bg-gradient-to-tr from-blue-600 to-sky-500 text-white shadow-sm' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300'
                                }`}>
                                    {cat.image ? (
                                        <img 
                                            src={cat.image} 
                                            alt={cat.label} 
                                            className="w-full h-full object-cover rounded-lg"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                                const fallback = e.currentTarget.nextSibling;
                                                if (fallback) fallback.style.display = 'flex';
                                            }}
                                        />
                                    ) : null}
                                    <div 
                                        className="w-full h-full items-center justify-center"
                                        style={{ display: cat.image ? 'none' : 'flex' }}
                                    >
                                        <Icon size={18} />
                                    </div>
                                </div>
                                <span className={`text-[10px] sm:text-[11px] leading-tight line-clamp-2 ${isCurrent ? 'font-black text-sky-900 dark:text-sky-200' : 'font-bold'}`}>
                                    {cat.label}
                                </span>
                            </Link>
                        );
                    })}
                </aside>

                {/* ── Right Content: Filters & Product Grid ── */}
                <div className="flex-1 min-w-0 space-y-3.5">
                    
                    {/* Filter, Merchant Switcher & Sort Toolbar */}
                    <div className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-[#0c0e16] border border-slate-200/90 dark:border-white/[0.08] shadow-xs space-y-3">
                        {/* Store Mode Filter */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-white/5 pb-2.5">
                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                                <span className="text-xs font-black uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                                    <Store size={13} />
                                    Store:
                                </span>
                                {[
                                    { id: 'all', label: 'All Stores' },
                                    { id: 'official', label: 'InTrust Official' },
                                    { id: 'local', label: 'Local Bhopal Stores' }
                                ].map((m) => {
                                    const active = selectedMerchantFilter === m.id;
                                    return (
                                        <button
                                            key={m.id}
                                            onClick={() => setSelectedMerchantFilter(m.id)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                                active
                                                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs'
                                                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                                            }`}
                                        >
                                            {m.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Sort Dropdown */}
                            <div className="flex items-center gap-1.5 shrink-0">
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

                        {/* Price & Stock Filter Pills */}
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
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
                                                ? 'bg-blue-600 text-white shadow-xs font-black'
                                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Sub-Category Filter Pills — shown only when sub-categories exist for this category */}
                        {availableSubCategories.length > 0 && (
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-t border-slate-100 dark:border-white/5 pt-2.5">
                                <button
                                    key="sub-all"
                                    onClick={() => setSelectedSubCategory('all')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                        selectedSubCategory === 'all'
                                            ? 'bg-violet-600 text-white shadow-xs font-black'
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
                                            onClick={() => setSelectedSubCategory(sub)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                                active
                                                    ? 'bg-violet-600 text-white shadow-xs font-black'
                                                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
                                            }`}
                                        >
                                            {sub}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Products Grid — Blinkit Style */}
                    {filteredAndSortedProducts.length === 0 ? (
                        <div className="p-12 rounded-3xl bg-white dark:bg-[#0c0e16] border border-slate-200/90 dark:border-white/[0.08] text-center space-y-3">
                            <Package size={40} className="mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                            <h3 className="text-base font-black text-slate-800 dark:text-white">No products match your filter</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Try resetting filters to explore the full catalog.</p>
                            <button
                                onClick={() => { setSelectedFilter('all'); setSelectedMerchantFilter('all'); setSelectedSubCategory('all'); }}
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

                                return (
                                    <div
                                        key={prod.id}
                                        onClick={() => router.push(`/shop/product/${prod.slug || prod.id}`)}
                                        className="group relative bg-white dark:bg-[#0c0e16] hover:bg-slate-50 dark:hover:bg-white/[0.02] rounded-3xl p-2.5 sm:p-3.5 border border-slate-200/90 dark:border-white/[0.08] hover:border-sky-500/40 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer"
                                    >
                                        <div>
                                            {/* Product Image & Badges */}
                                            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900 mb-2.5 flex items-center justify-center p-2.5 border border-slate-100 dark:border-white/5">
                                                <img
                                                    src={prod.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80'}
                                                    alt={prod.title}
                                                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                                    loading="lazy"
                                                />

                                                {/* Delivery Badge */}
                                                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-white/95 dark:bg-slate-900/95 text-sky-800 dark:text-sky-300 text-[10px] font-black tracking-tight flex items-center gap-1 shadow-xs border border-sky-500/25">
                                                    <Zap size={10} className="text-sky-600 dark:text-sky-400 fill-sky-500" />
                                                    <span>EXPRESS</span>
                                                </span>

                                                {/* Discount Badge */}
                                                {discount > 0 && (
                                                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-blue-600 text-white text-[10px] font-black uppercase shadow-xs">
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

                                            {/* Merchant / Seller Tag */}
                                            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1.5 truncate">
                                                <Store size={11} className={isOfficial ? "text-blue-600 dark:text-sky-400 shrink-0" : "text-sky-600 dark:text-sky-400 shrink-0"} />
                                                <span className="truncate">{merchantName}</span>
                                            </div>
                                        </div>

                                        {/* Price and Blinkit ADD Button */}
                                        <div className="pt-2.5 mt-2.5 border-t border-slate-100 dark:border-white/5 flex items-end justify-between gap-1.5">
                                            <div className="flex flex-col">
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                                                        ₹{pPrice.toLocaleString('en-IN')}
                                                    </span>
                                                    {pMrp > pPrice && (
                                                        <span className="text-[11px] text-slate-400 dark:text-slate-500 line-through font-semibold">
                                                            ₹{pMrp.toLocaleString('en-IN')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                                                {qty > 0 ? (
                                                    <div className="flex items-center bg-blue-600 text-white rounded-xl h-8 px-1 shadow-sm">
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
                                                        whileTap={{ scale: 0.92 }}
                                                        onClick={(e) => handleAddToCart(prod, e)}
                                                        className="h-8 px-3.5 rounded-xl bg-sky-50 hover:bg-blue-600 hover:text-white text-blue-700 dark:bg-sky-500/15 dark:text-sky-300 dark:hover:bg-blue-600 dark:hover:text-white border-2 border-blue-600 dark:border-sky-500/40 text-xs font-black uppercase tracking-wider shadow-xs transition-all active:scale-95 flex items-center justify-center"
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
                </div>
            </div>

            {/* Persistent Blinkit Quick-Checkout Floating Bar with Count Animations */}
            <AnimatePresence>
                {totalCartItems > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.95 }}
                        className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-[420px] z-50 p-4 rounded-3xl bg-gradient-to-r from-blue-700 via-sky-700 to-indigo-700 text-white shadow-2xl border border-sky-400/30 flex items-center justify-between gap-4 backdrop-blur-xl"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <motion.div 
                                key={totalCartItems}
                                initial={{ scale: 1.4, rotate: -10 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 450, damping: 18 }}
                                className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner"
                            >
                                <ShoppingBag size={22} className="text-white" />
                            </motion.div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <motion.span 
                                        key={totalCartItems}
                                        initial={{ scale: 1.3 }}
                                        animate={{ scale: 1 }}
                                        className="text-sm font-black tracking-tight"
                                    >
                                        {totalCartItems} {totalCartItems === 1 ? 'ITEM' : 'ITEMS'}
                                    </motion.span>
                                    <span className="text-xs opacity-75">•</span>
                                    <span className="text-sm font-black">₹{totalCartAmount.toLocaleString('en-IN')}</span>
                                </div>
                                <p className="text-[11px] text-sky-100 font-bold flex items-center gap-1 truncate">
                                    {totalSavings > 0 ? (
                                        <>
                                            <Zap size={12} className="fill-sky-300 text-sky-300 shrink-0" />
                                            <span>Saved ₹{totalSavings.toLocaleString('en-IN')} • Express Delivery</span>
                                        </>
                                    ) : (
                                        <>
                                            <Zap size={12} className="fill-sky-300 text-sky-300 shrink-0" />
                                            <span className="truncate">⚡ Express Dispatch • Live Order Tracking</span>
                                        </>
                                    )}
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
        </div>
    );
}
