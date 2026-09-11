'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { 
    Store, 
    Edit3, 
    EyeOff, 
    TrendingUp, 
    TrendingDown, 
    Tag, 
    Search, 
    Filter, 
    ArrowUpDown, 
    Plus, 
    ShoppingBag, 
    Check, 
    Copy, 
    Calendar, 
    Layers, 
    AlertCircle, 
    ExternalLink,
    HelpCircle,
    X,
    CheckCircle2
} from 'lucide-react';
import ListToMarketplace from '@/components/merchant/ListToMarketplace';
import { supabase } from '@/lib/supabaseClient';
import { useSubscription } from '@/components/merchant/SubscriptionContext';
import { useConfetti } from '@/components/ui/ConfettiProvider';

// Helper to format currency in Indian numbering system
function formatINR(val) {
    if (val === null || val === undefined || isNaN(val)) return '₹0';
    return '₹' + Number(val).toLocaleString('en-IN', {
        maximumFractionDigits: 2,
        minimumFractionDigits: val % 1 !== 0 ? 2 : 0,
    });
}

// Helper to format masked card code safely
function getMaskedCode(coupon) {
    if (coupon.masked_code && coupon.masked_code.trim()) {
        return coupon.masked_code;
    }
    // Fallback: Mask the UUID or id safely
    if (coupon.id) {
        return `•••• ${coupon.id.slice(-4).toUpperCase()}`;
    }
    return '••••••••';
}

// Format expiry date
function formatExpiry(dateStr) {
    if (!dateStr) return 'No Expiry';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'No Expiry';
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return 'No Expiry';
    }
}

