'use client';

import { useState, useEffect, useMemo, useCallback, useRef, useTransition } from 'react';
import { Search, ArrowLeft, Loader2, ShoppingCart, Package, ChevronRight, BadgeCheck, Sparkles, SlidersHorizontal, Grid3X3, Heart, Zap, Shirt, Pill, Home, Utensils, Grid, Star, MapPin, Store, Plus, Minus, X, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import ProductCardV2 from './ProductCardV2';
import FloatingCart from './FloatingCart';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCardSkeleton from '@/components/customer/shop/ProductCardSkeleton';
import MerchantProfileCard from '@/components/customer/shop/MerchantProfileCard';
import Image from 'next/image';
import { isStorefrontItemOOS } from '@/lib/shopping/stock';
import { isValidUUID } from '@/lib/utils';
import React, { Suspense } from 'react';
import FilterSidebar from '@/components/shop/FilterSidebar';
import MobileFilterDrawer from '@/components/shop/MobileFilterDrawer';
import ProductToolbar from '@/components/shop/filters/ProductToolbar';
import Pagination from '@/components/ui/Pagination';
import { STOREFRONT_FILTERS, PRICE_RANGES } from '@/lib/shop/filterTypes';

import CustomerBreadcrumbs from '@/components/common/CustomerBreadcrumbs';
import { getSubCategories } from '@/lib/constants/categories';

const PAGE_SIZE = 24;

// Lazy load below-fold and modal components
const FlashSale = React.lazy(() => import('@/components/customer/shop/FlashSale'));
const ConfirmModal = React.lazy(() => import('@/components/ui/ConfirmModal'));

export default function StorefrontV2Client({ merchant, initialInventory, initialTotalCount, customer, categories, initialFilters = {}, currentPage = 1 }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

    const { theme } = useTheme();
    const { user: authUser, profile: authProfile } = useAuth();
    const activeCustomer = authProfile || customer;
    const isDark = theme === 'dark';
    const [cart, setCart] = useState([]);
    const [wishlistIds, setWishlistIds] = useState(new Set());
    const [isLoading, setIsLoading] = useState(true);

    // Single source of truth from URL searchParams
    const activeCategory = searchParams.get('category') || initialFilters.category || 'All';
    const selectedSubCategory = searchParams.get('sub_category') || initialFilters.sub_category || 'All';
    const currentSearch = searchParams.get('search') || '';
    const [searchInput, setSearchInput] = useState(currentSearch || initialFilters.search || '');
    const currentPageNum = Math.max(1, parseInt(searchParams.get('page') || currentPage?.toString() || '1', 10));

    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [pendingCartItem, setPendingCartItem] = useState(null);
    const [selectedProductItem, setSelectedProductItem] = useState(null);
    const [liveMerchant, setLiveMerchant] = useState(merchant);
    const [liveInventory, setLiveInventory] = useState(initialInventory);
    const [totalCount, setTotalCount] = useState(initialTotalCount ?? 0);
    const [page, setPage] = useState(currentPageNum);
    const debounceRef = useRef(null);

    // Synchronize inventory, total count and page when server props or URL page change
    useEffect(() => {
        setLiveInventory(initialInventory);
        setTotalCount(initialTotalCount ?? 0);
        setPage(currentPageNum);
    }, [initialInventory, initialTotalCount, currentPageNum]);

    // Keep searchInput in sync when URL changes (e.g. back/forward navigation or clearing filters)
    useEffect(() => {
        setSearchInput(searchParams.get('search') || '');
    }, [searchParams]);

    // Open-at-top fix: scrolls to top on mount and whenever merchant slug changes
    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, [liveMerchant?.slug]);

    // Supabase client — memoized to avoid creating a new instance on every render
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        setLiveMerchant(merchant);
    }, [merchant]);

    // Construct active filter chips list for ProductToolbar (excluding category to prevent navbar duplication)
    const activeFiltersList = useMemo(() => {
        const list = [];
        const subCat = searchParams.get('sub_category');
        if (subCat && subCat !== 'All') {
            list.push({ type: 'sub_category', value: subCat, label: subCat });
        }
        const brand = searchParams.get('brand');
        if (brand) {
            const opt = STOREFRONT_FILTERS.find(f => f.id === 'brand')?.options?.find(o => o.value.toLowerCase() === brand.toLowerCase());
            list.push({ type: 'brand', value: brand, label: opt?.label || brand });
        }
        const size = searchParams.get('size');
        if (size) {
            list.push({ type: 'size', value: size, label: size });
        }
        const color = searchParams.get('color');
        if (color) {
            const opt = STOREFRONT_FILTERS.find(f => f.id === 'color')?.options?.find(o => o.value.toLowerCase() === color.toLowerCase());
            list.push({ type: 'color', value: color, label: opt?.label || color });
        }
        const minP = searchParams.get('min_price');
        const maxP = searchParams.get('max_price');
        if (minP || maxP) {
            const matchedRange = PRICE_RANGES.find(r => 
                (r.min != null ? r.min.toString() : '') === (minP || '') &&
                (r.max != null ? r.max.toString() : '') === (maxP || '')
            );
            const minRupees = minP ? Math.round(Number(minP) / 100) : null;
            const maxRupees = maxP ? Math.round(Number(maxP) / 100) : null;
            let priceLabel = matchedRange?.label;
            if (!priceLabel) {
                if (minRupees && maxRupees) priceLabel = `₹${minRupees} - ₹${maxRupees}`;
                else if (minRupees) priceLabel = `> ₹${minRupees}`;
                else if (maxRupees) priceLabel = `< ₹${maxRupees}`;
                else priceLabel = 'Price';
            }
            list.push({ type: 'price', value: `${minP}-${maxP}`, label: priceLabel });
        }
        const searchVal = searchParams.get('search');
        if (searchVal) {
            list.push({ type: 'search', value: searchVal, label: `"${searchVal}"` });
        }
        return list;
    }, [searchParams]);

    const hasSecondaryFilters = useMemo(() => {
        return Boolean(
            (searchParams.get('sub_category') && searchParams.get('sub_category') !== 'All') ||
            searchParams.get('min_price') ||
            searchParams.get('max_price') ||
            searchParams.get('brand') ||
            searchParams.get('size') ||
            searchParams.get('color')
        );
    }, [searchParams]);

    // Handle filter changes: updates URL and always resets to page 1
    const handleFilterChange = useCallback((newParams) => {
        startTransition(() => {
            router.push(`${pathname}?${newParams.toString()}`, { scroll: false });
        });
    }, [pathname, router]);

    // Handle individual filter removal
    const handleRemoveFilter = useCallback((filter) => {
        startTransition(() => {
            const params = new URLSearchParams(searchParams);
            if (filter.type === 'price') {
                params.delete('min_price');
                params.delete('max_price');
            } else if (filter.type === 'category') {
                params.delete('category');
                params.delete('sub_category');
            } else {
                params.delete(filter.type);
            }
            params.set('page', '1');
            router.push(`${pathname}?${params.toString()}`, { scroll: false });
        });
    }, [searchParams, pathname, router]);

    // Clear secondary filters while preserving active category from navbar
    const handleClearSecondaryFilters = useCallback(() => {
        startTransition(() => {
            const params = new URLSearchParams(searchParams);
            params.delete('sub_category');
            params.delete('min_price');
            params.delete('max_price');
            params.delete('brand');
            params.delete('size');
            params.delete('color');
            params.set('page', '1');
            router.push(`${pathname}?${params.toString()}`, { scroll: false });
        });
    }, [searchParams, pathname, router]);

    // Clear all filters completely
    const handleClearAllFilters = useCallback(() => {
        startTransition(() => {
            const params = new URLSearchParams();
            params.set('page', '1');
            router.push(`${pathname}?${params.toString()}`, { scroll: false });
        });
    }, [pathname, router]);

    // Page navigation handler
    const handlePageChange = useCallback((newPage) => {
        startTransition(() => {
            const params = new URLSearchParams(searchParams);
            params.set('page', newPage.toString());
            router.push(`${pathname}?${params.toString()}`, { scroll: false });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }, [searchParams, pathname, router]);

    // Category change from sticky header pills (resets sub_category and page to 1)
    const handleCategoryChange = useCallback((cat) => {
        startTransition(() => {
            const params = new URLSearchParams(searchParams);
            if (!cat || cat === 'All' || activeCategory.toLowerCase() === cat.toLowerCase()) {
                params.delete('category');
            } else {
                params.set('category', cat);
            }
            params.delete('sub_category');
            params.set('page', '1');
            router.push(`${pathname}?${params.toString()}`, { scroll: false });
        });
    }, [searchParams, activeCategory, pathname, router]);

    // Debounce search input — 300ms prevents spamming router on every keystroke
    const handleSearchChange = useCallback((e) => {
        const val = e.target.value;
        setSearchInput(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            startTransition(() => {
                const params = new URLSearchParams(searchParams);
                if (val.trim()) {
                    params.set('search', val.trim());
                } else {
                    params.delete('search');
                }
                params.set('page', '1');
                router.push(`${pathname}?${params.toString()}`, { scroll: false });
            });
        }, 300);
    }, [searchParams, pathname, router]);


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

    // Stable key derived from visible product IDs — changes when the user
    // navigates to a new page even if the item count stays at PAGE_SIZE.
    const productIdsKey = useMemo(
        () => Array.from(new Set(liveInventory.map(i => i.product_id))).sort().join(','),
        [liveInventory]
    );

    useEffect(() => {
        if (!liveInventory || liveInventory.length === 0) return;

        const productIds = Array.from(new Set(liveInventory.map(i => i.product_id)));

        // Include a slice of productIdsKey in the channel name so each unique
        // page gets its own channel, forcing a clean teardown/re-subscribe.
        const syncChannel = supabase
            .channel(`realtime_stock_sync_${liveMerchant.id}_${productIdsKey.slice(0, 16)}`)
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'shopping_products', 
                filter: `id=in.(${productIds.join(',')})` 
            }, (payload) => {
                if (payload.new) {
                    setLiveInventory(prev => prev.map(item => 
                        item.product_id === payload.new.id 
                            ? { ...item, shopping_products: { ...item.shopping_products, admin_stock: payload.new.admin_stock } }
                            : item
                    ));
                }
            });

        // Only subscribe to merchant_inventory changes for real merchant UUIDs.
        // For the official store, liveMerchant.id is the string 'official' which
        // Supabase Realtime rejects as an invalid UUID filter.
        if (isValidUUID(liveMerchant.id)) {
            syncChannel.on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'merchant_inventory', 
                filter: `merchant_id=eq.${liveMerchant.id}` 
            }, (payload) => {
                if (payload.new) {
                    setLiveInventory(prev => prev.map(item => 
                        item.id === payload.new.id 
                            ? { ...item, stock_quantity: payload.new.stock_quantity, is_active: payload.new.is_active }
                            : item
                    ));
                }
            });
        }

        syncChannel.subscribe();

        return () => {
            supabase.removeChannel(syncChannel);
        };
    }, [liveMerchant?.id, productIdsKey]);

    const isStoreOpen = useMemo(() => {
        return !!liveMerchant.is_open;
    }, [liveMerchant.is_open]);

    // Preserve User's core sync logic
    useEffect(() => {
        if (activeCustomer?.id) {
            Promise.all([syncCartFromDB(), syncWishlistFromDB()]).finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, [activeCustomer?.id]);

    const syncWishlistFromDB = async () => {
        const { data } = await supabase
            .from('user_wishlists')
            .select('product_id')
            .eq('user_id', activeCustomer.id);
        if (data) setWishlistIds(new Set(data.map(r => r.product_id)));
    };

    const toggleWishlist = useCallback(async (item) => {
        if (!activeCustomer?.id) {
            toast.error('Please login to save items');
            const returnUrl = typeof window !== 'undefined' ? window.location.pathname : `/shop/${merchant?.slug}`;
            router.push(`/login?next=${encodeURIComponent(returnUrl)}`);
            return;
        }
        const productId = item.product_id;
        const alreadySaved = wishlistIds.has(productId);

        if (alreadySaved) {
            const { error } = await supabase
                .from('user_wishlists')
                .delete()
                .eq('user_id', activeCustomer.id)
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
                user_id: activeCustomer.id,
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
    }, [activeCustomer?.id, wishlistIds, supabase, router]);

    const syncCartFromDB = async () => {
        const { data } = await supabase
            .from('shopping_cart')
            .select('*')
            .eq('customer_id', activeCustomer.id);

        if (data) {
            const mappedCart = data.map(item => {
                const inventoryItem = liveInventory.find(i =>
                    item.is_platform_item ? (i.product_id === item.product_id && i.is_platform_direct) : (i.id === item.inventory_id)
                );
                return { ...inventoryItem, quantity: item.quantity, cart_row_id: item.id };
            }).filter(i => i.id);
            setCart(mappedCart);
        }
    };

    const addToCart = useCallback(async (item) => {
        if (isStorefrontItemOOS(item)) {
            toast.error('This item is currently out of stock');
            return;
        }
        if (!isStoreOpen) {
            toast.error("Store is currently closed and not accepting orders.");
            return;
        }
        if (!activeCustomer?.id) {
            toast.error('Please login to add to cart');
            const returnUrl = typeof window !== 'undefined' ? window.location.pathname : `/shop/${merchant?.slug}`;
            router.push(`/login?next=${encodeURIComponent(returnUrl)}`);
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
                p_customer_id: activeCustomer.id,
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
    }, [activeCustomer?.id, supabase, router, isStoreOpen]);

    const handleConfirmClearCart = async () => {
        if (!pendingCartItem) return;
        setConfirmModalOpen(false);
        try {
            await supabase.from('shopping_cart').delete().eq('customer_id', activeCustomer.id);
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
        return categories || ['All'];
    }, [categories]);

    const availableSubCategories = useMemo(() => {
        if (!activeCategory || activeCategory === 'All') return [];
        const canonical = getSubCategories(activeCategory);
        const dynamicSet = new Set(canonical);
        liveInventory?.forEach(item => {
            const sub = item.sub_category || item.shopping_products?.sub_category;
            if (sub && sub !== 'General') dynamicSet.add(sub);
        });
        return Array.from(dynamicSet);
    }, [activeCategory, liveInventory]);


    const getCategoryIcon = useCallback((category) => {
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
    }, []);
    const filteredItems = liveInventory;

    const totalItems = cart.reduce((acc, item) => acc + (item.quantity || 0), 0);
    const totalPrice = cart.reduce((acc, item) => {
        let pricePaise = item.retail_price_paise;
        if (pricePaise == null || pricePaise === 0) {
            const rupeePrice = Number(item.sale_price || item.price || item.selling_price || 0);
            if (rupeePrice > 0) {
                pricePaise = rupeePrice * 100;
            } else {
                pricePaise = item.shopping_products?.platform_price_paise || item.shopping_products?.suggested_retail_price_paise || 0;
            }
        }
        return acc + (Number(pricePaise || 0) * (item.quantity || 0));
    }, 0);

    const totalMrp = cart.reduce((acc, item) => {
        const itemMrp = item.shopping_products?.mrp_paise || 
            item.shopping_products?.suggested_retail_price_paise || 
            item.retail_price_paise || 
            (Number(item.mrp || 0) * 100) || 
            0;
        return acc + (Number(itemMrp || 0) * (item.quantity || 0));
    }, 0);

    const totalSavings = totalMrp - totalPrice;

    const primaryColor = '#2563EB'; // Royal Blue (InTrust Brand Blue)
    const secondaryColor = '#3b82f6'; // Blue-500
    const avatarUrl = merchant?.user_profiles?.avatar_url || (Array.isArray(merchant?.user_profiles) ? merchant?.user_profiles[0]?.avatar_url : null);


    return (
        <div className={`relative min-h-screen flex flex-col transition-colors duration-700`}>

            {/* ====== CREATIVE AMBIENT BACKGROUND ====== */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className={`absolute inset-0 ${isDark ? 'bg-[#080a10]' : 'bg-[#f7f8fa]'}`} />
            </div>

            {/* ====== STICKY HEADER — FROSTED GLASS ====== */}
            <div className="sticky top-[76px] md:top-[92px] z-30 px-2 sm:px-4 md:px-6 max-w-7xl mx-auto w-full mb-4 pointer-events-none">
                <header
                    className={`pointer-events-auto md:backdrop-blur-xl rounded-2xl md:rounded-[2rem] border transition-all overflow-hidden flex flex-col ${
                        isDark 
                            ? 'bg-[#0c0e16]/95 md:bg-[#080a10]/90 border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.4)]' 
                            : 'bg-white/95 md:bg-white/95 border-slate-200/90 shadow-md'
                    }`}
                >
                    {/* Top Row */}
                    <div className="flex items-center gap-3 px-3.5 py-2.5 md:px-5 md:py-3">
                        <button
                            onClick={() => router.push('/shop')}
                            aria-label="Back to shops"
                            className={`w-10 h-10 flex items-center justify-center rounded-xl shrink-0 transition-all ${
                                isDark 
                                    ? 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/10' 
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80 shadow-xs'
                            }`}
                        >
                            <ArrowLeft size={18} strokeWidth={2.5} />
                        </button>

                        {/* Search - Desktop AND Mobile inline for sticky bar */}
                        <div className="flex-1 w-full relative">
                            <Search size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40' : 'text-slate-400'}`} />
                            <input
                                type="text"
                                placeholder={`Search in ${merchant?.business_name || 'store'}...`}
                                value={searchInput}
                                onChange={handleSearchChange}
                                className={`w-full pl-9 sm:pl-10 pr-4 py-2 md:py-2.5 rounded-full text-xs sm:text-sm font-semibold outline-none transition-all border ${
                                    isDark 
                                        ? 'bg-[#0a0c14]/60 text-white placeholder:text-white/35 border-white/[0.08] focus:bg-[#0a0c14] focus:border-sky-500/50' 
                                        : 'bg-slate-100/90 text-slate-900 placeholder:text-slate-500 border-slate-200/80 hover:bg-slate-100 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 shadow-xs'
                                    }`}
                            />
                        </div>

                        {/* Mobile Filters button in sticky bar */}
                        <button
                            type="button"
                            onClick={() => setIsMobileFiltersOpen(true)}
                            aria-label="Open filter drawer"
                            className={`lg:hidden relative w-10 h-10 flex items-center justify-center rounded-xl shrink-0 transition-all ${
                                isDark 
                                    ? 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/10' 
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80 shadow-xs'
                            }`}
                        >
                            <SlidersHorizontal size={18} className="text-sky-500" />
                            {hasSecondaryFilters && (
                                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-sky-500 ring-2 ring-white dark:ring-[#0c0e16]" />
                            )}
                        </button>
                    </div>

                    {/* Animated Category Pills */}
                    {merchantCategories.length > 1 && (
                        <div className={`relative flex items-center gap-2 px-3.5 md:px-5 py-2 overflow-x-auto no-scrollbar border-t ${isDark ? 'border-white/[0.05]' : 'border-slate-100'}`}>
                            {merchantCategories.map(sub => {
                                const isActive = activeCategory === sub;
                                return (
                                    <button
                                        key={sub}
                                        onClick={() => handleCategoryChange(sub)}
                                        className={`relative px-3.5 py-1.5 flex items-center gap-1.5 rounded-full text-xs font-bold whitespace-nowrap outline-none transition-all ${
                                            isActive 
                                                ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-sm shadow-sky-500/30 border border-sky-400 font-black' 
                                                : isDark 
                                                    ? 'bg-white/5 hover:bg-sky-950/40 hover:text-sky-300 text-slate-300 border border-white/10' 
                                                    : 'bg-sky-50/70 hover:bg-sky-100 text-slate-700 hover:text-sky-900 border border-sky-100'
                                        }`}
                                    >
                                        <span>{getCategoryIcon(sub)}</span>
                                        <span>{sub}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </header>
            </div>

            {/* MAIN CONTENT AREA */}
            <main className="w-full px-2 sm:px-4 md:px-6 flex-1 py-3 md:py-5 relative z-10">
                {/* pb-36 on mobile gives clearance below last card for floating cart and bottom nav */}
                <div className="max-w-7xl mx-auto pb-36 md:pb-8 space-y-4">
                    
                    {/* Standardized Customer Breadcrumbs */}
                    <div className="px-1">
                        <CustomerBreadcrumbs 
                            items={[
                                { label: 'Shop', href: '/shop' },
                                { label: (liveMerchant?.id === 'official' || liveMerchant?.slug === 'intrust-official' || liveMerchant?.slug === 'official') ? 'InTrust Official' : (liveMerchant?.business_name || 'Store') }
                            ]}
                        />
                    </div>

                    {/* MERCHANT PROFILE HEADER */}
                    <MerchantProfileCard 
                        merchant={liveMerchant} 
                        totalItems={totalCount} 
                        isStoreOpen={isStoreOpen}
                    />

                    {/* FLASH SALE */}
                    {(liveMerchant?.id === 'official' || liveMerchant?.slug === 'intrust-official' || liveMerchant?.slug === 'official') && (
                        <Suspense fallback={<div className="w-full h-[200px] bg-slate-100 dark:bg-white/5 rounded-2xl animate-pulse mb-6" />}>
                            <FlashSale
                                cart={cart}
                                onAdd={addToCart}
                                onRemove={removeFromCart}
                                isStoreOpen={isStoreOpen}
                                primaryColor={primaryColor}
                                secondaryColor={secondaryColor}
                            />
                        </Suspense>
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
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start mt-4">
                        {/* Desktop Filter Sidebar */}
                        <aside className="hidden lg:block lg:col-span-1 sticky top-36">
                            <FilterSidebar
                                onFilterChange={handleFilterChange}
                                showHeader={true}
                            />
                        </aside>

                        {/* Storefront Products & Controls */}
                        <div className="col-span-1 lg:col-span-3 space-y-4">
                            <ProductToolbar
                                resultsCount={totalCount}
                                onOpenMobileFilters={() => setIsMobileFiltersOpen(true)}
                                activeFilters={activeFiltersList}
                                onRemoveFilter={handleRemoveFilter}
                                onClearAll={handleClearSecondaryFilters}
                            />

                            {isPending ? (
                                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-3 sm:gap-4">
                                    {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                                        <ProductCardSkeleton key={`psk-${i}`} />
                                    ))}
                                </div>
                            ) : filteredItems.length === 0 ? (
                                <div className={`py-16 text-center rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-xs'}`}>
                                    <Package className={isDark ? 'text-white/10 mx-auto mb-3' : 'text-slate-300 mx-auto mb-3'} size={44} />
                                    <h3 className={`text-base font-black uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-slate-600'}`}>No products available</h3>
                                    <p className={`text-xs mt-1 font-medium ${isDark ? 'text-white/30' : 'text-slate-400'}`}>Try adjusting your filters or search terms</p>
                                    {activeFiltersList.length > 0 && (
                                        <button
                                            onClick={handleClearAllFilters}
                                            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white transition-all shadow-sm"
                                        >
                                            Clear All Filters
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-3 sm:gap-4">
                                        {filteredItems.map(item => (
                                            <ProductCardV2
                                                key={item.id}
                                                item={item}
                                                cartItem={cart.find(i => i.id === item.id)}
                                                onAdd={() => addToCart(item)}
                                                onRemove={() => removeFromCart(item)}
                                                onSelect={() => setSelectedProductItem(item)}
                                                primaryColor={primaryColor}
                                                secondaryColor={secondaryColor}
                                                isWishlisted={wishlistIds.has(item.product_id)}
                                                onWishlist={() => toggleWishlist(item)}
                                                isStoreOpen={isStoreOpen}
                                            />
                                        ))}
                                    </div>

                                    {/* Server-Side Pagination */}
                                    <div className="pt-6 pb-2">
                                        <Pagination
                                            totalCount={totalCount}
                                            pageSize={PAGE_SIZE}
                                            currentPage={page}
                                            onPageChange={handlePageChange}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* FLOATING CART */}
            {totalItems > 0 && isStoreOpen && (
                <FloatingCart
                    count={totalItems}
                    total={totalPrice}
                    savings={totalSavings}
                    items={cart}
                    customer={activeCustomer}
                    onClear={() => setCart([])}
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                    merchant={liveMerchant}
                />
            )}

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

            {/* PRODUCT DETAIL MODAL (BLINKIT STYLE BOTTOM SHEET) */}
            <AnimatePresence>
                {selectedProductItem && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedProductItem(null)}
                            className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 z-[100] backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 250, mass: 0.8 }}
                            className={`fixed bottom-0 left-0 right-0 z-[110] rounded-t-[2rem] max-h-[85vh] flex flex-col shadow-2xl ${isDark ? 'bg-[#0f111a]' : 'bg-white'}`}
                        >
                            {/* Drag handle */}
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full z-20" />
                            
                            <button onClick={() => setSelectedProductItem(null)} className={`absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center z-20 shadow-md ${isDark ? 'bg-black/50 text-white backdrop-blur-md' : 'bg-white/80 text-slate-700 backdrop-blur-md border border-slate-100'}`}>
                                <X size={18} />
                            </button>

                            {/* Modal Content - Scrollable */}
                            <div className="overflow-y-auto w-full no-scrollbar">
                                {(() => {
                                    const pItem = selectedProductItem;
                                    const pProduct = pItem.shopping_products;
                                    const pOos = isStorefrontItemOOS(pItem);
                                    const pCartItem = cart.find(i => i.id === pItem.id);
                                    const pMrp = (pProduct.mrp_paise || pProduct.suggested_retail_price_paise || pItem.retail_price_paise || 0) / 100;
                                    const pSellingPrice = pItem.is_platform_product
                                        ? ((pProduct?.platform_price_paise ?? pProduct?.suggested_retail_price_paise) || pItem.retail_price_paise || 0) / 100
                                        : (pItem.retail_price_paise || 0) / 100;
                                    const pSavings = pMrp > pSellingPrice ? pMrp - pSellingPrice : 0;
                                    const discountPct = pMrp > 0 ? Math.round((pSavings / pMrp) * 100) : 0;
                                    
                                    return (
                                        <div className="flex flex-col md:flex-row w-full max-w-5xl mx-auto md:p-6 md:gap-8">
                                            
                                            {/* Image Area - Edge to edge on mobile, rounded on desktop */}
                                            <div className={`relative w-full aspect-square md:w-1/2 md:rounded-3xl flex items-center justify-center shrink-0 ${isDark ? 'bg-[#151822]' : 'bg-[#f4f6f9]'}`}>
                                                {pProduct.product_images?.[0] ? (
                                                    <Image
                                                        src={pProduct.product_images[0]}
                                                        alt={pProduct.title}
                                                        fill
                                                        sizes="(max-width: 768px) 100vw, 50vw"
                                                        className="object-contain p-8 md:p-12 mix-blend-multiply dark:mix-blend-normal"
                                                    />
                                                ) : (
                                                    <Package size={80} className={isDark ? 'text-white/10' : 'text-slate-200'} />
                                                )}
                                                {discountPct > 0 && (
                                                    <div className="absolute bottom-4 left-4 bg-blue-600 text-white text-xs font-black px-3 py-1.5 rounded-lg shadow-lg uppercase tracking-widest flex items-center gap-1">
                                                        <Zap size={12} className="fill-white" /> {discountPct}% OFF
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Details Area */}
                                            <div className="flex-1 flex flex-col p-5 sm:p-6 md:p-0 md:py-4">
                                                <h2 className={`text-[22px] md:text-3xl font-black leading-tight tracking-tight mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                    {pItem.custom_title || pProduct.title}
                                                </h2>
                                                
                                                <div className={`text-sm font-bold mt-1 mb-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    {pProduct.category || 'General'} • 1 Unit
                                                </div>

                                                {/* Delivery Badge */}
                                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl self-start mb-6 ${isDark ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-300' : 'bg-indigo-50 border border-indigo-100 text-indigo-600'}`}>
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                                                        <Clock size={12} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                                                    </div>
                                                    <span className="text-[13px] font-bold">Standard Delivery</span>
                                                </div>
                                                
                                                {/* Product Info / Description */}
                                                <div className="mb-8">
                                                    <h4 className={`text-sm font-black uppercase tracking-widest mb-3 ${isDark ? 'text-slate-300' : 'text-slate-900'}`}>Product Details</h4>
                                                    <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                        {pProduct.description || 'Premium quality product delivered directly to your doorstep. Guaranteed freshness and authenticity.'}
                                                    </p>
                                                </div>

                                                {/* Features */}
                                                <div className="grid grid-cols-2 gap-3 mb-8">
                                                    <div className={`flex items-center gap-2 p-3 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'}`}>
                                                        <BadgeCheck size={18} className="text-blue-500" />
                                                        <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>100% Genuine</span>
                                                    </div>
                                                    <div className={`flex items-center gap-2 p-3 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'}`}>
                                                        <Package size={18} className="text-blue-500" />
                                                        <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Safe Packaging</span>
                                                    </div>
                                                </div>
                                                
                                                {/* Bottom Action Bar - Sticky on Mobile */}
                                                <div className={`sticky bottom-0 -mx-5 -mb-5 p-5 md:mx-0 md:mb-0 md:p-0 border-t md:border-none flex items-center justify-between gap-4 mt-auto z-10 ${isDark ? 'bg-[#0f111a] border-white/5' : 'bg-white border-slate-100'}`}>
                                                    <div className="flex flex-col">
                                                        {pSavings > 0 && (
                                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                                <span className={`text-xs font-bold line-through ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                                                    MRP ₹{pMrp.toLocaleString('en-IN')}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div className={`text-2xl md:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                            ₹{pSellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="w-[140px] md:w-[160px] shrink-0">
                                                        {pOos ? (
                                                            <div className={`w-full py-3.5 rounded-xl text-center font-black uppercase tracking-widest text-xs border ${isDark ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                                Out of Stock
                                                            </div>
                                                        ) : pCartItem ? (
                                                            <div className="flex items-center bg-sky-500 text-white rounded-xl h-[48px] px-1 shadow-[0_4px_16px_rgba(14,165,233,0.3)] w-full overflow-hidden">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50); removeFromCart(pItem); }}
                                                                    className="w-12 h-full flex items-center justify-center hover:bg-black/10 transition-colors"
                                                                >
                                                                    <Minus size={18} strokeWidth={3} />
                                                                </button>
                                                                <span className="flex-1 text-lg font-black text-center">{pCartItem.quantity}</span>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); addToCart(pItem); }}
                                                                    className="w-12 h-full flex items-center justify-center hover:bg-black/10 transition-colors"
                                                                >
                                                                    <Plus size={18} strokeWidth={3} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); addToCart(pItem); }}
                                                                className="w-full h-[48px] rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-black text-[13px] uppercase tracking-widest shadow-md shadow-sky-500/25 transition-all active:scale-95 flex items-center justify-center"
                                                            >
                                                                ADD TO CART
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Mobile Filter Drawer */}
            <MobileFilterDrawer
                isOpen={isMobileFiltersOpen}
                onClose={() => setIsMobileFiltersOpen(false)}
                onClearAll={handleClearSecondaryFilters}
                hasActiveFilters={hasSecondaryFilters}
                resultsCount={totalCount}
            >
                <FilterSidebar
                    onFilterChange={handleFilterChange}
                    showHeader={false}
                />
            </MobileFilterDrawer>
        </div>
    );
}
