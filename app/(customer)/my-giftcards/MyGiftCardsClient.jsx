'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Gift,
    ShoppingBag,
    Award,
    Wallet,
    TrendingUp,
    Calendar,
    Store,
    Clock,
    Download,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import CouponCodeReveal from './CouponCodeReveal';
import { generateOrderInvoice } from '@/lib/invoiceGenerator';

// ─── Animation variants ────────────────────────────────────────────────────────

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ─── Stat Card ─────────────────────────────────────────────────────────────────

/** @param {{ icon: React.ReactNode, gradient: string, value: string, label: string, href?: string }} props */
function StatCard({ icon, gradient, value, label, valueClass, href }) {
    const router = useRouter();
    return (
        <motion.div
            variants={itemVariants}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={href ? { scale: 0.98 } : {}}
            onClick={() => href && router.push(href)}
            className={`bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-sm ${href ? 'cursor-pointer' : ''}`}
        >
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3`}>
                {icon}
            </div>
            <div className={`text-3xl font-black mb-1 ${valueClass ?? 'text-gray-900 dark:text-white'}`}>
                {value}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
        </motion.div>
    );
}

// ─── Filter pill ───────────────────────────────────────────────────────────────

const FILTER_OPTIONS = ['All', 'Active', 'Pending Payment', 'Expired', 'Used'];

/** @param {{ active: string, onChange: (v: string) => void }} props */
function FilterBar({ active, onChange }) {
    return (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-8">
            {FILTER_OPTIONS.map((opt) => (
                <button
                    key={opt}
                    onClick={() => onChange(opt)}
                    className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-all ${active === opt
                        ? 'bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white shadow-md'
                        : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-[#92BCEA]/50'
                        }`}
                >
                    {opt}
                </button>
            ))}
        </div>
    );
}

// ─── Gift card tile ────────────────────────────────────────────────────────────

