'use client';

// Skeleton placeholder matching the MerchantCard layout in ShopHubClient.jsx
// Used during loading / framer-motion stagger: rendered as hidden initial state
export default function MerchantCardSkeleton() {
    return (
        <div className="h-full flex flex-col bg-white dark:bg-[#0c0e16] rounded-[2rem] overflow-hidden border border-slate-100/80 dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] animate-pulse">

            {/* ── Banner skeleton ── */}
            <div className="relative w-full h-[140px] sm:h-[160px] bg-slate-100 dark:bg-[#13161f]">
                {/* Overlapping circular avatar placeholder */}
                <div className="absolute -bottom-8 left-5 z-20">
                    <div className="w-[72px] h-[72px] rounded-[1.25rem] bg-slate-200 dark:bg-slate-700 shadow-[0_12px_24px_rgba(0,0,0,0.15)] ring-1 ring-black/5 dark:ring-white/10" />
                </div>
            </div>

            {/* ── Body skeleton ── */}
            <div className="relative flex flex-col flex-1 px-5 pt-11 pb-4 bg-white dark:bg-[#0c0e16] z-10">
                {/* Store name bar */}
                <div className="h-5 w-3/4 rounded-lg bg-slate-200 dark:bg-slate-700/60 mb-3" />
                {/* Address / rating row */}
                <div className="flex gap-2">
                    <div className="h-4 w-12 rounded-md bg-slate-200 dark:bg-slate-700/50" />
                    <div className="h-4 w-20 rounded-md bg-slate-200 dark:bg-slate-700/50" />
                </div>
                <div className="flex-1" />
                {/* Footer divider */}
                <div className="mt-4 pt-3 border-t border-dashed border-slate-200 dark:border-white/[0.08]">
                    <div className="h-3 w-16 rounded bg-slate-100 dark:bg-slate-800" />
                </div>
            </div>
        </div>
    );
}
