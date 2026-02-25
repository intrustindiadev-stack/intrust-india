import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DashboardStats({ stats }) {
    const router = useRouter();

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
            {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <div
                        key={stat.label}
                        style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
                        onClick={() => stat.label === 'Wallet Balance' && router.push('/wallet')}
                        className={`animate-in fade-in slide-in-from-bottom-4 duration-500 relative overflow-hidden group bg-white/70 dark:bg-gray-800/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white dark:border-white/5 p-4 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] dark:hover:bg-gray-800/60 transition-all ${stat.label === 'Wallet Balance' ? 'cursor-pointer hover:border-blue-200 dark:hover:border-blue-500/30' : ''}`}
                    >
                        {/* Abstract background glow */}
                        <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-[0.03] dark:opacity-[0.08] blur-3xl rounded-full group-hover:opacity-[0.1] transition-opacity`} />

                        <div className="flex items-center justify-between relative z-10">
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg shadow-gray-200 dark:shadow-none group-hover:scale-110 transition-transform duration-500`}>
                                <Icon size={24} className="text-white" />
                            </div>
                            {stat.label === 'Wallet Balance' && (
                                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ChevronRight size={18} />
                                </div>
                            )}
                        </div>

                        <div className="mt-4 sm:mt-5 relative z-10">
                            <div className="text-[10px] sm:text-sm font-semibold text-slate-500 dark:text-gray-400 mb-0.5">{stat.label}</div>
                            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-gray-100 tracking-tight">{stat.value}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
