'use client';

import React from 'react';
import { ChevronRight, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function DashboardStats({ stats }) {
    const router = useRouter();

    const handleNavigation = (href) => {
        if (href) {
            router.push(href);
        }
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
            {stats.map((stat, index) => {
                const Icon = stat.icon;
                const href = stat.href || (stat.label === 'Wallet Balance' ? '/wallet' : null);
                
                return (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => handleNavigation(href)}
                        className={`relative overflow-hidden group bg-white/70 dark:bg-gray-800/40 backdrop-blur-xl rounded-2xl sm:rounded-[2.5rem] border border-white dark:border-white/5 p-5 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] dark:hover:bg-gray-800/60 transition-all ${href ? 'cursor-pointer hover:border-emerald-200 dark:hover:border-emerald-500/30' : ''}`}
                    >
                        {/* Abstract background glow */}
                        <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-[0.03] dark:opacity-[0.08] blur-3xl rounded-full group-hover:opacity-[0.1] transition-opacity`} />

                        <div className="flex items-center justify-between relative z-10">
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg shadow-gray-200 dark:shadow-none group-hover:scale-110 transition-transform duration-500 border border-white/10`}>
                                <Icon size={24} className="text-white" />
                            </div>
                            {href && (
                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-2 transition-all">
                                    <ChevronRight size={18} />
                                </div>
                            )}
                        </div>

                        <div className="mt-6 relative z-10">
                            <div className="text-[10px] sm:text-xs font-black text-slate-500 dark:text-gray-400 mb-1 uppercase tracking-widest">{stat.label}</div>
                            <div className="flex flex-col">
                                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-gray-100 tracking-tight leading-none">
                                    {stat.value}
                                </div>
                                {stat.subValue && (
                                    <div className="text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1 bg-emerald-500/5 px-2 py-0.5 rounded-md self-start border border-emerald-500/10">
                                        <TrendingUp size={12} />
                                        <span>Value: {stat.subValue}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