export default function MerchantGiftcardsClient({
    initialCoupons = [],
    stats = { total: 0, listed: 0, unlisted: 0, sold: 0, totalValue: 0 },
    currentFilter = 'all',
}) {
    const router = useRouter();
    const { performAction } = useSubscription();
    const { trigger: triggerConfetti } = useConfetti();

    // Active listing modal state
    const [selectedCoupon, setSelectedCoupon] = useState(null);
    const [showListModal, setShowListModal] = useState(false);

    // Unlist confirmation modal state
    const [unlistingCoupon, setUnlistingCoupon] = useState(null);
    const [isUnlisting, setIsUnlisting] = useState(false);

    // Copied feedback
    const [copiedId, setCopiedId] = useState(null);

    // Search and Sort controls
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sortBy, setSortBy] = useState('newest'); // newest, oldest, value_desc, value_asc, margin_desc

    // Extract unique categories from current coupon set
    const categories = useMemo(() => {
        const set = new Set();
        initialCoupons.forEach(c => {
            if (c.category) set.add(c.category);
        });
        return Array.from(set);
    }, [initialCoupons]);

    // Filter and Sort inventory locally for instantaneous responsiveness
    const filteredCoupons = useMemo(() => {
        let list = [...initialCoupons];

        // Search filter: brand, title, category, or masked code
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            list = list.filter(c => {
                const brand = (c.brand || '').toLowerCase();
                const title = (c.title || '').toLowerCase();
                const category = (c.category || '').toLowerCase();
                const masked = (c.masked_code || '').toLowerCase();
                return brand.includes(query) || title.includes(query) || category.includes(query) || masked.includes(query);
            });
        }

        // Category filter
        if (selectedCategory !== 'all') {
            list = list.filter(c => c.category?.toLowerCase() === selectedCategory.toLowerCase());
        }

        // Sorting
        list.sort((a, b) => {
            const valA = (a.face_value_paise || 0) / 100;
            const valB = (b.face_value_paise || 0) / 100;

            const costA = a.purchase_price ?? ((a.merchant_purchase_price_paise || 0) / 100);
            const sellA = (a.merchant_selling_price_paise || 0) / 100;
            const profitA = sellA - costA;

            const costB = b.purchase_price ?? ((b.merchant_purchase_price_paise || 0) / 100);
            const sellB = (b.merchant_selling_price_paise || 0) / 100;
            const profitB = sellB - costB;

            if (sortBy === 'oldest') {
                return new Date(a.created_at || 0) - new Date(b.created_at || 0);
            }
            if (sortBy === 'value_desc') {
                return valB - valA;
            }
            if (sortBy === 'value_asc') {
                return valA - valB;
            }
            if (sortBy === 'margin_desc') {
                return profitB - profitA;
            }
            // Default newest
            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });

        return list;
    }, [initialCoupons, searchQuery, selectedCategory, sortBy]);

    // Handle Copy Masked Code
    const handleCopyCode = (couponId, text) => {
        if (!text) return;
        navigator.clipboard?.writeText(text);
        setCopiedId(couponId);
        toast.success('Card identifier copied');
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Listing Success Handler
    const handleListSuccess = async () => {
        setShowListModal(false);
        setSelectedCoupon(null);
        triggerConfetti();
        toast.success('Gift card listed on marketplace!');
        router.refresh();
    };

    // Unlisting Handler
    const confirmUnlist = async () => {
        if (!unlistingCoupon) return;
        setIsUnlisting(true);
        try {
            const { error } = await supabase
                .from('coupons')
                .update({ listed_on_marketplace: false, updated_at: new Date().toISOString() })
                .eq('id', unlistingCoupon.id);

            if (error) throw error;

            toast.success('Card removed from marketplace.');
            setUnlistingCoupon(null);
            router.refresh();
        } catch (err) {
            toast.error(err.message || 'Failed to unlist card.');
        } finally {
            setIsUnlisting(false);
        }
    };

    return (
        <div className="space-y-6 pb-20 lg:pb-10 min-w-0">
            {/* 1. Header with Eyebrow, Title, Subtitle, & Real Supported Actions */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-2">
                <div>
                    <div className="flex items-center gap-2 text-[11px] font-bold tracking-widest text-[#D4AF37] uppercase">
                        <span>MERCHANT INVENTORY</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-display text-slate-900 dark:text-white tracking-tight mt-1">
                        Gift Cards
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                        Manage your purchased gift cards and marketplace listings.
                    </p>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center gap-2.5 shrink-0">
                    <Link
                        href="/merchant/coupons/add"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-sm"
                    >
                        <Plus size={15} className="text-[#D4AF37]" />
                        <span>Add Custom Card</span>
                    </Link>

                    <Link
                        href="/merchant/purchase"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#c9a42f] text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-[#D4AF37]/20 active:scale-[0.98]"
                    >
                        <ShoppingBag size={15} />
                        <span>Buy Gift Cards</span>
                    </Link>
                </div>
            </div>

            {/* 2. Compact KPI Summary (Desktop: 4 in a row, Mobile: 2x2 grid) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Total Cards */}
                <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between group hover:border-blue-500/30 transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Total Cards
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <Layers size={16} />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl sm:text-3xl font-black font-display text-slate-900 dark:text-white tracking-tight">
                            {stats.total}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                            Available in inventory
                        </div>
                    </div>
                </div>

                {/* Listed on Market */}
                <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between group hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Listed on Market
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <Store size={16} />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl sm:text-3xl font-black font-display text-emerald-600 dark:text-emerald-400 tracking-tight">
                            {stats.listed}
                        </div>
                        <div className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 font-medium mt-0.5">
                            Active for buyers
                        </div>
                    </div>
                </div>

                {/* Unlisted */}
                <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between group hover:border-slate-400/30 transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Unlisted
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                            <EyeOff size={16} />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl sm:text-3xl font-black font-display text-slate-800 dark:text-slate-200 tracking-tight">
                            {stats.unlisted}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                            Ready to list
                        </div>
                    </div>
                </div>

                {/* Total Investment */}
                <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-[#D4AF37]/25 dark:border-[#D4AF37]/20 shadow-sm flex flex-col justify-between bg-gradient-to-br from-[#D4AF37]/5 to-transparent group hover:border-[#D4AF37]/50 transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#D4AF37]">
                            Total Investment
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center">
                            <span className="font-bold text-sm">₹</span>
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl sm:text-3xl font-black font-display text-[#D4AF37] tracking-tight">
                            {formatINR(stats.totalValue)}
                        </div>
                        <div className="text-[10px] text-[#D4AF37]/70 font-medium mt-0.5">
                            Active inventory cost
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Compact Segmented Navigation Tabs */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <nav 
                    aria-label="Inventory filters"
                    className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-inner overflow-x-auto no-scrollbar max-w-full"
                >
                    <Link
                        href="/merchant/inventory/giftcards?filter=all"
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                            currentFilter === 'all'
                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
                        }`}
                    >
                        <span>All</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${currentFilter === 'all' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-slate-200/80 dark:bg-white/10'}`}>
                            {stats.total}
                        </span>
                    </Link>

                    <Link
                        href="/merchant/inventory/giftcards?filter=listed"
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                            currentFilter === 'listed'
                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
                        }`}
                    >
                        <span>Listed</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${currentFilter === 'listed' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold' : 'bg-slate-200/80 dark:bg-white/10'}`}>
                            {stats.listed}
                        </span>
                    </Link>

                    <Link
                        href="/merchant/inventory/giftcards?filter=unlisted"
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                            currentFilter === 'unlisted'
                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
                        }`}
                    >
                        <span>Unlisted</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${currentFilter === 'unlisted' ? 'bg-slate-300 dark:bg-white/20 text-slate-800 dark:text-slate-200' : 'bg-slate-200/80 dark:bg-white/10'}`}>
                            {stats.unlisted}
                        </span>
                    </Link>

                    <Link
                        href="/merchant/inventory/giftcards?filter=history"
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                            currentFilter === 'history'
                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
                        }`}
                    >
                        <span>Sold / History</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${currentFilter === 'history' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-slate-200/80 dark:bg-white/10'}`}>
                            {stats.sold}
                        </span>
                    </Link>
                </nav>
            </div>

            {/* 4. Search, Filter & Sort Toolbar */}
            <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                {/* Search Input */}
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 select-none pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search gift cards by brand, title, code..."
                        className="w-full pl-9 pr-8 py-2 bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-slate-900 dark:text-white transition-all placeholder:text-slate-400"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            aria-label="Clear search"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Filter and Sort controls */}
                <div className="flex items-center gap-2">
                    {/* Category Filter */}
                    {categories.length > 0 && (
                        <div className="relative">
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                aria-label="Filter by category"
                                className="appearance-none pl-7 pr-8 py-2 bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#D4AF37] transition-all cursor-pointer"
                            >
                                <option value="all">All Categories</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <Filter size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    )}

                    {/* Sort Dropdown */}
                    <div className="relative">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            aria-label="Sort gift cards"
                            className="appearance-none pl-7 pr-8 py-2 bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#D4AF37] transition-all cursor-pointer"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="value_desc">Value: High to Low</option>
                            <option value="value_asc">Value: Low to High</option>
                            <option value="margin_desc">Profit Margin: High</option>
                        </select>
                        <ArrowUpDown size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* 5. Inventory Display: Desktop Table View */}
            <div className="hidden md:block bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                <th className="px-6 py-4">Brand / Asset</th>
                                <th className="px-4 py-4">Identifier</th>
                                <th className="px-4 py-4">Face Value</th>
                                <th className="px-4 py-4">Purchase Cost</th>
                                <th className="px-4 py-4">Market Price</th>
                                <th className="px-4 py-4">Performance</th>
                                <th className="px-4 py-4">Expiry</th>
                                <th className="px-4 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                            {filteredCoupons.map((coupon) => {
                                const rawPurchasePrice = coupon.purchase_price ?? ((coupon.merchant_purchase_price_paise || 0) / 100);
                                const purchasePrice = Math.abs(rawPurchasePrice);
                                const sellingPrice = (coupon.merchant_selling_price_paise || 0) / 100;
                                const profit = sellingPrice - purchasePrice;
                                const isProfit = profit > 0;
                                const maskedCode = getMaskedCode(coupon);

                                return (
                                    <tr key={coupon.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                                        {/* Brand & Monogram */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center border border-slate-200/80 dark:border-white/10 shadow-sm shrink-0 overflow-hidden">
                                                    {coupon.image_url ? (
                                                        <Image src={coupon.image_url} alt={coupon.brand} fill className="object-cover" />
                                                    ) : (
                                                        <span className="font-black text-[#D4AF37] text-base">{coupon.brand?.charAt(0) || 'G'}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                                                        {coupon.brand}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                                                        <Tag size={10} className="text-[#D4AF37]" />
                                                        <span>{coupon.category || 'Gift Card'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Masked Identifier */}
                                        <td className="px-4 py-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                                            <div className="flex items-center gap-1.5">
                                                <span>{maskedCode}</span>
                                                <button
                                                    onClick={() => handleCopyCode(coupon.id, maskedCode)}
                                                    title="Copy card identifier"
                                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition-colors"
                                                >
                                                    {copiedId === coupon.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                                </button>
                                            </div>
                                        </td>

                                        {/* Face Value */}
                                        <td className="px-4 py-4">
                                            <span className="font-bold text-slate-900 dark:text-white">
                                                {formatINR((coupon.face_value_paise || 0) / 100)}
                                            </span>
                                        </td>

                                        {/* Purchase Cost */}
                                        <td className="px-4 py-4">
                                            <span className="font-semibold text-slate-600 dark:text-slate-300">
                                                {formatINR(purchasePrice)}
                                            </span>
                                        </td>

                                        {/* Market Price */}
                                        <td className="px-4 py-4">
                                            {coupon.listed_on_marketplace ? (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-blue-600 dark:text-blue-400">
                                                        {formatINR(sellingPrice)}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        Active Listing
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic text-[11px]">Off Market</span>
                                            )}
                                        </td>

                                        {/* Performance / Margin */}
                                        <td className="px-4 py-4">
                                            {coupon.listed_on_marketplace && purchasePrice > 0 ? (
                                                <div className="flex flex-col">
                                                    <div className={`font-bold flex items-center gap-1 ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                                        {isProfit ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                        {formatINR(profit)}
                                                    </div>
                                                    <span className="text-[9px] text-slate-400 font-semibold">
                                                        {((profit / purchasePrice) * 100).toFixed(1)}% margin
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 opacity-40">—</span>
                                            )}
                                        </td>

                                        {/* Expiry */}
                                        <td className="px-4 py-4 text-[11px] text-slate-500 dark:text-slate-400">
                                            {formatExpiry(coupon.valid_until)}
                                        </td>

                                        {/* Status Badge */}
                                        <td className="px-4 py-4">
                                            {coupon.status === 'sold' ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                    Sold
                                                </span>
                                            ) : coupon.status === 'expired' ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                                    Expired
                                                </span>
                                            ) : coupon.listed_on_marketplace ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    Listed
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                                                    Unlisted
                                                </span>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4 text-right">
                                            {coupon.status === 'available' && (
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {!coupon.listed_on_marketplace ? (
                                                        <button
                                                            onClick={() => performAction(() => {
                                                                setSelectedCoupon(coupon);
                                                                setShowListModal(true);
                                                            })}
                                                            className="px-3 py-1.5 bg-[#D4AF37] hover:bg-[#c9a42f] text-slate-950 font-black rounded-xl text-[11px] uppercase tracking-wider transition-all shadow-sm flex items-center gap-1"
                                                        >
                                                            <Store size={13} />
                                                            <span>List</span>
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => performAction(() => {
                                                                    setSelectedCoupon(coupon);
                                                                    setShowListModal(true);
                                                                })}
                                                                title="Edit listing price"
                                                                className="w-8 h-8 flex items-center justify-center rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 transition-all"
                                                            >
                                                                <Edit3 size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => setUnlistingCoupon(coupon)}
                                                                title="Remove card from marketplace"
                                                                className="w-8 h-8 flex items-center justify-center rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-all"
                                                            >
                                                                <EyeOff size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 6. Inventory Display: Mobile Stacked Cards View (375px/390px/430px) */}
            <div className="md:hidden space-y-3">
                {filteredCoupons.map((coupon) => {
                    const rawPurchasePrice = coupon.purchase_price ?? ((coupon.merchant_purchase_price_paise || 0) / 100);
                    const purchasePrice = Math.abs(rawPurchasePrice);
                    const sellingPrice = (coupon.merchant_selling_price_paise || 0) / 100;
                    const profit = sellingPrice - purchasePrice;
                    const isProfit = profit > 0;
                    const maskedCode = getMaskedCode(coupon);

                    return (
                        <div
                            key={coupon.id}
                            className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-white/10 p-4 shadow-sm space-y-3 relative overflow-hidden"
                        >
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-3">
                                    <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center border border-slate-200/80 dark:border-white/10 shadow-sm shrink-0 overflow-hidden">
                                        {coupon.image_url ? (
                                            <Image src={coupon.image_url} alt={coupon.brand} fill className="object-cover" />
                                        ) : (
                                            <span className="font-black text-[#D4AF37] text-lg">{coupon.brand?.charAt(0) || 'G'}</span>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-tight">
                                            {coupon.brand}
                                        </h3>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <Tag size={10} className="text-[#D4AF37]" />
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">
                                                {coupon.category || 'Gift Card'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Status Badge */}
                                <div>
                                    {coupon.status === 'sold' ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase">
                                            Sold
                                        </span>
                                    ) : coupon.status === 'expired' ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 uppercase">
                                            Expired
                                        </span>
                                    ) : coupon.listed_on_marketplace ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Listed
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 uppercase">
                                            Unlisted
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Identifier & Expiry Row */}
                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-white/5 text-slate-500 dark:text-slate-400">
                                <div className="flex items-center gap-1.5 font-mono">
                                    <span>Card {maskedCode}</span>
                                    <button
                                        onClick={() => handleCopyCode(coupon.id, maskedCode)}
                                        aria-label="Copy code"
                                        className="text-slate-400 hover:text-slate-600"
                                    >
                                        {copiedId === coupon.id ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                                    </button>
                                </div>
                                <div>Expires: {formatExpiry(coupon.valid_until)}</div>
                            </div>

                            {/* Value Grid */}
                            <div className="grid grid-cols-3 gap-2 bg-slate-50/70 dark:bg-white/[0.02] p-2.5 rounded-xl border border-slate-200/60 dark:border-white/5 text-center">
                                <div>
                                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Face Value</span>
                                    <span className="text-xs font-black text-slate-900 dark:text-white">
                                        {formatINR((coupon.face_value_paise || 0) / 100)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Your Cost</span>
                                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                                        {formatINR(purchasePrice)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Selling At</span>
                                    {coupon.listed_on_marketplace ? (
                                        <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                                            {formatINR(sellingPrice)}
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-slate-400 italic">Off Market</span>
                                    )}
                                </div>
                            </div>

                            {/* Profit Margin (if listed) */}
                            {coupon.listed_on_marketplace && purchasePrice > 0 && (
                                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-xs">
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Estimated Net Profit</span>
                                    <span className={`font-black flex items-center gap-1 ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                                        {isProfit ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                        {formatINR(profit)} ({((profit / purchasePrice) * 100).toFixed(1)}%)
                                    </span>
                                </div>
                            )}

                            {/* Mobile Actions */}
                            {coupon.status === 'available' && (
                                <div className="flex gap-2 pt-1">
                                    {!coupon.listed_on_marketplace ? (
                                        <button
                                            onClick={() => performAction(() => {
                                                setSelectedCoupon(coupon);
                                                setShowListModal(true);
                                            })}
                                            className="w-full py-2.5 bg-[#D4AF37] hover:bg-[#c9a42f] text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-1.5"
                                        >
                                            <Store size={14} />
                                            <span>List to Market</span>
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => performAction(() => {
                                                    setSelectedCoupon(coupon);
                                                    setShowListModal(true);
                                                })}
                                                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/20"
                                            >
                                                <Edit3 size={13} />
                                                <span>Edit</span>
                                            </button>
                                            <button
                                                onClick={() => setUnlistingCoupon(coupon)}
                                                className="flex-1 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-all border border-slate-200 dark:border-white/10 flex items-center justify-center gap-1.5"
                                            >
                                                <EyeOff size={13} />
                                                <span>Unlist</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* 7. Contextual Empty States */}
            {filteredCoupons.length === 0 && (
                <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-white/10 p-8 sm:p-14 text-center shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center mx-auto mb-4 text-slate-400">
                        <Store size={28} />
                    </div>

                    {/* Preserves heading string for tests */}
                    <h3 className="text-lg sm:text-xl font-bold font-display text-slate-900 dark:text-white mb-1.5">
                        {searchQuery || selectedCategory !== 'all'
                            ? `No cards matching filters`
                            : currentFilter === 'all'
                                ? 'No active coupons found'
                                : currentFilter === 'listed'
                                    ? 'No gift cards are listed'
                                    : currentFilter === 'unlisted'
                                        ? 'No unlisted gift cards'
                                        : 'No sales history found'}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
                        {searchQuery || selectedCategory !== 'all'
                            ? `We couldn't find any cards matching "${searchQuery || selectedCategory}". Try clearing your search or filter criteria.`
                            : currentFilter === 'all'
                                ? 'Your gift-card inventory is empty. Purchased gift cards will appear here.'
                                : currentFilter === 'listed'
                                    ? 'List an eligible gift card to make it available on the marketplace.'
                                    : currentFilter === 'unlisted'
                                        ? 'All your available gift cards are currently active on the marketplace.'
                                        : 'Cards that are sold or redeemed will be archived here.'}
                    </p>

                    {/* Action buttons based on empty context */}
                    {searchQuery || selectedCategory !== 'all' ? (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedCategory('all');
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-colors"
                        >
                            <X size={14} />
                            <span>Clear Filters</span>
                        </button>
                    ) : currentFilter === 'all' ? (
                        <div className="flex flex-wrap items-center justify-center gap-3">
                            <Link
                                href="/merchant/purchase"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-[#D4AF37] hover:bg-[#c9a42f] text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-[#D4AF37]/20"
                            >
                                <ShoppingBag size={15} />
                                <span>Purchase Coupons</span>
                            </Link>
                            <Link
                                href="/merchant/coupons/add"
                                className="inline-flex items-center gap-2 px-5 py-3 border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-800 dark:text-white font-bold rounded-xl text-xs transition-all"
                            >
                                <Plus size={15} className="text-[#D4AF37]" />
                                <span>Add Custom Card</span>
                            </Link>
                        </div>
                    ) : currentFilter === 'listed' ? (
                        <Link
                            href="/merchant/inventory/giftcards?filter=unlisted"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#D4AF37] hover:bg-[#c9a42f] text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all"
                        >
                            <EyeOff size={14} />
                            <span>View Unlisted Cards to List</span>
                        </Link>
                    ) : null}
                </div>
            )}

            {/* 8. Listing / Pricing Modal */}
            {showListModal && selectedCoupon && (
                <ListToMarketplace
                    coupon={selectedCoupon}
                    onClose={() => {
                        setShowListModal(false);
                        setSelectedCoupon(null);
                    }}
                    onSuccess={handleListSuccess}
                />
            )}

            {/* 9. Accessible Unlist Confirmation Dialog */}
            {unlistingCoupon && (
                <div 
                    className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="unlist-dialog-title"
                >
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <EyeOff size={22} />
                        </div>
                        <div>
                            <h3 id="unlist-dialog-title" className="text-lg font-bold text-slate-900 dark:text-white">
                                Remove from Marketplace?
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {unlistingCoupon.brand} gift card ({formatINR((unlistingCoupon.face_value_paise || 0) / 100)}) will no longer be visible to buyers on the marketplace. You can relist it anytime.
                            </p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setUnlistingCoupon(null)}
                                disabled={isUnlisting}
                                className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmUnlist}
                                disabled={isUnlisting}
                                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-rose-500/20 flex items-center justify-center gap-2"
                            >
                                {isUnlisting ? (
                                    <>
                                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Removing...</span>
                                    </>
                                ) : (
                                    <span>Remove Listing</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