/** @param {{ coupon: import('./types').ProcessedCoupon }} props */
function GiftCardTile({ coupon, userProfile }) {
    const isInactive = coupon.uiStatus !== 'active';
    const savings = (coupon.faceValue - coupon.paidAmount).toFixed(0);
    // Monogram from brand name (first 2 chars)
    const monogram = coupon.brand.slice(0, 2).toUpperCase();

    return (
        <motion.div
            variants={itemVariants}
            whileHover={{ y: -6, boxShadow: '0 28px 56px rgba(0,0,0,0.16)' }}
            className={`relative rounded-3xl overflow-hidden shadow-lg transition-shadow ${isInactive ? 'grayscale-[30%] opacity-80' : ''}`}
        >
            {/* ═══ Full gradient background ═══ */}
            <div className={`absolute inset-0 bg-gradient-to-br ${coupon.gradient}`} />

            {/* Decorative glow orbs */}
            <div className="absolute -top-8 -right-8 w-52 h-52 bg-white/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-black/10 rounded-full blur-3xl pointer-events-none" />

            {/* ═══ Top strip: logo + brand + status ═══ */}
            <div className="relative z-10 flex items-start justify-between px-5 pt-5 pb-8">
                <div className="flex items-center gap-3">
                    {/* Monogram logo — glass circle */}
                    <div className="w-12 h-12 rounded-2xl bg-white/25 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-inner">
                        <span className="text-white font-black text-sm tracking-wide">{monogram}</span>
                    </div>
                    <div>
                        <div className="text-white font-black text-xl leading-tight drop-shadow">{coupon.brand}</div>
                        <div className="text-white/60 text-xs font-medium mt-0.5">{coupon.merchant}</div>
                    </div>
                </div>

                {/* Status pill */}
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-md ${coupon.uiStatus === 'active'
                    ? 'bg-white/90 text-green-600'
                    : coupon.uiStatus === 'pending-payment'
                        ? 'bg-amber-100/90 text-amber-700'
                        : 'bg-black/20 text-white border border-white/30'
                    }`}>
                    {coupon.uiStatus === 'active' ? '✓ Active'
                        : coupon.uiStatus === 'pending-payment' ? '⏳ Pending Payment'
                            : coupon.uiStatus.charAt(0).toUpperCase() + coupon.uiStatus.slice(1)}
                </span>
            </div>

            {/* Inactive stamp */}
            {isInactive && (
                <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                    <span
                        className="text-4xl font-black uppercase tracking-widest text-white/40 border-4 border-white/30 rounded-xl px-5 py-2"
                        style={{ transform: 'rotate(-20deg)' }}
                    >
                        {coupon.uiStatus}
                    </span>
                </div>
            )}

            {/* ═══ Floating body panel ═══ */}
            <div className="relative z-10 mx-3 mb-3 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl">
                <div className="p-5 sm:p-6">

                    {/* Value row */}
                    <div className="flex items-start justify-between mb-5 pb-5 border-b border-gray-100 dark:border-gray-800">
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Face Value</div>
                            <div className="text-3xl font-black bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] bg-clip-text text-transparent leading-none">
                                ₹{coupon.faceValue}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">You Paid</div>
                            <div className="text-2xl font-black text-gray-900 dark:text-white leading-none">₹{coupon.paidAmount}</div>
                            {Number(savings) > 0 && coupon.uiStatus !== 'pending-payment' && (
                                <div className="text-xs font-bold text-emerald-500 mt-1 flex items-center justify-end gap-1">
                                    <TrendingUp size={11} />
                                    Saved ₹{savings}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Coupon Code */}
                    <CouponCodeReveal couponId={coupon.id} />

                    {/* Metadata */}
                    <div className="space-y-2 mb-4 border-t border-gray-100 dark:border-gray-800 pt-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                                <Store size={12} />
                                Merchant
                            </span>
                            <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{coupon.merchant}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                                <Calendar size={12} />
                                Purchased
                            </span>
                            <span className="text-gray-600 dark:text-gray-400">{coupon.formattedDate}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                                <Calendar size={12} />
                                Expires
                            </span>
                            <span className="text-gray-600 dark:text-gray-400">{coupon.formattedExpiry}</span>
                        </div>
                        {coupon.uiStatus === 'pending-payment' && coupon.dueDate && (
                            <div className="flex items-center justify-between text-sm mt-2">
                                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                                    <Clock size={12} />
                                    Payment Due
                                </span>
                                <span className="text-amber-700 dark:text-amber-300 font-semibold">
                                    {new Date(coupon.dueDate).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* How to use */}
                    {(coupon.uiStatus === 'active' || coupon.uiStatus === 'pending-payment') && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-100 dark:border-blue-800/40 rounded-xl p-3.5 mt-4">
                            <div className="text-xs text-blue-700 dark:text-blue-300">
                                <span className="font-bold">💡 How to use: </span>
                                Decrypt, copy the code, and apply it at {coupon.brand} checkout
                            </div>
                        </div>
                    )}

                    {/* Download Invoice */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            generateOrderInvoice({
                                order: {
                                    id: coupon.id,
                                    created_at: coupon.rawDate || coupon.purchased_at || new Date().toISOString(),
                                    customer_name: userProfile?.full_name || 'Customer',
                                    faceValue: coupon.faceValue,
                                    paidAmount: coupon.paidAmount,
                                    brand: coupon.brand,
                                    giftcard_name: `${coupon.brand} Gift Card`,
                                },
                                items: [],
                                seller: {
                                    name: 'Intrust Financial Services (India) Pvt. Ltd.',
                                    address: 'TF-312/MM09, Ashima Mall, Narmadapuram Rd, Danish Naga, Bhopal, MP 462026',
                                    phone: '18002030052',
                                    gstin: '23AAFC14866A1ZV',
                                },
                                customer: {
                                    name: userProfile?.full_name || 'Customer',
                                    phone: userProfile?.phone || '',
                                    address: '',
                                },
                                type: 'giftcard',
                            });
                        }}
                        className="w-full mt-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-400 border border-slate-200 dark:border-white/10 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 transition-all active:scale-95"
                    >
                        <Download size={14} /> Download Invoice
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="text-center py-20"
        >
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#92BCEA]/20 to-[#AFB3F7]/20 flex items-center justify-center mx-auto mb-6 border border-[#92BCEA]/20">
                <Gift size={40} className="text-[#92BCEA]" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No gift cards yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto">
                Start browsing and purchase your first gift card to see it here
            </p>
            <Link
                href="/gift-cards"
                className="inline-flex items-center gap-2 px-8 py-4 btn-primary rounded-2xl font-bold"
            >
                <ShoppingBag size={20} />
                Browse Gift Cards
            </Link>
        </motion.div>
    );
}

// ─── Main component ────────────────────────────────────────────────────────────

/**
 * @typedef {{
 *   id: string,
 *   brand: string,
 *   logo: string,
 *   gradient: string,
 *   uiStatus: 'active' | 'expired' | 'used',
 *   faceValue: number,
 *   paidAmount: number,
 *   merchant: string,
 *   formattedDate: string,
 *   formattedExpiry: string,
 * }} ProcessedCoupon
 */

/**
 * @param {{
 *   coupons: ProcessedCoupon[],
 *   totalCards: number,
 *   activeCount: number,
 *   pendingPaymentCount: number,
 *   totalValue: number,
 *   totalSavings: number,
 *   udhariCount: number,
 * }} props
 */
export default function MyGiftCardsClient({ coupons, totalCards, activeCount, pendingPaymentCount, totalValue, totalSavings, udhariCount, userProfile }) {
    const [filter, setFilter] = useState('All');

    const displayed = filter === 'All'
        ? coupons
        : coupons.filter((c) => {
            if (filter === 'Pending Payment') return c.uiStatus === 'pending-payment';
            return c.uiStatus === filter.toLowerCase();
        });

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-950">
            <div className="pt-[15vh] pb-32 px-4 sm:px-6 max-w-7xl mx-auto">

                {/* ── Header ───────────────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-start justify-between mb-10"
                >
                    <div>
                        <h1 className="flex items-center gap-3 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-gray-100 tracking-tight mb-2">
                            <Gift size={36} className="gradient-text shrink-0" />
                            My Gift Cards
                        </h1>
                        <p className="text-slate-500 dark:text-gray-400">View and manage your purchased gift cards</p>
                    </div>
                    <Link
                        href="/gift-cards"
                        className="hidden sm:inline-flex shrink-0 items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white text-sm font-bold shadow hover:shadow-md transition-shadow"
                    >
                        Browse More →
                    </Link>
                </motion.div>

                {/* ── Stat Cards ───────────────────────────────────────────── */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-10"
                >
                    <StatCard
                        icon={<ShoppingBag size={22} className="text-white" />}
                        gradient="from-blue-500 to-cyan-500"
                        value={String(totalCards)}
                        label="Total Cards"
                    />
                    <StatCard
                        icon={<Award size={22} className="text-white" />}
                        gradient="from-green-500 to-emerald-500"
                        value={String(activeCount)}
                        label="Active"
                    />
                    <StatCard
                        icon={<Wallet size={22} className="text-white" />}
                        gradient="from-purple-500 to-pink-500"
                        value={`₹${totalValue.toFixed(0)}`}
                        label="Total Value"
                    />
                    <StatCard
                        icon={<TrendingUp size={22} className="text-white" />}
                        gradient="from-orange-500 to-amber-500"
                        value={`₹${totalSavings.toFixed(0)}`}
                        label="Total Saved"
                        valueClass="text-green-500"
                    />
                    <StatCard
                        icon={<Clock size={22} className="text-white" />}
                        gradient="from-amber-400 to-orange-500"
                        value={String(Math.max(udhariCount, pendingPaymentCount || 0))}
                        label="Awaiting Action"
                        href="/store-credits"
                        valueClass="text-amber-500"
                    />
                </motion.div>

                {/* ── Filter Bar ───────────────────────────────────────────── */}
                <FilterBar active={filter} onChange={setFilter} />

                {/* ── Card Grid / Empty State ──────────────────────────────── */}
                <AnimatePresence mode="wait">
                    {displayed.length > 0 ? (
                        <motion.div
                            key={filter}
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit={{ opacity: 0 }}
                            className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6"
                        >
                            {displayed.map((coupon) => (
                                <GiftCardTile key={coupon.id} coupon={coupon} userProfile={userProfile} />
                            ))}
                        </motion.div>
                    ) : (
                        <EmptyState key="empty" />
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
}
