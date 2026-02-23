"use client";

import { useMerchant } from "@/hooks/useMerchant";

export default function KycStatusCard() {
    const { merchant, loading } = useMerchant();

    const status = loading ? "Loading" : (merchant?.status || "Pending");
    const isApproved = status.toLowerCase() === "approved";

    return (
        <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider opacity-60">Status</span>
            <div className={`flex items-center text-[10px] ${isApproved ? 'text-green-400' : 'text-orange-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isApproved ? 'bg-green-400 animate-pulse' : 'bg-orange-400'} mr-1`}></span>
                <span className="capitalize">{status}</span>
            </div>
        </div>
    );
}
