'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
    Calendar as CalendarIcon, 
    Sparkles, 
    Check, 
    CheckCircle2, 
    AlertCircle, 
    Wallet, 
    CreditCard, 
    Store, 
    ArrowLeft, 
    ChevronRight, 
    ChevronLeft,
    GripVertical,
    Eye, 
    ShoppingBag, 
    Receipt, 
    Printer, 
    Download, 
    ShieldCheck, 
    Layers,
    FileText,
    Search,
    X,
    Plus,
    ExternalLink
} from 'lucide-react';
import MarketingBreadcrumbs from '@/components/marketing/layout/MarketingBreadcrumbs';
import dynamic from 'next/dynamic';
import GuideInfoButton from '@/components/common/GuideInfoButton';

const SabpaisaPaymentModal = dynamic(() => import('@/components/payment/SabpaisaPaymentModal'), { ssr: false });
const SponsorshipCelebrationModal = dynamic(() => import('@/components/marketing/animations/SponsorshipCelebrationModal'), { ssr: false });
const SponsorshipGstInvoiceModal = dynamic(() => import('@/components/marketing/sponsor/SponsorshipGstInvoiceModal'), { ssr: false });

export default function DailyChallengeSponsorClient({
    user,
    profile,
    merchant,
    walletBalancePaise = null,
    merchantInventory = [],
    existingSponsorships = [],
    rewardsConfig = {}
}) {
    const activeWalletPaise = walletBalancePaise !== null
        ? walletBalancePaise 
        : (merchant?.wallet_balance_paise ?? Math.round((profile?.wallet_balance || 0) * 100));
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [campaignMessage, setCampaignMessage] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('wallet'); // 'wallet' | 'sabpaisa'
    const [showSabpaisaModal, setShowSabpaisaModal] = useState(false);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingError, setBookingError] = useState(null);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [activeInvoice, setActiveInvoice] = useState(null);
    const [showCelebration, setShowCelebration] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();

    // Re-sync sponsorships if user returned from gateway redirect
    useEffect(() => {
        if (searchParams.get('booked') === 'true') {
            setBookingSuccess(true);
            router.refresh();
        }
    }, [searchParams, router]);

    // Product search & category filters for merchant inventory
    const [productSearch, setProductSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [subCategoryFilter, setSubCategoryFilter] = useState('all');
    const [pageSize, setPageSize] = useState(12);

    // Dynamic category pills
    const inventoryCategories = useMemo(() => {
        const cats = new Set();
        merchantInventory.forEach(item => {
            if (item.category) cats.add(item.category);
        });
        return ['all', ...Array.from(cats).sort()];
    }, [merchantInventory]);

    // Dynamic sub-category options (filtered by active category)
    const inventorySubCategories = useMemo(() => {
        const subCats = new Set();
        merchantInventory.forEach(item => {
            if (item.sub_category) {
                if (categoryFilter === 'all' || item.category === categoryFilter) {
                    subCats.add(item.sub_category);
                }
            }
        });
        return Array.from(subCats).sort();
    }, [merchantInventory, categoryFilter]);

    // Live search & category filtered inventory
    const filteredInventory = useMemo(() => {
        return merchantInventory.filter(item => {
            const q = productSearch.trim().toLowerCase();
            const matchesQuery = !q || 
                (item.product_name && item.product_name.toLowerCase().includes(q)) ||
                (item.category && item.category.toLowerCase().includes(q)) ||
                (item.sub_category && item.sub_category.toLowerCase().includes(q));
            const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;
            const matchesSubCat = subCategoryFilter === 'all' || item.sub_category === subCategoryFilter;
            return matchesQuery && matchesCat && matchesSubCat;
        });
    }, [merchantInventory, productSearch, categoryFilter, subCategoryFilter]);

    // Production-ready pagination
    const [currentPage, setCurrentPage] = useState(1);

    // Reset pagination when search or category filter changes (deferred: no sync setState in effect)
    useEffect(() => {
        const t = setTimeout(() => setCurrentPage(1), 0);
        return () => clearTimeout(t);
    }, [productSearch, categoryFilter, subCategoryFilter, pageSize]);

    const totalPages = Math.max(1, Math.ceil(filteredInventory.length / pageSize));
    const paginatedInventory = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredInventory.slice(start, start + pageSize);
    }, [filteredInventory, currentPage, pageSize]);

    // Billboard slots drag-and-drop & position swap
    const [draggedSlot, setDraggedSlot] = useState(null);

    const moveSlotLeft = (idx) => {
        if (idx <= 0) return;
        setSelectedProducts(prev => {
            const next = [...prev];
            const temp = next[idx];
            next[idx] = next[idx - 1];
            next[idx - 1] = temp;
            return next;
        });
    };

    const moveSlotRight = (idx) => {
        if (idx >= selectedProducts.length - 1) return;
        setSelectedProducts(prev => {
            const next = [...prev];
            const temp = next[idx];
            next[idx] = next[idx + 1];
            next[idx + 1] = temp;
            return next;
        });
    };

    const handleDragStart = (e, index) => {
        setDraggedSlot(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, dropIndex) => {
        e.preventDefault();
        if (draggedSlot === null || draggedSlot === dropIndex) return;
        setSelectedProducts(prev => {
            const next = [...prev];
            const item = next.splice(draggedSlot, 1)[0];
            next.splice(dropIndex, 0, item);
            return next;
        });
        setDraggedSlot(null);
    };

    // Dynamic fee calculations
    const baseFee = (rewardsConfig?.sponsorship_fee_paise || 99900) / 100;
    const cgst = baseFee * 0.09;
    const sgst = baseFee * 0.09;
    const totalPayable = baseFee + cgst + sgst;

    // 14-day calendar strip strictly pinned to Indian Standard Time (UTC+5:30)
    const calendarDays = useMemo(() => {
        const days = [];
        // Compute current IST time
        const now = new Date();
        const istOffsetMs = 5.5 * 60 * 60 * 1000;
        const istNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istOffsetMs);

        for (let i = 1; i <= 14; i++) {
            const d = new Date(istNow);
            d.setDate(istNow.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const booking = existingSponsorships.find(b => b.sponsor_date === dateStr && b.status !== 'cancelled');
            
            days.push({
                date: d,
                dateStr,
                dayName: d.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' }),
                dayNum: d.getDate(),
                monthName: d.toLocaleDateString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' }),
                status: booking ? (booking.merchant_id === merchant?.id ? 'my_booking' : 'booked') : 'available'
            });
        }
        return days;
    }, [existingSponsorships, merchant?.id]);

    const handleBookSponsorship = async () => {
        if (bookingLoading) return;
        if (!selectedDate) {
            setBookingError('Please select an available date on the calendar.');
            return;
        }
        if (selectedDate.status && selectedDate.status !== 'available') {
            setBookingError('This date is already booked. Please pick another available date.');
            return;
        }
        if (selectedProducts.length === 0) {
            setBookingError('Please select at least 1 product from your store inventory.');
            return;
        }

        if (paymentMethod === 'sabpaisa') {
            setShowSabpaisaModal(true);
            return;
        }

        // Wallet balance check (total with GST in paise)
        const totalPaise = Math.round(totalPayable * 100);
        const currentBalPaise = activeWalletPaise || 0;
        if (currentBalPaise < totalPaise) {
            setBookingError(`Insufficient InTrust wallet balance (₹${(currentBalPaise/100).toFixed(2)}). Please choose SabPaisa Gateway or top up your wallet.`);
            return;
        }

        setBookingLoading(true);
        setBookingError(null);
        try {
            const res = await fetch('/api/marketing/sponsor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sponsorDate: selectedDate.dateStr,
                    productIds: selectedProducts.map(p => p.id),
                    campaignMessage: campaignMessage.trim(),
                    paymentMethod: 'wallet',
                    merchantId: merchant?.id
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                setBookingError(data.error || 'Failed to complete sponsorship booking.');
            } else {
                setBookingSuccess(true);
                setShowCelebration(true);
                router.refresh();
                if (data.invoice) {
                    setActiveInvoice(data.invoice);
                } else {
                    setActiveInvoice({
                        invoiceNumber: `INV-MKT-${selectedDate.dateStr.replace(/-/g,'')}-SPON`,
                        invoiceDate: new Date().toISOString(),
                        serviceDate: selectedDate.dateStr,
                        sacCode: '998365',
                        serviceDescription: 'Daily Challenge Prime Placement & Sponsored Catalog Showcase (24 Hours)',
                        merchantName: merchant?.business_name,
                        baseFeeRupees: baseFee,
                        cgstRupees: cgst,
                        sgstRupees: sgst,
                        totalRupees: totalPayable,
                        paymentMethod: 'wallet',
                        status: 'PAID'
                    });
                }
            }
        } catch (e) {
            console.error('Error booking sponsorship:', e);
            setBookingError('A network error occurred. Please try again.');
        } finally {
            setBookingLoading(false);
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6 lg:space-y-7 animate-fadeIn">
            {/* Top Bar with Breadcrumbs, guide & Segmented Role Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3 sm:pb-4">
                <div className="flex items-start justify-between gap-3 flex-1 min-w-0">
                    <MarketingBreadcrumbs
                        customTitle="Daily Challenge & Quiz"
                        customSubtitle="Test your knowledge, earn instant cashbacks, and discover featured local merchants."
                        className="flex-1 min-w-0"
                    />
                    <GuideInfoButton pageKey="/marketing/daily-challenge" scope="marketing" className="mt-1 shrink-0" />
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shrink-0 self-start sm:self-auto">
                    <Link
                        href="/marketing/daily-challenge"
                        className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                        <span>🎮 Play Challenge</span>
                    </Link>
                    <span className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs flex items-center gap-1.5">
                        <Store size={13} className="text-amber-600" />
                        <span>⭐ Book Slot</span>
                    </span>
                    <Link
                        href="/marketing/daily-challenge/sponsor/history"
                        className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                        <Receipt size={13} className="text-blue-600" />
                        <span>📜 My History</span>
                    </Link>
                </div>
            </div>

            {/* CLEAN COMPACT HERO BANNER */}
            <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-amber-50/90 via-white to-orange-50/80 border border-amber-200/90 p-4 sm:p-5 text-slate-950 shadow-xs relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="max-w-xl">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                            <Link 
                                href="/marketing/daily-challenge" 
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 hover:bg-white text-[11px] font-bold text-slate-700 hover:text-slate-950 border border-slate-200/70 transition-colors shadow-2xs"
                            >
                                <ArrowLeft size={12} />
                                <span>Play Challenge</span>
                            </Link>
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider border border-amber-300">
                                ⭐ Merchant Billboard
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider border border-emerald-300">
                                Tax Invoice Included
                            </span>
                        </div>
                        <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-slate-950 leading-snug">
                            Sponsor the InTrust Daily Challenge
                        </h1>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">
                            Lock in a 24-hour exclusive billboard to showcase your local store and up to 4 featured products to thousands of active quiz players.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
                        <div className="bg-white/95 rounded-2xl p-3 sm:p-4 border border-amber-200/80 shadow-2xs text-center min-w-[170px]">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                                24h Sponsorship
                            </span>
                            <div className="flex items-baseline justify-center gap-1 my-0.5">
                                <span className="text-xl sm:text-2xl font-black text-slate-950">
                                    ₹{totalPayable.toFixed(0)}
                                </span>
                                <span className="text-[10px] font-bold text-slate-500">all-inclusive</span>
                            </div>
                            <span className="text-[10px] text-emerald-700 block font-black">
                                Includes Applicable Taxes
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT WORKSPACE */}
            {bookingSuccess ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-md text-center max-w-xl mx-auto space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                        <CheckCircle2 size={36} />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        Sponsorship Confirmed!
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                        Your store <strong className="text-slate-900 dark:text-white">{merchant?.business_name}</strong> and {selectedProducts.length} products will be exclusively promoted on <strong>{selectedDate?.dayNum} {selectedDate?.monthName}</strong>.
                    </p>

                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button
                            onClick={() => setActiveInvoice(activeInvoice)}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                        >
                            <Receipt size={15} />
                            <span>View / Download Invoice</span>
                        </button>
                        <button
                            onClick={() => {
                                setBookingSuccess(false);
                                setSelectedDate(null);
                                setSelectedProducts([]);
                            }}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors"
                        >
                            Book Another Date
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
                    {/* Left 2 Cols: Step-by-Step Sponsorship Form */}
                    <div className="lg:col-span-2 space-y-4 sm:space-y-5">
                        {/* Step 1: Select Date */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                                        1
                                    </div>
                                    <div>
                                        <h3 className="font-black text-sm text-slate-900 dark:text-white leading-none">
                                            Choose Sponsorship Date
                                        </h3>
                                        <span className="text-[10px] font-medium text-slate-500 block mt-0.5">
                                            Select an open date slot across the upcoming 14 days
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500 self-start sm:self-auto">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Available
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-slate-400" /> Booked
                                    </span>
                                </div>
                            </div>

                            {/* Clean Compact Responsive Grid (2-col mobile, 4-col tablet, 7-col desktop) */}
                            <div className="grid grid-cols-2 xs:grid-cols-4 sm:grid-cols-7 gap-2">
                                {calendarDays.map((day, idx) => {
                                    const isSelected = selectedDate?.dateStr === day.dateStr;
                                    const isAvailable = day.status === 'available';
                                    const isFirstAvailable = isAvailable && !calendarDays.slice(0, idx).some(d => d.status === 'available');

                                    return (
                                        <button
                                            key={day.dateStr}
                                            type="button"
                                            disabled={!isAvailable}
                                            onClick={() => setSelectedDate(day)}
                                            className={`p-2 sm:p-2.5 rounded-xl border text-center transition-all relative flex flex-col items-center justify-between min-h-[76px] cursor-pointer ${
                                                isSelected
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 ring-2 ring-blue-500/20'
                                                    : isAvailable
                                                    ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-blue-400 text-slate-900 dark:text-slate-100 hover:bg-blue-50/40'
                                                    : 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800/80 text-slate-400 cursor-not-allowed opacity-50'
                                            }`}
                                        >
                                            {isFirstAvailable && !isSelected && (
                                                <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[8px] font-black uppercase tracking-wider shadow-xs whitespace-nowrap">
                                                    Next Slot
                                                </span>
                                            )}

                                            <span className={`text-[9px] font-black uppercase block ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                                {day.dayName}
                                            </span>
                                            <span className="text-lg font-black my-0.5 block leading-none">
                                                {day.dayNum}
                                            </span>
                                            <span className={`text-[9px] font-bold block ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                                                {day.monthName}
                                            </span>
                                            <span className={`text-[8px] font-black uppercase mt-1 px-1.5 py-0.2 rounded-full block ${
                                                isSelected
                                                    ? 'bg-white/20 text-white'
                                                    : isAvailable
                                                    ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50'
                                                    : 'text-slate-400'
                                            }`}>
                                                {isSelected ? '✓ Selected' : isAvailable ? 'Open' : 'Booked'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {selectedDate && (
                                <div className="mt-3 p-2.5 rounded-xl bg-blue-50/80 border border-blue-200 text-xs font-bold text-blue-950 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <CalendarIcon size={14} className="text-blue-600 shrink-0" />
                                        <span>
                                            Selected Date: <strong className="font-black text-blue-900">{selectedDate.dayName}, {selectedDate.dayNum} {selectedDate.monthName}</strong>
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                                        Exclusive 24h Slot
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Step 2: Select Up to 4 Store Products */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                                        2
                                    </div>
                                    <div>
                                        <h3 className="font-black text-sm text-slate-900 dark:text-white leading-none">
                                            Select Store Products to Market
                                        </h3>
                                        <span className="text-[10px] font-medium text-slate-500 block mt-0.5">
                                            Choose 1 to 4 products from your store to feature in the daily challenge
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 self-start sm:self-auto">
                                    <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                                        selectedProducts.length === 4
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : selectedProducts.length > 0
                                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                                            : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}>
                                        {selectedProducts.length}/4 Selected
                                    </span>
                                    {selectedProducts.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setSelectedProducts([])}
                                            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                                        >
                                            Clear All
                                        </button>
                                    )}
                                    <Link
                                        href="/merchant/shopping/inventory"
                                        target="_blank"
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer ml-1"
                                    >
                                        <Plus size={12} />
                                        <span>Add Products</span>
                                        <ExternalLink size={10} />
                                    </Link>
                                </div>
                            </div>

                            {/* Visual Selected Products Shelf (4 Interactive Slots with Drag & Position Swap) */}
                            <div className="mb-3.5 p-3 sm:p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                            Billboard Showcase Slots (1 – 4)
                                        </span>
                                        <span className="text-[9px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                            Reorderable
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500">
                                        Drag cards or use ◀ / ▶ arrows to set display sequence
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                                    {[0, 1, 2, 3].map((slotIdx) => {
                                        const prod = selectedProducts[slotIdx];
                                        if (prod) {
                                            return (
                                                <div
                                                    key={prod.id || slotIdx}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, slotIdx)}
                                                    onDragOver={(e) => handleDragOver(e, slotIdx)}
                                                    onDrop={(e) => handleDrop(e, slotIdx)}
                                                    className={`p-2.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-blue-500 shadow-xs relative flex flex-col justify-between gap-2 transition-all select-none ${
                                                        draggedSlot === slotIdx ? 'opacity-40 border-dashed' : 'hover:shadow-md'
                                                    }`}
                                                >
                                                    {/* Top Meta Bar with Slot # & Reordering Arrows */}
                                                    <div className="flex items-center justify-between gap-1 pb-1 border-b border-slate-100 dark:border-slate-700">
                                                        <div className="flex items-center gap-1">
                                                            <GripVertical size={13} className="text-slate-400 cursor-grab" />
                                                            <span className={`text-[10px] font-black uppercase px-1.5 py-0.2 rounded ${
                                                                slotIdx === 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-700'
                                                            }`}>
                                                                #{slotIdx + 1} {slotIdx === 0 ? '• First Slide' : ''}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                disabled={slotIdx === 0}
                                                                onClick={() => moveSlotLeft(slotIdx)}
                                                                className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 flex items-center justify-center text-[10px] cursor-pointer"
                                                                title="Move Earlier"
                                                            >
                                                                ◀
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={slotIdx >= selectedProducts.length - 1}
                                                                onClick={() => moveSlotRight(slotIdx)}
                                                                className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 flex items-center justify-center text-[10px] cursor-pointer"
                                                                title="Move Later"
                                                            >
                                                                ▶
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedProducts(prev => prev.filter((_, i) => i !== slotIdx))}
                                                                className="w-5 h-5 rounded-full bg-slate-100 hover:bg-rose-500 hover:text-white text-slate-500 flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-1"
                                                                title="Remove slot"
                                                            >
                                                                <X size={10} strokeWidth={3} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Product Info & Thumbnail */}
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                                                            <img
                                                                src={prod.image_url || '/icons/intrustLogo.png'}
                                                                alt={prod.product_name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <span className="text-xs font-black text-slate-900 dark:text-white truncate block">
                                                                {prod.product_name}
                                                            </span>
                                                            <span className="text-[11px] font-black text-emerald-600">
                                                                ₹{prod.price}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div
                                                key={slotIdx}
                                                onDragOver={(e) => handleDragOver(e, slotIdx)}
                                                onDrop={(e) => handleDrop(e, slotIdx)}
                                                className="p-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center text-[10px] font-bold text-slate-400 min-h-[88px] bg-slate-50/50"
                                            >
                                                <span className="font-black text-slate-500">Slot #{slotIdx + 1}</span>
                                                <span className="text-[9px] text-slate-400 mt-0.5">Click any item below</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Search & Filter Bar */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-3">
                                <div className="relative w-full flex-1">
                                    <Search size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Search your products by title or category..."
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                        className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white"
                                    />
                                    {productSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setProductSearch('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                        >
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>

                                {inventorySubCategories.length > 0 && (
                                    <select
                                        value={subCategoryFilter}
                                        onChange={(e) => setSubCategoryFilter(e.target.value)}
                                        className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
                                    >
                                        <option value="all">📂 All Sub-Categories</option>
                                        {inventorySubCategories.map(sc => (
                                            <option key={sc} value={sc}>{sc}</option>
                                        ))}
                                    </select>
                                )}

                                <select
                                    value={pageSize}
                                    onChange={(e) => setPageSize(Number(e.target.value))}
                                    className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
                                >
                                    <option value={12}>12 / page</option>
                                    <option value={24}>24 / page</option>
                                </select>
                            </div>

                            {/* Category Filter Pills */}
                            {inventoryCategories.length > 2 && (
                                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full py-1 mb-2">
                                    {inventoryCategories.map(cat => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => {
                                                setCategoryFilter(cat);
                                                setSubCategoryFilter('all');
                                            }}
                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition-all cursor-pointer ${
                                                categoryFilter === cat
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                            }`}
                                        >
                                            {cat === 'all' ? 'All' : cat}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Catalog Status & Count Bar */}
                            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                                <span>
                                    Showing {paginatedInventory.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filteredInventory.length)} of {filteredInventory.length} products
                                </span>
                                <span className="text-[11px] text-slate-400">
                                    ({merchantInventory.length} total in store)
                                </span>
                            </div>

                            {/* Products Grid (Paginated) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1">
                                {paginatedInventory.length === 0 ? (
                                    <div className="col-span-full py-8 text-center text-xs text-slate-500">
                                        No products matched &quot;{productSearch}&quot;.
                                        <button
                                            type="button"
                                            onClick={() => { setProductSearch(''); setCategoryFilter('all'); }}
                                            className="block mx-auto mt-1 text-blue-600 font-bold hover:underline cursor-pointer"
                                        >
                                            Reset filters
                                        </button>
                                    </div>
                                ) : (
                                    paginatedInventory.map((item) => {
                                        const isPicked = selectedProducts.some(p => p.id === item.id);
                                        const isMaxReached = selectedProducts.length >= 4 && !isPicked;

                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => {
                                                    if (isPicked) {
                                                        setSelectedProducts(prev => prev.filter(p => p.id !== item.id));
                                                    } else if (selectedProducts.length < 4) {
                                                        setSelectedProducts(prev => [...prev, item]);
                                                    }
                                                }}
                                                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                                    isPicked
                                                        ? 'bg-blue-50/90 dark:bg-blue-950/60 border-blue-500 ring-1 ring-blue-500/20'
                                                        : isMaxReached
                                                        ? 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 opacity-60 cursor-not-allowed'
                                                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                                                        <img
                                                            src={item.image_url || '/icons/intrustLogo.png'}
                                                            alt={item.product_name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                                                            {item.product_name || 'Store Product'}
                                                        </span>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[10px] font-black text-emerald-600">
                                                                ₹{item.price}
                                                            </span>
                                                            <span className="text-[9px] font-semibold text-slate-400 truncate">
                                                                • {item.category || 'Store Item'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center text-xs transition-all ${
                                                        isPicked 
                                                            ? 'bg-blue-600 text-white shadow-2xs' 
                                                            : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                                                    }`}>
                                                        {isPicked && <Check size={12} strokeWidth={3} />}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 mt-3">
                                    <button
                                        type="button"
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        ◀ Previous
                                    </button>

                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                            <button
                                                key={page}
                                                type="button"
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-7 h-7 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                                    currentPage === page
                                                        ? 'bg-blue-600 text-white shadow-2xs'
                                                        : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-400'
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        Next ▶
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Step 3: Tagline & Message */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                                    3
                                </div>
                                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                                    Store Tagline / Promotional Message
                                </h3>
                            </div>
                            <textarea
                                value={campaignMessage}
                                onChange={(e) => setCampaignMessage(e.target.value)}
                                placeholder="e.g. Discover our pure certified essentials & exclusive festival discounts!"
                                rows={2}
                                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/30 text-slate-900 dark:text-white"
                            />
                        </div>

                        {/* LIVE PREVIEW SIMULATOR */}
                        <div className="bg-gradient-to-r from-blue-50/60 to-indigo-50/60 dark:from-slate-900 dark:to-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-blue-200/60 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Eye size={15} className="text-blue-600 dark:text-blue-400" />
                                    <h4 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                                        Live Daily Arena Billboard Preview
                                    </h4>
                                </div>
                                <span className="text-[10px] font-bold text-slate-500">
                                    How players will view your store
                                </span>
                            </div>

                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs">
                                <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-300 flex items-center justify-center text-amber-600 shrink-0">
                                            <Store size={14} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[9px] font-black uppercase text-amber-700 tracking-wider">Today&apos;s Sponsor</span>
                                                <span className="text-[8px] font-black text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded-full border border-emerald-200">
                                                    ✓ Verified
                                                </span>
                                            </div>
                                            <span className="font-black text-xs text-slate-900 dark:text-white truncate block">
                                                {merchant?.business_name || 'Your Business Name'}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-blue-600 shrink-0">
                                        Featured Store
                                    </span>
                                </div>

                                <p className="text-xs text-slate-600 dark:text-slate-300 italic mb-3">
                                    &quot;{campaignMessage || 'Proudly powering today&apos;s trivia challenge! Discover our store specials below.'}&quot;
                                </p>

                                {selectedProducts.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {selectedProducts.map((p, i) => (
                                            <div key={i} className="bg-slate-50 dark:bg-slate-900 p-2 rounded-xl text-center border border-slate-200/60 dark:border-slate-800 flex flex-col items-center justify-between">
                                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-slate-200 mb-1">
                                                    <img src={p.image_url || '/icons/intrustLogo.png'} alt="" className="w-full h-full object-cover" />
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 block truncate w-full">{p.product_name}</span>
                                                <span className="text-xs font-black text-emerald-600 block mt-0.5">₹{p.price}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-3 text-center text-xs text-slate-400 font-semibold border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                                        Select products above to preview your catalog placement.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Pricing & Tax Breakdown Card */}
                    <div className="space-y-4 sm:space-y-5">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs sticky top-20">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                Tax Invoice & Payment
                            </span>
                            <h3 className="text-base font-black text-slate-900 dark:text-white mt-2 mb-3">
                                Sponsorship Summary
                            </h3>

                            {/* Line items */}
                            <div className="space-y-2.5 pb-3 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                                <div className="flex justify-between">
                                    <span>Target Date</span>
                                    <span className="font-bold text-slate-900 dark:text-white">
                                        {selectedDate ? `${selectedDate.dayNum} ${selectedDate.monthName}` : 'Select a date'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Products Showcased</span>
                                    <span className="font-bold text-slate-900 dark:text-white">
                                        {selectedProducts.length} Items
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>SAC Code</span>
                                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                        998365
                                    </span>
                                </div>
                            </div>

                            {/* Price Breakdown */}
                            <div className="py-3 space-y-2 text-xs border-b border-slate-100 dark:border-slate-800">
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                    <span>Base Fee</span>
                                    <span className="font-mono font-bold text-slate-900 dark:text-white">₹{baseFee.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                    <span>Applicable Taxes (GST 18%)</span>
                                    <span className="font-mono font-bold text-slate-900 dark:text-white">₹{(cgst + sgst).toFixed(2)}</span>
                                </div>
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-baseline">
                                    <span className="font-black text-sm text-slate-900 dark:text-white">Total Payable</span>
                                    <span className="font-mono font-black text-lg text-blue-600 dark:text-blue-400">₹{totalPayable.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Payment Options */}
                            <div className="pt-3 pb-3 space-y-2">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                                    Payment Method
                                </span>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('wallet')}
                                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                                            paymentMethod === 'wallet'
                                                ? 'bg-blue-50/80 dark:bg-blue-950/60 border-blue-500 ring-1 ring-blue-500/40'
                                                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between w-full mb-1">
                                            <Wallet size={14} className={paymentMethod === 'wallet' ? 'text-blue-600' : 'text-slate-400'} />
                                            {paymentMethod === 'wallet' && <Check size={12} className="text-blue-600" />}
                                        </div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white">InTrust Wallet</span>
                                        <span className="text-[10px] font-bold text-slate-500 mt-0.5 truncate">
                                            ₹{((activeWalletPaise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('sabpaisa')}
                                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                                            paymentMethod === 'sabpaisa'
                                                ? 'bg-blue-50/80 dark:bg-blue-950/60 border-blue-500 ring-1 ring-blue-500/40'
                                                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between w-full mb-1">
                                            <CreditCard size={14} className={paymentMethod === 'sabpaisa' ? 'text-blue-600' : 'text-slate-400'} />
                                            {paymentMethod === 'sabpaisa' && <Check size={12} className="text-blue-600" />}
                                        </div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white">SabPaisa PG</span>
                                        <span className="text-[10px] font-bold text-slate-500 mt-0.5 truncate">UPI, Cards</span>
                                    </button>
                                </div>
                            </div>

                            {bookingError && (
                                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 text-xs font-semibold mb-3 flex items-center gap-2">
                                    <AlertCircle size={14} className="shrink-0" />
                                    <span>{bookingError}</span>
                                </div>
                            )}

                            <button
                                disabled={bookingLoading}
                                onClick={handleBookSponsorship}
                                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/25 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                            >
                                {bookingLoading ? 'Processing Booking...' : `Pay ₹${totalPayable.toFixed(2)} & Confirm Booking →`}
                            </button>

                            <p className="text-[10px] text-slate-400 text-center mt-3 flex items-center justify-center gap-1">
                                <ShieldCheck size={12} className="text-emerald-500" />
                                <span>Official tax invoice with ITC provided upon booking confirmation.</span>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* GST INVOICE MODAL */}
            {activeInvoice && (
                <SponsorshipGstInvoiceModal
                    invoice={activeInvoice}
                    merchant={merchant}
                    onClose={() => setActiveInvoice(null)}
                />
            )}

            {/* SABPAISA MODAL */}
            {showSabpaisaModal && (
                <SabpaisaPaymentModal
                    isOpen={showSabpaisaModal}
                    onClose={() => setShowSabpaisaModal(false)}
                    amount={totalPayable}
                    purpose="DAILY_CHALLENGE_SPONSORSHIP"
                    metadata={{
                        type: 'daily_challenge_sponsorship',
                        sponsorDate: selectedDate?.dateStr,
                        merchantId: merchant?.id,
                        productIds: selectedProducts.map(p => p.id),
                        campaignMessage,
                        baseFee,
                        cgst,
                        sgst,
                        totalPayable
                    }}
                    onSuccess={async (txn) => {
                        setShowSabpaisaModal(false);
                        setBookingLoading(true);
                        setBookingError(null);
                        try {
                            const res = await fetch('/api/marketing/sponsor', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    sponsorDate: selectedDate?.dateStr,
                                    productIds: selectedProducts.map(p => p.id),
                                    campaignMessage: campaignMessage.trim(),
                                    paymentMethod: 'sabpaisa',
                                    clientTxnId: txn?.clientTxnId || txn?.txnId || null
                                })
                            });

                            const data = await res.json();
                            if (!res.ok || !data.success) {
                                setBookingError(data.error || 'Payment succeeded with gateway, but registering booking encountered an issue. Please contact support.');
                            } else {
                                setBookingSuccess(true);
                                setShowCelebration(true);
                                router.refresh();
                                if (data.invoice) {
                                    setActiveInvoice(data.invoice);
                                } else {
                                    setActiveInvoice({
                                        invoiceNumber: `INV-MKT-${selectedDate?.dateStr?.replace(/-/g,'')}-${(data.bookingId || txn?.clientTxnId || 'SPN').slice(0,6).toUpperCase()}`,
                                        invoiceDate: new Date().toISOString(),
                                        serviceDate: selectedDate?.dateStr,
                                        sacCode: '998365',
                                        serviceDescription: 'Daily Challenge Prime Placement & Sponsored Catalog Showcase (24 Hours)',
                                        merchantName: merchant?.business_name,
                                        baseFeeRupees: baseFee,
                                        cgstRupees: cgst,
                                        sgstRupees: sgst,
                                        totalRupees: totalPayable,
                                        paymentMethod: 'sabpaisa',
                                        status: 'PAID'
                                    });
                                }
                            }
                        } catch (err) {
                            console.error('Error saving SabPaisa sponsorship booking:', err);
                            setBookingError('Payment succeeded with gateway, but registering booking encountered an issue. Please reach out to support.');
                        } finally {
                            setBookingLoading(false);
                        }
                    }}
                />
            )}
        </div>
    );
}
