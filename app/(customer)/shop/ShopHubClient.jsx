'use client';

import React, { useState, useEffect, useMemo, memo } from 'react';
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
    Sun
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';

const CATEGORY_ITEMS = [
    { label: 'All Categories', slug: '' },
    { label: 'Electronics & Audio', slug: 'electronics', icon: Headphones },
    { label: 'Mobiles & Tablets', slug: 'mobiles', icon: Smartphone },
    { label: 'Fashion & Wear', slug: 'fashion', icon: Shirt },
    { label: 'Home & Kitchen', slug: 'home', icon: Home },
    { label: 'Local Groceries', slug: 'groceries', icon: ShoppingBasket },
    { label: 'Solar & NFC', slug: 'solar', icon: Sun },
];

export default function ShopHubClient({ merchants = [], ratingsMap = {}, categories = [] }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [pickupMode, setPickupMode] = useState('all'); // 'all' or 'fast_2hr'
    const [selectedCategory, setSelectedCategory] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterOnlyOpen, setFilterOnlyOpen] = useState(false);
    const [filterMinRating, setFilterMinRating] = useState(0);
    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [addedProductId, setAddedProductId] = useState(null);

    // Fetch real products from shopping_products table
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
                        selling_price,
                        mrp,
                        stock_quantity,
                        images,
                        category,
                        rating,
                        merchant_id,
                        merchants:merchants (
                            id,
                            business_name,
                            slug
                        )
                    `)
                    .eq('is_active', true)
                    .order('created_at', { ascending: false });

                if (!error && data && data.length > 0) {
                    setProducts(data);
                } else {
                    // Seed initial catalog if database is fresh
                    setProducts([
                        {
                            id: 'prod-1',
                            title: 'boAt Airdopes 141 ANC Earbuds',
                            slug: 'boat-airdopes-141-anc',
                            category: 'electronics',
                            selling_price: 999,
                            mrp: 4490,
                            rating: 4.8,
                            images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80'],
                            merchants: { business_name: 'Sharma Digital Store', slug: 'sharma-digital' }
                        },
                        {
                            id: 'prod-2',
                            title: 'Fire-Boltt Ninja Pro Max Smartwatch',
                            slug: 'fire-boltt-ninja-pro-max',
                            category: 'electronics',
                            selling_price: 1299,
                            mrp: 5999,
                            rating: 4.6,
                            images: ['https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&auto=format&fit=crop&q=80'],
                            merchants: { business_name: 'InTrust Direct Tech', slug: 'intrust-direct' }
                        },
                        {
                            id: 'prod-3',
                            title: 'Samsung Galaxy Buds Live ANC',
                            slug: 'samsung-galaxy-buds-live',
                            category: 'electronics',
                            selling_price: 4999,
                            mrp: 15990,
                            rating: 4.9,
                            images: ['https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=80'],
                            merchants: { business_name: 'Bhopal Electronics Hub', slug: 'bhopal-electronics' }
                        },
                        {
                            id: 'prod-4',
                            title: 'Havells Instant Dry Iron 1000W',
                            slug: 'havells-instant-dry-iron',
                            category: 'home',
                            selling_price: 1099,
                            mrp: 1899,
                            rating: 4.7,
                            images: ['https://images.unsplash.com/photo-1588854337236-6889d631faa8?w=600&auto=format&fit=crop&q=80'],
                            merchants: { business_name: 'Gupta Electric & Retail', slug: 'gupta-electric' }
                        }
                    ]);
                }
            } catch (err) {
                console.error('Failed to load shopping products:', err);
            } finally {
                setProductsLoading(false);
            }
        };

        fetchProducts();
    }, []);

    // Filter merchants based on search, open status, rating
    const filteredMerchants = useMemo(() => {
        return merchants.filter((m) => {
            if (m.id === 'official') return false; // Show in special card if needed
            if (searchQuery && !m.business_name?.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }
            if (filterOnlyOpen && !m.is_open) return false;
            const rating = ratingsMap[m.id]?.avg_rating || 4.5;
            if (filterMinRating > 0 && rating < filterMinRating) return false;
            return true;
        });
    }, [merchants, searchQuery, filterOnlyOpen, filterMinRating, ratingsMap]);

    // Filter products based on search & category
    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
            if (searchQuery) {
                const matchTitle = p.title?.toLowerCase().includes(searchQuery.toLowerCase());
                const matchDesc = p.description?.toLowerCase().includes(searchQuery.toLowerCase());
                if (!matchTitle && !matchDesc) return false;
            }
            if (selectedCategory && p.category?.toLowerCase() !== selectedCategory.toLowerCase()) {
                return false;
            }
            return true;
        });
    }, [products, searchQuery, selectedCategory]);

    const handleAddToCart = (e, product) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            const rawCart = localStorage.getItem('intrust_cart');
            const cart = rawCart ? JSON.parse(rawCart) : [];
            const existingIdx = cart.findIndex((i) => i.id === product.id);

            if (existingIdx >= 0) {
                cart[existingIdx].quantity = (cart[existingIdx].quantity || 1) + 1;
            } else {
                cart.push({
                    id: product.id,
                    title: product.title,
                    price: product.selling_price,
                    mrp: product.mrp,
                    image: product.images?.[0] || '',
                    merchantName: product.merchants?.business_name || 'InTrust Store',
                    quantity: 1
                });
            }

            localStorage.setItem('intrust_cart', JSON.stringify(cart));
            window.dispatchEvent(new Event('cartUpdated'));

            setAddedProductId(product.id);
            toast.success(`Added ${product.title} to cart!`);

            setTimeout(() => {
                setAddedProductId(null);
            }, 2000);
        } catch (err) {
            console.error('Add to cart error:', err);
        }
    };

    return (
        <div className="w-full space-y-8 font-body-md text-on-surface">
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
                                <span className="flex items-center gap-1 text-[#D4AF37] text-xs font-bold">
                                    <ShieldCheck size={14} /> Escrow Protected
                                </span>
                            </div>
                            <h1 className="text-2xl sm:text-4xl font-black text-on-surface tracking-tight leading-tight">
                                Explore Shop &amp; Local Bhopal Stores
                            </h1>
                            <p className="text-xs sm:text-sm text-on-surface-variant mt-2 max-w-2xl font-medium leading-relaxed">
                                Browse verified merchant inventory, top brand electronics, and local store pickups protected by InTrust safe escrow payment protection.
                            </p>
                        </div>

                        {/* Pickup Mode Switcher */}
                        <div className="p-1.5 rounded-2xl bg-surface-container-low flex items-center gap-1 self-start md:self-auto shrink-0 border border-outline-variant/20">
                            <button
                                onClick={() => setPickupMode('all')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    pickupMode === 'all'
                                        ? 'bg-surface-container-lowest text-primary shadow-sm'
                                        : 'text-on-surface-variant hover:text-on-surface'
                                }`}
                            >
                                <ShoppingBag size={14} />
                                <span>All Items</span>
                            </button>
                            <button
                                onClick={() => setPickupMode('fast_2hr')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    pickupMode === 'fast_2hr'
                                        ? 'bg-surface-container-lowest text-[#D4AF37] shadow-sm'
                                        : 'text-on-surface-variant hover:text-on-surface'
                                }`}
                            >
                                <Bolt size={14} className="text-[#D4AF37]" />
                                <span>Fast Local Pickup (2 Hrs)</span>
                            </button>
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

                        {/* Horizontal Category Chips */}
                        <div className="lg:col-span-8 flex items-center gap-2 overflow-x-auto pb-1.5 lg:pb-0 scrollbar-none">
                            {CATEGORY_ITEMS.map((cat, idx) => {
                                const Icon = cat.icon;
                                const isActive = selectedCategory === cat.slug;

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedCategory(cat.slug)}
                                        className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shadow-sm ${
                                            isActive
                                                ? 'bg-primary text-white shadow-md'
                                                : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                                        }`}
                                    >
                                        {Icon && <Icon size={14} className={isActive ? 'text-white' : 'text-primary'} />}
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
                <div className="lg:col-span-7 relative overflow-hidden rounded-3xl text-white p-7 sm:p-8 flex flex-col justify-between shadow-lg group border border-white/10 bg-slate-950">
                    <div 
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 opacity-40"
                        style={{ backgroundImage: `url('/banners/festive_tech_sale.jpg')` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-blue-950/50" />
                    <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-blue-500/20 rounded-full blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-700" />
                    
                    <div className="relative z-10 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full bg-slate-900/80 text-[#D4AF37] text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-amber-500/30 backdrop-blur-md">
                                <Sparkles size={11} /> FESTIVE ELECTRONICS BONANZA
                            </span>
                            <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/90 text-[10px] font-bold backdrop-blur-md border border-white/10">
                                Bhopal Exclusives
                            </span>
                        </div>
                        <div className="max-w-md">
                            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                                Up to 60% Off on Top Tech Brands
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-200 mt-2 font-medium leading-relaxed">
                                Unmatched deals on boAt, Fire-Boltt, and Samsung with guaranteed 5% direct cash deposit straight back into your InTrust Wallet.
                            </p>
                        </div>
                    </div>

                    <div className="relative z-10 pt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 mt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/10">
                                <Sparkles size={20} className="text-[#D4AF37]" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Instant InTrust Credit</p>
                                <p className="text-sm font-black text-white">+5% Wallet Cashback</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedCategory('electronics')}
                            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
                        >
                            <span>Shop Tech Deals</span>
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </div>

                {/* Promo 2: Instant Store Credit (Udhari) */}
                <div className="lg:col-span-5 relative overflow-hidden rounded-3xl text-white p-7 sm:p-8 flex flex-col justify-between shadow-lg border border-white/10 bg-slate-950 group">
                    <div 
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 opacity-35"
                        style={{ backgroundImage: `url('/banners/local_fast_delivery.jpg')` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-emerald-950/40" />

                    <div className="relative z-10">
                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30 backdrop-blur-md">
                            Pre-Approved Udhari Credit
                        </span>
                        <h3 className="text-xl sm:text-2xl font-black text-white mt-3 leading-tight">
                            Shop Today, Settle on Payday
                        </h3>
                        <p className="text-xs text-slate-200 mt-2 font-medium leading-relaxed">
                            Up to ₹25,000 instant store credit line at 0% interest for 15 days at all verified Bhopal partner merchants.
                        </p>
                    </div>

                    <div className="relative z-10 pt-6 mt-6 border-t border-white/10 flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-300 uppercase font-bold">Credit Approval</span>
                            <span className="text-sm font-black text-emerald-400">Instant in 60 Sec</span>
                        </div>
                        <Link
                            href="/store-credits"
                            className="px-4 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 transition-all shadow-md active:scale-95"
                        >
                            Activate Credit
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── VERIFIED PRODUCTS CATALOG ── */}
            <div className="w-full space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight flex items-center gap-2">
                            <span>📦 Verified Products &amp; Catalog</span>
                        </h2>
                        <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5">
                            {filteredProducts.length} items ready for immediate dispatch or store pickup
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
                                className="w-4 h-4 rounded text-primary focus:ring-primary"
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
                                            ? 'bg-primary text-white'
                                            : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                                    }`}
                                >
                                    {r === 0 ? 'All' : `${r}+ ★`}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Products Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {filteredProducts.map((prod) => {
                        const discount = prod.mrp && prod.selling_price 
                            ? Math.round(((prod.mrp - prod.selling_price) / prod.mrp) * 100)
                            : 0;

                        const isAdded = addedProductId === prod.id;
                        const imageUrl = prod.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80';

                        return (
                            <Link
                                key={prod.id}
                                href={`/shop/product/${prod.slug || prod.id}`}
                                className="group flex flex-col justify-between bg-surface-container-lowest hover:bg-surface-container-low rounded-3xl p-4 border border-outline-variant/30 hover:border-primary/40 shadow-sm hover:shadow-xl transition-all duration-300"
                            >
                                <div>
                                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-surface-container-low mb-4 flex items-center justify-center p-3">
                                        <img
                                            src={imageUrl}
                                            alt={prod.title}
                                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                        />

                                        {discount > 0 && (
                                            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                                                {discount}% OFF
                                            </div>
                                        )}

                                        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-surface-container-lowest/90 backdrop-blur-md text-on-surface text-[10px] font-black flex items-center gap-1 shadow-sm">
                                            <Star size={11} className="text-amber-500 fill-amber-500" />
                                            <span>{prod.rating || '4.8'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 text-[11px] text-brand-steel font-semibold mb-1 truncate">
                                        <Store size={12} className="text-primary shrink-0" />
                                        <span className="truncate">{prod.merchants?.business_name || 'Verified Store'}</span>
                                    </div>

                                    <h3 className="font-bold text-sm text-on-surface line-clamp-2 leading-snug group-hover:text-primary transition-colors">
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
                                            +5% InTrust Cashback
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={(e) => handleAddToCart(e, prod)}
                                        className={`p-2.5 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                                            isAdded
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-primary hover:bg-blue-700 text-white shadow-md active:scale-90'
                                        }`}
                                        title="Add to Cart"
                                    >
                                        {isAdded ? <Check size={16} /> : <Plus size={16} />}
                                    </button>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* ── VERIFIED BHOPAL STORES ── */}
            {filteredMerchants.length > 0 && (
                <div className="w-full space-y-6 pt-6 border-t border-outline-variant/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight flex items-center gap-2">
                                <span>🏬 Verified Stores &amp; Retail Catalogs</span>
                            </h2>
                            <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5">
                                Direct merchant contact with fast local store pickup
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredMerchants.map((merchant) => {
                            const banner = merchant.shopping_banner_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80';
                            const merchantPhone = merchant.phone || '+91 755 492 8840';

                            return (
                                <div
                                    key={merchant.id}
                                    className="group bg-surface-container-lowest hover:bg-surface-container-low rounded-3xl p-4 border border-outline-variant/30 hover:border-primary/40 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="relative h-44 w-full rounded-2xl overflow-hidden bg-surface-container-low mb-4">
                                            <img
                                                src={banner}
                                                alt={merchant.business_name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                                            <div className="absolute top-3 left-3 flex items-center gap-2">
                                                <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                    Open Now
                                                </span>
                                                <span className="px-2 py-1 rounded-full bg-black/50 backdrop-blur-md text-white text-[10px] font-bold">
                                                    2-Hr Pickup
                                                </span>
                                            </div>

                                            <div className="absolute top-3 right-3 px-2 py-1 rounded-xl bg-white/95 backdrop-blur-md text-slate-900 text-xs font-black flex items-center gap-1 shadow-sm">
                                                <Star size={12} className="text-amber-500 fill-amber-500" />
                                                <span>4.8</span>
                                            </div>

                                            <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white text-xs font-semibold">
                                                <MapPin size={13} className="text-[#D4AF37]" />
                                                <span>0.8 km • MP Nagar, Bhopal</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-extrabold text-base text-on-surface truncate group-hover:text-primary transition-colors">
                                                {merchant.business_name}
                                            </h3>
                                            <ShieldCheck size={16} className="text-[#D4AF37] shrink-0" title="Verified Merchant" />
                                        </div>

                                        <p className="text-xs text-on-surface-variant font-medium line-clamp-1 mb-3">
                                            {merchant.business_address || 'Electronics, Mobiles, Soundbars & Retail'}
                                        </p>
                                    </div>

                                    <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-between gap-3">
                                        <a
                                            href={`tel:${merchantPhone}`}
                                            className="px-3 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-on-surface text-xs font-bold flex items-center gap-1.5 border border-outline-variant/20 transition-colors"
                                            title="Call Store Merchant"
                                        >
                                            <Phone size={13} className="text-emerald-600" />
                                            <span>Call</span>
                                        </a>

                                        <Link
                                            href={`/shop/${merchant.slug || merchant.id}`}
                                            className="flex-1 py-2 px-3 rounded-xl bg-primary hover:bg-blue-700 text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
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
        </div>
    );
}
