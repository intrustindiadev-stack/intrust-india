import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Clock, CheckCircle } from 'lucide-react';

export default function RecentActivity({ orders }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/70 dark:bg-gray-800/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white dark:border-white/5 p-4 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
        >
            <div className="flex items-center justify-between mb-5 sm:mb-8">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-gray-100 tracking-tight">Recent Activity</h2>
                <Link href="/transactions" className="text-blue-600 dark:text-blue-400 text-sm font-black hover:opacity-80 transition-opacity">View History</Link>
            </div>

            {!orders || orders.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-sm font-medium text-slate-500 dark:text-gray-400">No recent activity found.</p>
                </div>
            ) : (
                <div className="space-y-3 sm:space-y-4">
                    {orders.map((order) => (
                        <div key={order.id} className="flex items-center gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl sm:rounded-3xl group bg-slate-50/50 dark:bg-white/5 hover:bg-white dark:hover:bg-gray-700 transition-all duration-300 border border-transparent hover:border-slate-100 dark:hover:border-white/5 hover:shadow-xl hover:shadow-gray-200/40 dark:hover:shadow-none">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white dark:bg-gray-600 shadow-sm flex items-center justify-center text-2xl sm:text-3xl group-hover:scale-110 transition-transform duration-500">
                                {order.logo}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-extrabold text-slate-900 dark:text-gray-100 truncate flex items-center gap-2">
                                    {order.brand}
                                </div>
                                <div className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 font-bold max-w-full truncate">{order.description}</div>
                                <div className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 font-bold mt-0.5">₹{order.value} <span className="mx-1 text-slate-300">•</span> {order.date}</div>
                            </div>
                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${order.status === 'delivered' || order.status === 'success'
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                                }`}>
                                {order.status === 'processing' ? <Clock size={12} strokeWidth={3} /> : <CheckCircle size={12} strokeWidth={3} />}
                                {order.status}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}
