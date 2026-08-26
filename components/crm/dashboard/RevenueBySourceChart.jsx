'use client';

import { motion } from 'framer-motion';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Skeleton from '@/components/ui/Skeleton';

import { useEffect, useState } from 'react';

export default function RevenueBySourceChart({ 
    data, 
    title, 
    subtitle, 
    icon: Icon, 
    isLoading 
}) {
    
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
    }, []);

    const isDark = mounted && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const textColor = isDark ? '#64748b' : '#94a3b8';

    return (
        <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.6, duration: 0.5, ease: "easeOut" }} 
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-[1.25rem] p-6 sm:p-8 border border-gray-100 dark:border-gray-700/50 relative overflow-hidden group shadow-xl shadow-gray-200/20 dark:shadow-black/20 hover:shadow-2xl transition-all duration-300"
        >
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/10 dark:group-hover:bg-emerald-500/20 transition-colors" />
            
            <div className="flex items-center justify-between mb-8 relative z-10">
                <div>
                    <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                        {Icon && <Icon size={20} className="text-emerald-500 dark:text-emerald-400" />} {title}
                    </h2>
                    {subtitle && <p className="text-xs text-gray-500 dark:text-emerald-400/70 font-bold tracking-wide mt-1 uppercase">{subtitle}</p>}
                </div>
            </div>
            
            <div className="h-56 w-full relative z-10">
                {isLoading ? (
                    <Skeleton className="w-full h-full rounded-xl bg-gray-100 dark:bg-gray-800/50" />
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                            <XAxis 
                                type="number"
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 11, fill: textColor, fontWeight: 600 }} 
                                tickFormatter={(value) => {
                                    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
                                    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
                                    return `₹${value}`;
                                }}
                            />
                            <YAxis 
                                type="category"
                                dataKey="name"
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 11, fill: textColor }} 
                                width={80}
                            />
                            <Tooltip 
                                cursor={{ fill: isDark ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.03)' }} 
                                contentStyle={{ 
                                    borderRadius: '12px', 
                                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)', 
                                    background: isDark ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)', 
                                    backdropFilter: 'blur(12px)',
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', 
                                    padding: '12px', 
                                    fontWeight: 'bold',
                                    color: isDark ? '#fff' : '#111827'
                                }} 
                                itemStyle={{ color: '#10b981' }}
                                formatter={(value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)}
                            />
                            <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill="#10b981" className="hover:opacity-80 transition-opacity" />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </motion.div>
    );
}
