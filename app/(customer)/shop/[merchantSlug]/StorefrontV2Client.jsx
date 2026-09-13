'use client';

import { useState, useEffect, useMemo, useCallback, useRef, useTransition } from 'react';
import { Search, ArrowLeft, Loader2, ShoppingCart, Package, ChevronLeft, ChevronRight, BadgeCheck, Sparkles, SlidersHorizontal, Grid3X3, Heart, Zap, Shirt, Pill, Home, Utensils, Grid, Star, MapPin, Store, Plus, Minus, X, Clock } from 'lucide-react';
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
import { getProductFallbackImage } from '@/lib/shopping/categories';
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
    const [quickViewItem, setQuickViewItem] = useState(null);
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

    // Sub-category change from sticky slider (toggles sub_category and resets page to 1)
    const handleSubCategoryChange = useCallback((sub) => {
        startTransition(() => {
            const params = new URLSearchParams(searchParams);
            if (!sub || sub === 'All' || selectedSubCategory.toLowerCase() === sub.toLowerCase()) {
                params.delete('sub_category');
            } else {
                params.set('sub_category', sub);
            }
            params.set('page', '1');
            router.push(`${pathname}?${params.toString()}`, { scroll: false });
        });
    }, [searchParams, selectedSubCategory, pathname, router]);

    // Sub-category horizontal slider ref and scroll control
    const subCatSliderRef = useRef(null);
    const scrollSubCat = useCallback((direction) => {
        if (subCatSliderRef.current) {
            const scrollAmount = direction === 'left' ? -220 : 220;
            subCatSliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    }, []);

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
        const dynamicSet = new Set();
        if (activeCategory && activeCategory !== 'All') {
            const canonical = getSubCategories(activeCategory);
            canonical.forEach(sub => {
                if (sub && sub !== 'General' && sub !== 'All') dynamicSet.add(sub);
            });
            liveInventory?.forEach(item => {
                const itemCat = item.category || item.shopping_products?.category;
                if (!itemCat || itemCat.toLowerCase() === activeCategory.toLowerCase()) {
                    const sub = item.sub_category || item.shopping_products?.sub_category;
                    if (sub && sub !== 'General' && sub !== 'All') dynamicSet.add(sub);
                }
            });
        } else {
            // All categories: collect all distinct subcategories from items in liveInventory
            liveInventory?.forEach(item => {
                const sub = item.sub_category || item.shopping_products?.sub_category;
                if (sub && sub !== 'General' && sub !== 'All') dynamicSet.add(sub);
            });
            // If live inventory has few items, supplement from merchant's active categories
            if (dynamicSet.size < 3 && merchantCategories?.length > 1) {
                merchantCategories.forEach(cat => {
                    if (cat && cat !== 'All') {
                        const subs = getSubCategories(cat);
                        subs.slice(0, 3).forEach(s => {
                            if (s && s !== 'General' && s !== 'All') dynamicSet.add(s);
                        });
                    }
                });
            }
        }
        return Array.from(dynamicSet);
    }, [activeCategory, liveInventory, merchantCategories]);


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
            <div className="sticky top-[76px] md:top-[92px] z-30 px-0 sm:px-4 md:px-6 max-w-7xl mx-auto w-full mb-3 sm:mb-4 pointer-events-none">
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

                    {/* Minimal Professional Subcategory Slider under Categories */}
                    {availableSubCategories.length > 0 && (
                        <div className={`relative flex items-center px-3 md:px-5 py-1.5 border-t transition-colors ${
                            isDark 
                                ? 'bg-white/[0.02] border-white/[0.05]' 
                                : 'bg-slate-50/90 border-slate-100'
                        }`}>
                            {/* Scroll Left Button for desktop */}
                            <button
                                type="button"
                                onClick={() => scrollSubCat('left')}
                                aria-label="Scroll subcategories left"
                                className={`hidden md:flex items-center justify-center w-6 h-6 rounded-full shrink-0 mr-1.5 transition-all opacity-70 hover:opacity-100 active:scale-95 ${
                                    isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white shadow-2xs border border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                                <ChevronLeft size={13} />
                            </button>

                            {/* Slider Container */}
                            <div 
                                ref={subCatSliderRef}
                                className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5"
                            >
                                <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 mr-1 hidden sm:inline-block ${
                                    isDark ? 'text-slate-400' : 'text-slate-500'
                                }`}>
                                    Subcategory:
                                </span>

                                {/* "All" Pill */}
                                <button
                                    type="button"
                                    onClick={() => handleSubCategoryChange('All')}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                                        selectedSubCategory === 'All'
                                            ? isDark 
                                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' 
                                                : 'bg-sky-100 text-sky-800 border border-sky-200'
                                            : isDark
                                                ? 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 border border-transparent'
                                    }`}
                                >
                                    All
                                </button>

                                {/* Subcategory Pills */}
                                {availableSubCategories.map(sub => {
                                    const isSubActive = selectedSubCategory.toLowerCase() === sub.toLowerCase();
                                    return (
                                        <button
                                            key={sub}
                                            type="button"
                                            onClick={() => handleSubCategoryChange(sub)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 ${
                                                isSubActive
                                                    ? isDark 
                                                        ? 'bg-sky-500 text-white shadow-xs font-bold' 
                                                        : 'bg-sky-600 text-white shadow-xs font-bold'
                                                    : isDark
                                                        ? 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.06]'
                                                        : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-950 border border-slate-200/70 shadow-2xs'
                                            }`}
                                        >
                                            {isSubActive && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
                                            <span>{sub}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Scroll Right Button for desktop */}
                            <button
                                type="button"
                                onClick={() => scrollSubCat('right')}
                                aria-label="Scroll subcategories right"
                                className={`hidden md:flex items-center justify-center w-6 h-6 rounded-full shrink-0 ml-1.5 transition-all opacity-70 hover:opacity-100 active:scale-95 ${
                                    isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white shadow-2xs border border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                                <ChevronRight size={13} />
                            </button>
                        </div>
                    )}
                </header>
            </div>

            {/* MAIN CONTENT AREA */}
            <main className="w-full px-0 sm:px-4 md:px-6 flex-1 py-2 sm:py-3 md:py-5 relative z-10">
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
                                availableSubCategories={availableSubCategories}
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
                                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-2 sm:gap-4">
                                        {filteredItems.map(item => (
                                            <ProductCardV2
                                                key={item.id}
                                                item={item}
                                                cartItem={cart.find(i => i.id === item.id)}
                                                onAdd={() => addToCart(item)}
                                                onRemove={() => removeFromCart(item)}
                                                merchantSlug={merchant?.slug}
                                                primaryColor={primaryColor}
                                                secondaryColor={secondaryColor}
                                                isWishlisted={wishlistIds.has(item.product_id)}
                                                onWishlist={() => toggleWishlist(item)}
                                                onQuickView={() => setQuickViewItem(item)}
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

            {/* Sleek Quick View Bottom Sheet Modal */}
            <AnimatePresence>
                {quickViewItem && (() => {
                    const qvProduct = quickViewItem?.shopping_products || quickViewItem;
                    const qvMrp = (qvProduct?.mrp_paise || qvProduct?.suggested_retail_price_paise || quickViewItem?.retail_price_paise || 0) / 100;
                    const qvSellingPrice = quickViewItem?.is_platform_product
                        ? ((qvProduct?.platform_price_paise ?? qvProduct?.suggested_retail_price_paise) || quickViewItem?.retail_price_paise || 0) / 100
                        : ((quickViewItem?.retail_price_paise || qvProduct?.platform_price_paise || 0) / 100);
                    const qvSavings = qvMrp > qvSellingPrice ? qvMrp - qvSellingPrice : 0;
                    const qvDiscountPct = qvMrp > 0 ? Math.round((qvSavings / qvMrp) * 100) : 0;
                    const qvCartItem = cart.find(i => i.id === quickViewItem?.id);
                    const qvQty = qvCartItem ? qvCartItem.quantity : 0;
                    const qvProductSlugOrId = qvProduct?.slug || qvProduct?.id || quickViewItem?.slug || quickViewItem?.id;
                    const qvPdpUrl = `/shop/product/${qvProductSlugOrId}${merchant?.slug ? `?merchant=${merchant.slug}` : ''}`;
                    const qvImage = getProductFallbackImage(qvProduct || quickViewItem);
                    const isOos = isStorefrontItemOOS(quickViewItem);

                    return (
                        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setQuickViewItem(null)}
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                            />

                            {/* Modal Sheet */}
                            <motion.div
                                initial={{ y: "100%", opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: "100%", opacity: 0 }}
                                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                                className={`relative w-full max-w-lg rounded-t-[32px] sm:rounded-3xl shadow-2xl z-10 overflow-hidden max-h-[90vh] flex flex-col ${
                                    isDark ? 'bg-[#0f131d] text-white border border-white/10' : 'bg-white text-slate-900 border border-slate-200'
                                }`}
                            >
                                {/* Drag handle on mobile */}
                                <div className="sm:hidden pt-3 pb-1 flex justify-center cursor-grab">
                                    <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-white/20" />
                                </div>

                                {/* Close Button */}
                                <button
                                    type="button"
                                    onClick={() => setQuickViewItem(null)}
                                    className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300 transition-colors z-20"
                                >
                                    <X size={18} />
                                </button>

                                <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
                                    {/* Image & Title Header */}
                                    <div className="flex gap-4 items-start">
                                        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-2 flex items-center justify-center shrink-0 relative overflow-hidden">
                                            <img
                                                src={qvImage}
                                                alt={quickViewItem.custom_title || qvProduct?.title || 'Product'}
                                                className="w-full h-full object-contain"
                                            />
                                            {qvDiscountPct > 0 && (
                                                <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-rose-600 text-white text-[9px] font-black uppercase">
                                                    {qvDiscountPct}% OFF
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0 pr-6">
                                            {/* Same Day Badge */}
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 text-[10px] font-bold border border-sky-200/60 dark:border-sky-800/40 mb-1.5">
                                                <Zap size={10} className="fill-sky-500 text-sky-500" />
                                                SAME DAY DELIVERY
                                            </span>

                                            <h3 className="text-base sm:text-lg font-bold line-clamp-2 leading-snug">
                                                {quickViewItem.custom_title || qvProduct?.title}
                                            </h3>

                                            {/* Verified Store */}
                                            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                <span>{liveMerchant?.business_name || 'InTrust Store'}</span>
                                                <BadgeCheck size={14} className="text-[#0095F6] fill-[#0095F6]" />
                                            </div>

                                            {/* Pricing */}
                                            <div className="flex items-baseline gap-2 mt-2">
                                                <span className="text-xl font-black text-slate-900 dark:text-white">
                                                    ₹{qvSellingPrice.toFixed(0)}
                                                </span>
                                                {qvMrp > qvSellingPrice && (
                                                    <span className="text-xs line-through text-slate-400 dark:text-slate-500">
                                                        ₹{qvMrp.toFixed(0)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Store Closed Browsing Notice */}
                                    {!isStoreOpen && (
                                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-300 text-xs font-medium flex items-center gap-2">
                                            <Clock size={15} />
                                            <span>This store is currently not accepting orders.</span>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="pt-2 space-y-2.5">
                                        <div className="flex items-center gap-3">
                                            {/* Add to Cart / Quantity Stepper */}
                                            {qvQty > 0 ? (
                                                <div className="flex-1 flex items-center justify-between px-3 py-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFromCart(quickViewItem)}
                                                        className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xs active:scale-95 transition-transform"
                                                    >
                                                        <Minus size={16} />
                                                    </button>
                                                    <span className="font-extrabold text-base text-blue-600 dark:text-blue-400">
                                                        {qvQty} in Cart
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => addToCart(quickViewItem)}
                                                        className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs active:scale-95 transition-transform"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    disabled={!isStoreOpen || isOos}
                                                    onClick={() => addToCart(quickViewItem)}
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <ShoppingCart size={16} />
                                                    <span>Add to Cart</span>
                                                </button>
                                            )}

                                            {/* Buy Now Button */}
                                            <button
                                                type="button"
                                                disabled={!isStoreOpen || isOos}
                                                onClick={() => {
                                                    if (qvQty === 0) addToCart(quickViewItem);
                                                    setQuickViewItem(null);
                                                    router.push('/shop/cart');
                                                }}
                                                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-sm shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Zap size={16} className="fill-white" />
                                                <span>BUY NOW</span>
                                            </button>
                                        </div>

                                        {/* View Full Details Button */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setQuickViewItem(null);
                                                router.push(qvPdpUrl);
                                            }}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 font-semibold text-xs transition-colors"
                                        >
                                            <span>View Full Product Details</span>
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    );
                })()}
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
                    availableSubCategories={availableSubCategories}
                />
            </MobileFilterDrawer>
        </div>
    );
}
