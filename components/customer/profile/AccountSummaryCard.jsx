'use client';

import { motion } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { Sparkles, TrendingUp, ShoppingBag, ArrowRight, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/contexts/ThemeContext';



const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl shadow-xl">
                {`Value: ${payload[0].value}`}
            </div>
        );
    }
    return null;
};

export default function AccountSummaryCard({ purchaseCount, totalSavedPaise, graphData = [] }) {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const savedAmount = (totalSavedPaise || 0) / 100;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-[#0f172a]/50 backdrop-blur-xl rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-2xl relative overflow-hidden group flex flex-col h-full"
        >
            {/* Background Gradients */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-[40px] -mr-20 -mt-20 group-hover:bg-emerald-500/10 transition-all duration-700" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-[40px] -ml-20 -mb-20" />

            <div className="p-6 sm:p-8 flex-1 relative z-10 flex flex-col">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Account Summary
                    </h3>
                    <Sparkles size={16} className="text-emerald-500" />
                </div>

                {/* Graph Section */}
                <div className="h-[100px] w-full -mx-4 sm:-mx-6 mb-8 mt-auto px-4 sm:px-6">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={graphData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={isDark ? '#10b981' : '#34d399'} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={isDark ? '#10b981' : '#34d399'} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke={isDark ? '#10b981' : '#10b981'}
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorValue)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-auto">
                    <div className="p-4 rounded-[1.5rem] bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 relative overflow-hidden group-hover:border-blue-500/20 transition-all duration-300">
                        <ShoppingBag className="absolute -right-2 -bottom-2 text-blue-500/10 w-16 h-16 transition-transform group-hover:scale-110" />
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 relative z-10">Total Orders</p>
                        <p className="text-2xl font-black text-gray-900 dark:text-white font-[family-name:var(--font-outfit)] tracking-tight relative z-10">
                            {purchaseCount}
                        </p>
                    </div>
                    <div className="p-4 rounded-[1.5rem] bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 relative overflow-hidden group-hover:border-emerald-500/20 transition-all duration-300">
                        <TrendingUp className="absolute -right-2 -bottom-2 text-emerald-500/10 w-16 h-16 transition-transform group-hover:scale-110" />
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 relative z-10">Net Savings</p>
                        <p className="text-2xl font-black text-emerald-500 font-[family-name:var(--font-outfit)] tracking-tight relative z-10">
                            ₹{savedAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => router.push('/transactions')}
                    className="w-full mt-6 py-4 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 shadow-xl group/btn"
                >
                    View All Activity
                    <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
            </div>
        </motion.div>
    );
}
