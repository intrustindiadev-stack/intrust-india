'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { Activity, Zap } from 'lucide-react';

function timeLabel(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function AdminActivityFeed({ initialActivity }) {
    const [feed, setFeed] = useState(initialActivity || []);
    const [pulse, setPulse] = useState(false);

    const prependItem = useCallback((tx, userName) => {
        const item = {
            id: tx.id,
            user: userName || 'Unknown User',
            time: timeLabel(tx.created_at),
            // `amount` is stored in rupees (e.g. "500.00")
            amount: `₹${Number(tx.amount || 0).toLocaleString('en-IN')}`,
            status:
                tx.status === 'completed' || tx.status === 'gateway_success'
                    ? 'success'
                    : tx.status === 'failed' || tx.status === 'aborted'
                        ? 'error'
                        : 'info',
        };
        setFeed(prev => [item, ...prev].slice(0, 20));
        setPulse(true);
        setTimeout(() => setPulse(false), 1200);
    }, []);

    useEffect(() => {
        const supabase = createClient();

        const channel = supabase
            .channel('admin-live-activity')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'transactions' },
                async (payload) => {
                    const tx = payload.new;
                    // Resolve the user name inline from user_profiles (anon can read public profile names)
                    let userName = 'Unknown User';
                    try {
                        const { data } = await supabase
                            .from('user_profiles')
                            .select('full_name, email')
                            .eq('id', tx.user_id)
                            .maybeSingle();
                        userName = data?.full_name || data?.email || userName;
                    } catch (_) { /* ignore */ }
                    prependItem(tx, userName);
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [prependItem]);

    return (
        <div className="bg-white dark:bg-slate-800/50 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 sticky top-24">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1 font-[family-name:var(--font-outfit)] flex items-center gap-2">
                <Activity
                    className={`transition-colors duration-500 ${pulse ? 'text-emerald-500' : 'text-blue-500'}`}
                    size={20}
                />
                Live Activity Feed
            </h2>
            <p className="text-xs text-slate-400 font-medium mb-5 flex items-center gap-1">
                <Zap size={11} className="text-amber-400" />
                Auto-updates on new transactions
            </p>

            <div className="space-y-5 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {feed.map((activity, idx) => (
                    <div
                        key={`${activity.id}-${idx}`}
                        className={`flex items-start gap-4 pb-5 border-b border-slate-100 dark:border-slate-700/50 last:border-0 last:pb-0 group transition-all duration-500 ${idx === 0 && pulse ? 'bg-emerald-50/60 dark:bg-emerald-900/10 -mx-2 px-2 rounded-2xl' : ''}`}
                    >
                        <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center font-extrabold text-lg shrink-0 shadow-sm transition-transform group-hover:scale-105
                                ${activity.status === 'error'
                                    ? 'bg-red-50 text-red-600 border-2 border-red-100'
                                    : activity.status === 'success'
                                        ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-100'
                                        : 'bg-blue-50 text-blue-600 border-2 border-blue-100'
                                }`}
                        >
                            {(activity.user || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                    {activity.user}
                                </p>
                                <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    {activity.time}
                                </span>
                            </div>
                            {activity.action && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
                                    {activity.action}
                                </p>
                            )}
                            {activity.amount && (
                                <p className={`text-sm font-extrabold mt-1.5 ${activity.status === 'error' ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'
                                    }`}>
                                    {activity.amount}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
