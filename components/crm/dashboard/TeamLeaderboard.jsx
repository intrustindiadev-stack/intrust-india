'use client';

import { motion } from 'framer-motion';
import { Trophy, TrendingUp, User } from 'lucide-react';
import SkeletonCard from '@/components/shared/SkeletonCard';
import EmptyState from '@/components/ui/EmptyState';

export default function TeamLeaderboard({ teamData, totalRevenue, isLoading }) {
    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }} 
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-[1.25rem] shadow-xl shadow-gray-200/20 dark:shadow-black/20 overflow-hidden border border-gray-100 dark:border-gray-700/50 relative"
        >
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex justify-between items-center p-6 sm:p-8 pb-4 relative z-10">
                <div>
                    <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <Trophy size={20} className="text-amber-500" /> Team Leaderboard
                    </h2>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wide mt-1 uppercase">Top performers by revenue</p>
                </div>
            </div>
            
            <div className="divide-y divide-gray-50 dark:divide-gray-700/30 px-4 pb-4 relative z-10">
                {isLoading ? (
                    <SkeletonCard type="list-item" count={4} />
                ) : teamData.length === 0 ? (
                    <EmptyState 
                        icon={User} 
                        title="No team data" 
                        description="No closed deals found for the team." 
                        className="m-4 border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50" 
                    />
                ) : teamData.map((member, i) => {
                    const percentage = totalRevenue > 0 ? (member.revenue / totalRevenue) * 100 : 0;
                    return (
                        <div key={member.id} className="p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-xl transition-colors group">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="relative">
                                        {member.avatar_url ? (
                                            <img src={member.avatar_url} alt={member.name} className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-2 border-white dark:border-gray-800 shadow-sm">
                                                {member.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        {i === 0 && (
                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-[8px]">👑</div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-gray-900 dark:text-white text-sm truncate">
                                            {member.name}
                                        </p>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                            {member.dealsWon} deals won
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-gray-900 dark:text-white text-base">
                                        {formatCurrency(member.revenue)}
                                    </p>
                                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                                        <TrendingUp size={10} /> Win Rate: {member.winRate}%
                                    </p>
                                </div>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className={`h-full rounded-full ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-700' : 'bg-cyan-500'}`}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
}
