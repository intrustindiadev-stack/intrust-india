'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';

export default function GlassMetricCard({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    trendUp, 
    progress,
    delay = 0,
    accentColor = 'cyan', // 'cyan', 'purple', 'pink', 'amber', 'emerald', 'blue'
    href
}) {
    const accentMap = {
        cyan: 'from-cyan-400 to-cyan-600 shadow-cyan-500/20 text-cyan-600 dark:text-cyan-400',
        purple: 'from-purple-400 to-purple-600 shadow-purple-500/20 text-purple-600 dark:text-purple-400',
        pink: 'from-pink-400 to-pink-600 shadow-pink-500/20 text-pink-600 dark:text-pink-400',
        amber: 'from-amber-400 to-amber-600 shadow-amber-500/20 text-amber-600 dark:text-amber-400',
        emerald: 'from-emerald-400 to-emerald-600 shadow-emerald-500/20 text-emerald-600 dark:text-emerald-400',
        blue: 'from-blue-400 to-blue-600 shadow-blue-500/20 text-blue-600 dark:text-blue-400',
    };
    
    const bgMap = {
        cyan: 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/20',
        purple: 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20',
        pink: 'bg-pink-50 dark:bg-pink-500/10 border-pink-200 dark:border-pink-500/20',
        amber: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',
        emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
        blue: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20',
    };

    const cardContent = (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: "easeOut" }}
            className={`relative overflow-hidden rounded-[1.25rem] bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-100 dark:border-gray-700/50 p-6 flex flex-col justify-between group transition-all duration-300 shadow-xl shadow-gray-200/20 dark:shadow-black/20 ${href ? 'cursor-pointer hover:shadow-2xl hover:shadow-gray-200/40 dark:hover:shadow-black/40 hover:-translate-y-1' : ''}`}
        >
            {/* Ambient Glow */}
            <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-10 dark:opacity-20 group-hover:opacity-30 dark:group-hover:opacity-40 transition-opacity bg-gradient-to-br ${accentMap[accentColor]}`}></div>

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bgMap[accentColor]} border backdrop-blur-md`}>
                    {Icon && <Icon size={24} className={accentMap[accentColor].split(' ').pop()} />}
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg backdrop-blur-md ${
                        trendUp ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                    }`}>
                        {trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />} {trend}
                    </div>
                )}
            </div>
            
            <div className="relative z-10">
                <p className="text-gray-500 dark:text-gray-400 text-sm font-bold tracking-wide">{title}</p>
                <div className="flex items-end justify-between mt-1">
                    <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{value}</p>
                    
                    {progress !== undefined && (
                        <div className="relative w-12 h-12 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                <path
                                    className="text-gray-100 dark:text-gray-700"
                                    strokeWidth="3"
                                    stroke="currentColor"
                                    fill="none"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path
                                    className={accentMap[accentColor].split(' ').pop()}
                                    strokeWidth="3"
                                    strokeDasharray={`${progress}, 100`}
                                    strokeLinecap="round"
                                    stroke="currentColor"
                                    fill="none"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                            </svg>
                            <span className="absolute text-[10px] font-bold text-gray-900 dark:text-white">{progress}%</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );

    if (href) {
        return <Link href={href} className="block w-full">{cardContent}</Link>;
    }

    return cardContent;
}
