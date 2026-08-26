'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Briefcase, Phone } from 'lucide-react';
import SkeletonCard from '@/components/shared/SkeletonCard';
import EmptyState from '@/components/ui/EmptyState';

const STATUS_COLOR = {
    new: 'bg-cyan-500',
    contacted: 'bg-amber-500',
    qualified: 'bg-purple-500',
    proposal: 'bg-pink-500',
    won: 'bg-emerald-500',
    lost: 'bg-rose-500',
};

const STATUS_BG = {
    new: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/20',
    contacted: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
    qualified: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20',
    proposal: 'bg-pink-50 dark:bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-500/20',
    won: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    lost: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20',
};

export default function RecentDealsTable({ leads, isLoading }) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }} 
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-[1.25rem] shadow-xl shadow-gray-200/20 dark:shadow-black/20 overflow-hidden border border-gray-100 dark:border-gray-700/50 relative"
        >
            <div className="flex justify-between items-center p-6 sm:p-8 pb-4 relative z-10">
                <div>
                    <h2 className="text-lg font-black text-gray-900 dark:text-white">Recent Deals</h2>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wide mt-1 uppercase">Latest pipeline activity</p>
                </div>
                <Link href="/crm/leads" className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 flex items-center gap-1 bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-100 dark:border-cyan-500/20 px-3 py-1.5 rounded-lg transition-colors hover:bg-cyan-100 dark:hover:bg-cyan-500/20">
                    View All <ArrowRight size={14} />
                </Link>
            </div>
            
            <div className="divide-y divide-gray-50 dark:divide-gray-700/30 px-4 pb-4 relative z-10">
                {isLoading ? (
                    <SkeletonCard type="list-item" count={4} />
                ) : leads.length === 0 ? (
                    <EmptyState 
                        icon={Briefcase} 
                        title="No active deals" 
                        description="Your pipeline is currently empty." 
                        className="m-4 border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50" 
                    />
                ) : leads.map((lead, i) => (
                    <Link
                        key={lead.id}
                        href={`/crm/leads/${lead.id}`}
                        className="flex items-center justify-between p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-xl transition-colors group cursor-pointer"
                    >
                        <div className="flex items-center gap-4 min-w-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-inner ${
                                i % 2 === 0 ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30' : 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30'
                            }`}>
                                {(lead.contact_name || lead.title || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate">
                                    {lead.contact_name || lead.title}
                                </p>
                                <div className="flex items-center gap-3 mt-1">
                                    {lead.phone && <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1"><Phone size={10} /> {lead.phone}</span>}
                                </div>
                            </div>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border capitalize flex-shrink-0 ${STATUS_BG[lead.status] || 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLOR[lead.status] || 'bg-gray-400'}`} />
                            {lead.status}
                        </span>
                    </Link>
                ))}
            </div>
        </motion.div>
    );
}
