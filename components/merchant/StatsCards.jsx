"use client";

import Link from 'next/link';

export default function StatsCards({ stats }) {
    return (
        <div className="mb-10">
            <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-wide">Performance Metrics</h3>
                <Link href="/merchant/analytics" className="text-xs font-bold text-[#D4AF37] hover:text-[#B8860B]">
                    View All
                </Link>
            </div>
            
            <div className="flex flex-col gap-4">
                {/* Sales & Inventory Card */}
                <Link href="/merchant/inventory" className="block bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">Sales & Inventory</h4>
                            <p className="text-[10px] text-slate-500 font-medium">Lifetime performance • Track record</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-[#D4AF37]/10 group-hover:text-[#D4AF37] transition-colors border border-slate-100 dark:border-slate-600">
                            <span className="material-icons-round text-sm">arrow_outward</span>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <div>
                            <p className="text-[10px] text-slate-400 font-medium mb-1">Total Sales</p>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{stats.totalSales}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-medium mb-1">Active</p>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{stats.activeCoupons}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-medium mb-1">Listed</p>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{stats.listedCoupons}</p>
                        </div>
                    </div>
                    
                    <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 mb-3">
                        <div className="bg-[#D4AF37]" style={{ width: '60%' }}></div>
                        <div className="bg-emerald-500" style={{ width: '30%' }}></div>
                    </div>
                    
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                        <span>Last updated today</span>
                        <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full">Active</span>
                        <span>Since joining</span>
                    </div>
                </Link>

                {/* Financial Overview Card */}
                <Link href="/merchant/wallet" className="block bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">Financial Overview</h4>
                            <p className="text-[10px] text-slate-500 font-medium">Expenses & Balances • Money flow</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-[#D4AF37]/10 group-hover:text-[#D4AF37] transition-colors border border-slate-100 dark:border-slate-600">
                            <span className="material-icons-round text-sm">arrow_outward</span>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <div>
                            <p className="text-[10px] text-slate-400 font-medium mb-1">Shopping Spend</p>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">₹{(stats.shoppingSpend || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-medium mb-1">Commission</p>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">₹{(stats.totalCommission || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-medium mb-1">Lockin Balance</p>
                            <p className="text-sm font-bold text-blue-500">₹{(stats.lockinBalance || 0).toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                    
                    <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 mb-3">
                        <div className="bg-orange-400" style={{ width: '40%' }}></div>
                        <div className="bg-rose-400" style={{ width: '20%' }}></div>
                        <div className="bg-blue-500" style={{ width: '40%' }}></div>
                    </div>
                    
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                        <span>Spend</span>
                        <span className="bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 rounded-full">Fees</span>
                        <span>Locked</span>
                    </div>
                </Link>
            </div>
        </div>
    );
}
