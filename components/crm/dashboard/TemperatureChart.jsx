'use client';

import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Skeleton from '@/components/ui/Skeleton';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function TemperatureChart({ 
    data, 
    title, 
    subtitle, 
    icon: Icon, 
    isLoading 
}) {
    const { theme, systemTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
    }, []);

    const isDark = mounted && (theme === 'dark' || (theme === 'system' && systemTheme === 'dark'));
    
    // Custom colors for Hot, Warm, Cold
    const COLOR_MAP = {
        'Hot': '#ef4444', // red-500
        'Warm': '#f59e0b', // amber-500
        'Cold': '#3b82f6', // blue-500
        'Default': '#8b5cf6' // fallback
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.55, duration: 0.5, ease: "easeOut" }} 
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-[1.25rem] p-6 sm:p-8 border border-gray-100 dark:border-gray-700/50 relative overflow-hidden group shadow-xl shadow-gray-200/20 dark:shadow-black/20 hover:shadow-2xl transition-all duration-300"
        >
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-rose-500/5 dark:bg-rose-500/10 rounded-full blur-3xl group-hover:bg-rose-500/10 dark:group-hover:bg-rose-500/20 transition-colors" />
            
            <div className="flex items-center justify-between mb-8 relative z-10">
                <div>
                    <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                        {Icon && <Icon size={20} className="text-rose-500 dark:text-rose-400" />} {title}
                    </h2>
                    {subtitle && <p className="text-xs text-gray-500 dark:text-rose-400/70 font-bold tracking-wide mt-1 uppercase">{subtitle}</p>}
                </div>
            </div>
            
            <div className="h-56 w-full relative z-10 flex items-center justify-center">
                {isLoading ? (
                    <Skeleton className="w-full h-full rounded-xl bg-gray-100 dark:bg-gray-800/50" />
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLOR_MAP[entry.name] || COLOR_MAP.Default} className="hover:opacity-80 transition-opacity outline-none" />
                                ))}
                            </Pie>
                            <Tooltip 
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
                                itemStyle={{ color: isDark ? '#fff' : '#111827' }} 
                            />
                            <Legend 
                                verticalAlign="bottom" 
                                height={36} 
                                iconType="circle" 
                                wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: isDark ? '#9ca3af' : '#6b7280' }} 
                            />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </div>
        </motion.div>
    );
}
