'use client';

import { useState } from 'react';
import Image from 'next/image';
import ListToMarketplace from '@/components/merchant/ListToMarketplace';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { 
    Store, 
    Edit3, 
    EyeOff, 
    TrendingUp, 
    TrendingDown, 
    DollarSign, 
    Tag,
    ChevronRight,
    ArrowUpRight
} from 'lucide-react';

import { useSubscription } from '@/components/merchant/SubscriptionContext';
import { useConfetti } from '@/components/ui/ConfettiProvider';

export default function InventoryTable({ initialCoupons }) {
    const router = useRouter();
    const { performAction } = useSubscription();
    const { trigger: triggerConfetti } = useConfetti();
    const [selectedCoupon, setSelectedCoupon] = useState(null);
    const [showListModal, setShowListModal] = useState(false);

    const handleListSuccess = async () => {
        setShowListModal(false);
        setSelectedCoupon(null);
        triggerConfetti();
        toast.success("Coupon listed to marketplace!");
        router.refresh();
    };

    const handleUnlist = async (couponId) => {
        performAction(async () => {
            try {
                const { error } = await supabase
                    .from('coupons')
                    .update({ listed_on_marketplace: false })
                    .eq('id', couponId);

                if (error) throw error;
                toast.success("Coupon removed from marketplace.");
                router.refresh();
            } catch (err) {
                toast.error('Failed to unlist: ' + err.message);
            }
        });
    };

    return (
        <div className="space-y-6">
            {/* Mobile View (Premium Cards) */}
            <div className="md:hidden space-y-4">
                {initialCoupons.map((coupon, index) => {
                    const rawPurchasePrice = coupon.purchase_price ?? ((coupon.merchant_purchase_price_paise || 0) / 100);
                    const purchasePrice = Math.abs(rawPurchasePrice);
                    const sellingPrice = (coupon.merchant_selling_price_paise || 0) / 100;
                    const profit = sellingPrice - purchasePrice;
                    const isProfit = profit > 0;

                    return (
                        <div 
                            key={coupon.id} 
                            style={{ animationDelay: `${index * 100}ms` }}
                            className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white/70 dark:bg-gray-800/40 backdrop-blur-xl rounded-2xl border border-white dark:border-white/5 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden"
                        >
                            {/* Status Ribbon */}
                            <div className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                coupon.listed_on_marketplace 
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                                : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                            }`}>
                                {coupon.listed_on_marketplace ? 'Active' : 'Draft'}
                            </div>

                            {/* Brand Header */}
                            <div className="flex items-center gap-4 mb-5">
                                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center border border-black/5 dark:border-white/5 shadow-sm overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                                    {coupon.image_url ? (
                                        <Image src={coupon.image_url} alt={coupon.brand} fill className="object-cover" />
                                    ) : (
                                        <span className="font-black text-[#D4AF37] text-xl">{coupon.brand.charAt(0)}</span>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 dark:text-gray-100 text-lg leading-tight uppercase tracking-tight">{coupon.brand}</h3>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <Tag size={10} className="text-[#D4AF37]" />
                                        <span className="text-[10px] text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider">{coupon.category || "General"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Value Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-5">
                                <div className="bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-black/5 dark:border-white/5">
                                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter mb-1">Face Value</p>
                                    <p className="text-base font-black text-slate-900 dark:text-gray-100">₹{(coupon.face_value_paise / 100).toLocaleString('en-IN')}</p>
                                </div>
                                <div className="bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-black/5 dark:border-white/5">
                                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter mb-1">Selling At</p>
                                    {coupon.listed_on_marketplace ? (
                                        <p className="text-base font-black text-blue-600 dark:text-blue-400">₹{sellingPrice.toLocaleString('en-IN')}</p>
                                    ) : (
                                        <p className="text-xs font-bold text-slate-400 italic mt-1">Not Listed</p>
                                    )}
                                </div>
                            </div>

                            {/* Profit / Stats Banner */}
                            <div className={`p-4 rounded-xl border mb-5 flex items-center justify-between ${
                                isProfit ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-slate-500/5 border-slate-500/10'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
                                        isProfit ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-slate-400 shadow-slate-400/20'
                                    }`}>
                                        {isProfit ? <TrendingUp size={18} className="text-white" /> : <TrendingDown size={18} className="text-white" />}
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Net Profit</p>
                                        <p className={`text-sm font-black ${isProfit ? 'text-emerald-600' : 'text-slate-600'}`}>
                                            ₹{profit.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Margin</p>
                                    <p className={`text-sm font-black ${isProfit ? 'text-emerald-600' : 'text-slate-600'}`}>
                                        {((profit/purchasePrice)*100).toFixed(1)}%
                                    </p>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="flex gap-2">
                                {!coupon.listed_on_marketplace ? (
                                    <button
                                        onClick={() => performAction(() => {
                                            setSelectedCoupon(coupon);
                                            setShowListModal(true);
                                        })}
                                        className="flex-1 py-3.5 bg-[#D4AF37] text-white font-black rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[#D4AF37]/20"
                                    >
                                        <Store size={18} />
                                        <span className="text-[11px] uppercase tracking-widest">List to Market</span>
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => performAction(() => {
                                                setSelectedCoupon(coupon);
                                                setShowListModal(true);
                                            })}
                                            className="flex-1 py-3.5 bg-blue-600 text-white font-black rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
                                        >
                                            <Edit3 size={16} />
                                            <span className="text-[11px] uppercase tracking-widest">Edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleUnlist(coupon.id)}
                                            className="flex-1 py-3.5 bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 font-black rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-gray-700 active:scale-95 transition-all border border-black/5 dark:border-white/5"
                                        >
                                            <EyeOff size={16} />
                                            <span className="text-[11px] uppercase tracking-widest">Unlist</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Desktop View (Premium Table) */}
            <div className="hidden md:block bg-white/70 dark:bg-gray-800/40 backdrop-blur-xl rounded-3xl border border-white dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                            <th className="px-8 py-6">Asset / Brand</th>
                            <th className="px-8 py-6">Valuation</th>
                            <th className="px-8 py-6">Market Price</th>
                            <th className="px-8 py-6">Performance</th>
                            <th className="px-8 py-6">Status</th>
                            <th className="px-8 py-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {initialCoupons.map((coupon) => {
                            const rawPurchasePrice = coupon.purchase_price ?? ((coupon.merchant_purchase_price_paise || 0) / 100);
                            const purchasePrice = Math.abs(rawPurchasePrice);
                            const sellingPrice = (coupon.merchant_selling_price_paise || 0) / 100;
                            const profit = sellingPrice - purchasePrice;
                            const isProfit = profit > 0;

                            return (
                                <tr key={coupon.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center border border-black/5 dark:border-white/5 shadow-sm overflow-hidden shrink-0 transition-transform group-hover:scale-110">
                                                {coupon.image_url ? (
                                                    <Image src={coupon.image_url} alt={coupon.brand} fill className="object-cover" />
                                                ) : (
                                                    <span className="font-black text-[#D4AF37] text-xl">{coupon.brand.charAt(0)}</span>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-900 dark:text-gray-100 uppercase tracking-tight">{coupon.brand}</div>
                                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{coupon.category || "General"}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-800 dark:text-gray-200">₹{(coupon.face_value_paise / 100).toLocaleString('en-IN')}</span>
                                            <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mt-1">Face Value</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        {coupon.listed_on_marketplace ? (
                                            <div className="flex flex-col">
                                                <span className="font-black text-blue-600 dark:text-blue-400 text-lg">₹{sellingPrice.toLocaleString('en-IN')}</span>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <Store size={10} className="text-blue-500" />
                                                    <span className="text-[9px] uppercase tracking-widest text-blue-500 font-bold">Active Listing</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 text-sm font-bold italic opacity-60">Off Market</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-6">
                                        {coupon.listed_on_marketplace ? (
                                            <div className="flex flex-col">
                                                <div className={`flex items-center gap-2 font-black ${isProfit ? 'text-emerald-600' : 'text-red-500'}`}>
                                                    {isProfit ? <ArrowUpRight size={14} /> : <TrendingDown size={14} />}
                                                    ₹{profit.toFixed(2)}
                                                </div>
                                                <span className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${isProfit ? 'text-emerald-500/80' : 'text-red-500/80'}`}>
                                                    {((profit/purchasePrice)*100).toFixed(1)}% ROE
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 font-bold opacity-30">—</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${
                                            coupon.listed_on_marketplace 
                                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                                            : 'bg-slate-500/10 text-slate-500 border-slate-500/10'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${coupon.listed_on_marketplace ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                            {coupon.listed_on_marketplace ? 'Live' : 'Draft'}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {!coupon.listed_on_marketplace ? (
                                                <button
                                                    onClick={() => performAction(() => {
                                                        setSelectedCoupon(coupon);
                                                        setShowListModal(true);
                                                    })}
                                                    className="h-10 px-4 bg-[#D4AF37] text-white font-black rounded-xl flex items-center gap-2 hover:opacity-90 transition-all shadow-md shadow-[#D4AF37]/20 group/btn"
                                                >
                                                    <span className="text-[10px] uppercase tracking-widest">List Asset</span>
                                                    <ChevronRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => performAction(() => {
                                                            setSelectedCoupon(coupon);
                                                            setShowListModal(true);
                                                        })}
                                                        className="w-10 h-10 flex items-center justify-center bg-blue-600/10 text-blue-600 border border-blue-600/20 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm group/edit"
                                                        title="Edit Listing"
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleUnlist(coupon.id)}
                                                        className="w-10 h-10 flex items-center justify-center bg-red-600/10 text-red-600 border border-red-600/20 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm group/unlist"
                                                        title="Remove from Market"
                                                    >
                                                        <EyeOff size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

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
        </div>
    );
}
