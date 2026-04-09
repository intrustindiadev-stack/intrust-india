"use client";

import { useMerchant } from "@/hooks/useMerchant";

export default function KycStatusCard() {
    const { merchant, loading } = useMerchant();

    const status = loading ? "Loading" : (merchant?.status || "Pending");
    const isApproved = status.toLowerCase() === "approved";

        <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Status</span>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/5`}>
                <span className={`w-1 h-1 rounded-full ${isApproved ? 'bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-amber-400'}`} />
                <span className={`text-[9px] font-black uppercase tracking-widest ${isApproved ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}`}>{status}</span>
            </div>
        </div>
}
