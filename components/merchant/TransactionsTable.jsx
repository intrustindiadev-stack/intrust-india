"use client";

import Link from "next/link";
import { Package } from "lucide-react";

export default function TransactionsTable({ coupons }) {
    if (!coupons || coupons.length === 0) {
        return (
            <div className="merchant-glass rounded-3xl overflow-hidden border border-black/5 dark:border-white/5 mt-10 p-12 flex flex-col items-center justify-center shadow-sm">
                <Package className="w-12 h-12 text-slate-400 dark:text-slate-500 mb-3" />
                <p className="text-slate-500 dark:text-slate-400 mb-4 font-medium">No coupons in your inventory yet</p>
                <Link
                    href="/merchant/purchase"
                    className="px-6 py-3 rounded-xl bg-[#D4AF37] text-[#020617] font-bold hover:bg-opacity-90 transition-all gold-glow"
                >
                    Purchase Coupons
                </Link>
            </div>
        );
    }

    // Default icons for brands (if we were using the images downloaded, 
    // we'd match the brand name, here we use initials if no specific logo available).
    const getBrandImage = (brand) => {
        const lowerBrand = brand.toLowerCase();
        if (lowerBrand.includes('netflix')) return '/assets/merchant-dashboard/netflix.png';
        if (lowerBrand.includes('amazon')) return '/assets/merchant-dashboard/amazon.png';
        if (lowerBrand.includes('spotify')) return '/assets/merchant-dashboard/spotify.png';
        return null;
    };

    return (
        <div className="merchant-glass rounded-3xl overflow-hidden border border-black/5 dark:border-white/5 mt-10 overflow-x-auto shadow-sm">
            <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between min-w-max">
                <h3 className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">Recent Coupons</h3>
                <Link href="/merchant/inventory" className="text-sm text-[#D4AF37] hover:underline font-semibold flex items-center">
                    View All <span className="material-icons-round text-xs ml-1">arrow_forward</span>
                </Link>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                    <thead>
                        <tr className="text-[11px] uppercase tracking-widest text-slate-500 font-bold border-b border-black/5 dark:border-white/5">
                            <th className="px-8 py-4">Brand</th>
                            <th className="px-8 py-4">Face Value</th>
                            <th className="px-8 py-4">Purchase Price</th>
                            <th className="px-8 py-4">Selling Price</th>
                            <th className="px-8 py-4">Profit</th>
                            <th className="px-8 py-4">Status</th>
                            <th className="px-8 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {coupons.map((coupon) => {
                            const profit = coupon.sellingPrice - coupon.purchasePrice - coupon.commission;
                            const brandImage = getBrandImage(coupon.brand);

                            return (
                                <tr key={coupon.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-500/10 flex items-center justify-center border border-black/5 dark:border-slate-500/20">
                                                {brandImage ? (
                                                    <img alt={coupon.brand} className="w-6 opacity-80" src={brandImage} />
                                                ) : (
                                                    <span className="font-bold text-[#D4AF37] text-lg">{coupon.brand.charAt(0)}</span>
                                                )}
                                            </div>
                                            <span className="font-bold text-slate-700 dark:text-slate-200 truncate max-w-[150px]">{coupon.brand}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-slate-600 dark:text-slate-300 font-medium">
                                        ₹{coupon.faceValue.toLocaleString('en-IN')}
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="font-bold text-slate-800 dark:text-slate-100">₹{coupon.purchasePrice.toLocaleString('en-IN')}</div>
                                        <div className="text-[10px] text-slate-500 uppercase tracking-tight">+ ₹{coupon.commission.toFixed(2)} Platform Fee</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        {coupon.listed || coupon.status === 'sold' ? (
                                            <div className="text-blue-500 dark:text-blue-400 font-bold">₹{coupon.sellingPrice.toLocaleString('en-IN')}</div>
                                        ) : (
                                            <div className="text-slate-400 dark:text-slate-500 text-sm italic">Not Listed</div>
                                        )}
                                    </td>
                                    <td className="px-8 py-5">
                                        {coupon.listed || coupon.status === 'sold' ? (
                                            <div className={`font-bold ${profit >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                                ₹{profit.toFixed(2)}
                                            </div>
                                        ) : (
                                            <div className="text-slate-400 dark:text-slate-500">-</div>
                                        )}
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${coupon.status === 'sold'
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                            : coupon.listed
                                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                                                : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-black/5 dark:border-white/5'
                                            }`}>
                                            {coupon.status === 'sold' ? 'Sold' : (coupon.listed ? 'Listed' : 'Draft')}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <Link href="/merchant/inventory" className="text-[#D4AF37] hover:text-[#B48F27] dark:hover:text-white text-xs font-bold transition-colors">
                                            Manage
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
