"use client";

export default function StatsCards({ stats }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {/* Total Sales Card */}
            <div className="merchant-glass p-6 rounded-3xl border border-black/5 dark:border-white/5 hover:border-[#D4AF37]/30 transition-all group relative overflow-hidden shadow-sm">
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all"></div>
                <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                        <span className="material-icons-round text-emerald-500">shopping_bag</span>
                    </div>
                </div>
                <h3 className="text-4xl font-display font-bold mb-1 text-slate-800 dark:text-slate-100">{stats.totalSales}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Sales</p>
            </div>

            {/* Active Coupons Card */}
            <div className="merchant-glass p-6 rounded-3xl border border-black/5 dark:border-white/5 hover:border-[#D4AF37]/30 transition-all group relative overflow-hidden shadow-sm">
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
                <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                        <span className="material-icons-round text-blue-500">confirmation_number</span>
                    </div>
                </div>
                <h3 className="text-4xl font-display font-bold mb-1 text-slate-800 dark:text-slate-100">
                    {stats.activeCoupons} <span className="text-sm font-sans font-normal text-slate-500 ml-1">listed ({stats.listedCoupons})</span>
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Active Coupons</p>
            </div>

            {/* Total Revenue Card */}
            <div className="merchant-glass p-6 rounded-3xl border border-black/5 dark:border-white/5 hover:border-[#D4AF37]/30 transition-all group relative overflow-hidden shadow-sm">
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all"></div>
                <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                        <span className="material-icons-round text-purple-500">insights</span>
                    </div>
                </div>
                <h3 className="text-4xl font-display font-bold mb-1 text-slate-800 dark:text-slate-100">
                    ₹{stats.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Revenue</p>
            </div>

            {/* Commission Paid Card */}
            <div className="merchant-glass p-6 rounded-3xl border border-[#D4AF37]/20 hover:border-[#D4AF37] transition-all group relative overflow-hidden bg-gradient-to-br from-[#D4AF37]/5 to-transparent dark:from-[#D4AF37]/10 dark:to-transparent shadow-sm">
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[#D4AF37]/10 rounded-full blur-2xl group-hover:bg-[#D4AF37]/20 transition-all"></div>
                <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/30">
                        <span className="material-icons-round text-[#D4AF37]">payments</span>
                    </div>
                </div>
                <h3 className="text-4xl font-display font-bold mb-1 text-[#D4AF37]">
                    ₹{stats.totalCommission.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium text-[#D4AF37]">Commission Paid</p>
            </div>
        </div>
    );
}
