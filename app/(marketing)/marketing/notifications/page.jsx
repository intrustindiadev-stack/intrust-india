'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
    Bell, 
    CheckCheck, 
    Trophy, 
    Megaphone, 
    Sparkles, 
    ArrowRight, 
    Check, 
    ShieldAlert, 
    Coins,
    Calendar
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import MarketingBreadcrumbs from '@/components/marketing/layout/MarketingBreadcrumbs';
import { timeAgo } from '@/components/notifications/NotificationBell';

export default function MarketingNotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch('/api/notifications?limit=50', {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
            }
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const markAllRead = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ all: true }),
            });
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    };

    const handleNotificationClick = async (n) => {
        // Mark as read
        if (!n.read) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                fetch('/api/notifications', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({ id: n.id }),
                }).catch(() => {});
            }
            setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
        }

        if (n.action_url) {
            router.push(n.action_url);
            return;
        }

        switch (n.reference_type) {
            case 'sponsorship':
                router.push('/marketing/daily-challenge?tab=sponsor');
                break;
            case 'daily_challenge':
                router.push('/marketing/daily-challenge');
                break;
            case 'campaign_reward':
            case 'marketing':
                router.push('/marketing/transactions');
                break;
            case 'marketing_target':
                router.push('/marketing/targets');
                break;
            default:
                router.push('/marketing');
                break;
        }
    };

    const getIcon = (referenceType) => {
        switch (referenceType) {
            case 'sponsorship':
                return <Megaphone size={18} className="text-blue-500" />;
            case 'daily_challenge':
                return <Trophy size={18} className="text-amber-500" />;
            case 'campaign_reward':
                return <Coins size={18} className="text-emerald-500" />;
            default:
                return <Bell size={18} className="text-indigo-500" />;
        }
    };

    const filtered = notifications.filter(n => {
        if (filter === 'UNREAD') return !n.read;
        if (filter === 'REWARDS') return n.reference_type === 'daily_challenge' || n.reference_type === 'campaign_reward';
        if (filter === 'SPONSOR') return n.reference_type === 'sponsorship';
        return true;
    });

    return (
        <div className="space-y-6 sm:space-y-8 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4">
                <MarketingBreadcrumbs
                    customTitle="Marketing Notifications"
                    customSubtitle="Stay tuned with challenge rewards, sponsorship confirmations, and promotional cashbacks."
                />

                <div className="flex items-center gap-2">
                    <button
                        onClick={markAllRead}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all"
                    >
                        <CheckCheck size={14} className="text-blue-600" />
                        <span>Mark all read</span>
                    </button>
                </div>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {['ALL', 'UNREAD', 'REWARDS', 'SPONSOR'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            filter === f
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                        }`}
                    >
                        {f === 'ALL' ? 'All Alerts' : f === 'UNREAD' ? 'Unread' : f === 'REWARDS' ? 'Rewards & Cashback' : 'Sponsorships'}
                    </button>
                ))}
            </div>

            {/* Notifications Feed */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80">
                {loading ? (
                    <div className="p-12 text-center text-slate-400">
                        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto mb-2" />
                        <span className="text-xs font-bold">Loading updates...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mx-auto">
                            <Bell size={24} />
                        </div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">All caught up!</h4>
                        <p className="text-xs text-slate-500 max-w-xs mx-auto">
                            No marketing alerts right now. Participate in today&apos;s daily challenge or share product links to earn rewards!
                        </p>
                    </div>
                ) : (
                    filtered.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => handleNotificationClick(item)}
                            className={`p-4 sm:p-5 flex items-start gap-3.5 cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50 ${
                                !item.read ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                            }`}
                        >
                            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                                {getIcon(item.reference_type)}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <h4 className={`text-xs sm:text-sm truncate ${!item.read ? 'font-black text-slate-900 dark:text-white' : 'font-bold text-slate-700 dark:text-slate-300'}`}>
                                        {item.title}
                                    </h4>
                                    <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                                        {timeAgo(item.created_at)}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                    {item.body}
                                </p>
                            </div>

                            {!item.read && (
                                <div className="w-2 h-2 rounded-full bg-blue-600 mt-1 shrink-0" />
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
