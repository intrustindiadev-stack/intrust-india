'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
    Calendar as CalendarIcon, 
    Sparkles, 
    Check, 
    CheckCircle2, 
    AlertCircle, 
    Store, 
    ArrowLeft, 
    ChevronRight, 
    Receipt, 
    Plus,
    Clock,
    ShoppingBag,
    Filter,
    Layers,
    Tag,
    ExternalLink
} from 'lucide-react';
import MarketingBreadcrumbs from '@/components/marketing/layout/MarketingBreadcrumbs';
import SponsorshipGstInvoiceModal from '@/components/marketing/sponsor/SponsorshipGstInvoiceModal';

export default function SponsorshipHistoryClient({
    user,
    profile,
    merchant,
    bookings = [],
    todayIST
}) {
    const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'active' | 'completed'
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    // Filter bookings
    const filteredBookings = useMemo(() => {
        if (activeFilter === 'active') {
            return bookings.filter(b => b.status === 'live' || b.status === 'upcoming');
        }
        if (activeFilter === 'completed') {
            return bookings.filter(b => b.status === 'completed');
        }
        return bookings;
    }, [bookings, activeFilter]);

    // Counts
    const activeCount = useMemo(() => {
        return bookings.filter(b => b.status === 'live' || b.status === 'upcoming').length;
    }, [bookings]);

    const completedCount = useMemo(() => {
        return bookings.filter(b => b.status === 'completed').length;
    }, [bookings]);

    const totalSpent = useMemo(() => {
        return bookings.reduce((sum, b) => sum + (b.totalRupees || 0), 0);
    }, [bookings]);

    return (
        <div className="space-y-4 sm:space-y-6 lg:space-y-7 animate-fadeIn">
            {/* Top Bar with Breadcrumbs & Navigation Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3 sm:pb-4">
                <MarketingBreadcrumbs
                    customTitle="Sponsorship History & Invoices"
                    customSubtitle="Track your historical daily challenge billboard promotions, featured products, and verified GST tax invoices."
                />

                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shrink-0 self-start sm:self-auto">
                    <Link
                        href="/marketing/daily-challenge"
                        className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                        <span>🎮 Play Challenge</span>
                    </Link>
                    <Link
                        href="/marketing/daily-challenge/sponsor"
                        className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                        <Store size={13} className="text-amber-600" />
                        <span>⭐ Book Slot</span>
                    </Link>
                    <span className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs flex items-center gap-1.5">
                        <Receipt size={13} className="text-blue-600" />
                        <span>📜 My History</span>
                    </span>
                </div>
            </div>

            {/* Merchant Identity Card with Brand Avatar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                        {profile?.avatar_url ? (
                            <Image
                                src={profile.avatar_url}
                                alt={merchant?.store_name || merchant?.business_name || "Merchant"}
                                fill
                                sizes="48px"
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm">
                                {(merchant?.store_name || merchant?.business_name || 'MB').slice(0, 2).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                                {merchant?.store_name || merchant?.business_name}
                            </h2>
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200/80 dark:border-blue-800">
                                <svg className="w-2.5 h-2.5 text-blue-600 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                                <span>Verified Partner</span>
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                            {merchant?.city && <span>📍 {merchant.city}</span>}
                            {merchant?.business_phone && <span>📞 {merchant.business_phone}</span>}
                            {merchant?.gstin && <span className="font-mono text-[11px] text-slate-400">GST: {merchant.gstin}</span>}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Link
                        href="/marketing/daily-challenge"
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1"
                    >
                        <ExternalLink size={12} />
                        <span>Live Billboard</span>
                    </Link>
                </div>
            </div>

            {/* SUMMARY STATS BAR */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Sponsorships</span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 block leading-tight">
                        {bookings.length}
                    </span>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">Active / Upcoming</span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-600 mt-1 block leading-tight">
                        {activeCount}
                    </span>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Completed</span>
                    <span className="text-xl sm:text-2xl font-black text-slate-700 dark:text-slate-300 mt-1 block leading-tight">
                        {completedCount}
                    </span>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 block">Total Invested</span>
                    <span className="text-xl sm:text-2xl font-black text-blue-600 mt-1 block leading-tight">
                        ₹{totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                </div>
            </div>

            {/* FILTER PILLS */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setActiveFilter('all')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            activeFilter === 'all'
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        All Bookings ({bookings.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveFilter('active')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            activeFilter === 'active'
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        Active & Upcoming ({activeCount})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveFilter('completed')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            activeFilter === 'completed'
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        Completed ({completedCount})
                    </button>
                </div>

                <Link
                    href="/marketing/daily-challenge/sponsor"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition-all shadow-xs active:scale-95"
                >
                    <Plus size={14} />
                    <span>Book New Slot</span>
                </Link>
            </div>

            {/* BOOKINGS LIST */}
            {filteredBookings.length === 0 ? (
                <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-3 shadow-2xs">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 mx-auto flex items-center justify-center">
                        <Store size={26} />
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        No Sponsorships in This Category
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                        Promote your store catalog to daily trivia players across India. Secure your exclusive 24-hour prime billboard placement with verified GST tax invoice.
                    </p>
                    <div className="pt-2">
                        <Link
                            href="/marketing/daily-challenge/sponsor"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/25 transition-all"
                        >
                            <span>Book Sponsorship Now</span>
                            <ChevronRight size={14} />
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredBookings.map((booking) => {
                        const isLive = booking.status === 'live';
                        const isUpcoming = booking.status === 'upcoming';
                        const dateObj = new Date(booking.sponsorDate + 'T00:00:00+05:30');
                        const formattedDate = dateObj.toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                        });

                        return (
                            <div
                                key={booking.id}
                                className={`rounded-3xl p-4 sm:p-6 border transition-all bg-white dark:bg-slate-900 shadow-2xs space-y-4 ${
                                    isLive
                                        ? 'border-emerald-400 ring-2 ring-emerald-400/20'
                                        : isUpcoming
                                        ? 'border-blue-300'
                                        : 'border-slate-200/80 dark:border-slate-800'
                                }`}
                            >
                                {/* Header: Date, Status Badge & Action */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center shrink-0 ${
                                            isLive 
                                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                                : isUpcoming
                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                                        }`}>
                                            <span className="text-[9px] font-black uppercase leading-none">
                                                {dateObj.toLocaleDateString('en-IN', { month: 'short' })}
                                            </span>
                                            <span className="text-base font-black leading-none mt-0.5">
                                                {dateObj.getDate()}
                                            </span>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                                                    {formattedDate}
                                                </h4>
                                                {isLive && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 animate-pulse">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                                        Live Today
                                                    </span>
                                                )}
                                                {isUpcoming && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
                                                        Upcoming
                                                    </span>
                                                )}
                                                {!isLive && !isUpcoming && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                                        Completed
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-slate-500 font-medium italic mt-0.5 block">
                                                "{booking.campaignMessage}"
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 self-start sm:self-auto">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedInvoice(booking.invoice)}
                                            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                                        >
                                            <Receipt size={13} className="text-blue-600" />
                                            <span>Tax Invoice</span>
                                        </button>
                                        <span className="text-xs font-black text-slate-900 dark:text-white px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                                            ₹{booking.totalRupees.toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                {/* Products Showcase Grid */}
                                <div>
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-2">
                                        Featured Store Products ({booking.products.length})
                                    </span>

                                    {booking.products.length === 0 ? (
                                        <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-500 italic">
                                            Platform partner default items were showcased on this date.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                                            {booking.products.map((prod, pIdx) => (
                                                <div
                                                    key={prod.id || pIdx}
                                                    className="p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 flex items-center gap-2.5"
                                                >
                                                    <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-white shrink-0 border border-slate-200">
                                                        <img
                                                            src={prod.image || '/icons/intrustLogo.png'}
                                                            alt={prod.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-1 py-0.2 rounded">
                                                                #{pIdx + 1}
                                                            </span>
                                                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                                                                {prod.title}
                                                            </span>
                                                        </div>
                                                        <span className="text-[11px] font-black text-emerald-600 block mt-0.5">
                                                            ₹{prod.price}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* GST TAX INVOICE MODAL */}
            {selectedInvoice && (
                <SponsorshipGstInvoiceModal
                    invoice={selectedInvoice}
                    merchant={merchant}
                    onClose={() => setSelectedInvoice(null)}
                />
            )}
        </div>
    );
}
