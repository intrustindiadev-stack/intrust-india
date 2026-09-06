'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Bell, 
    CheckCheck, 
    ArrowLeft, 
    Package, 
    Gift, 
    Wallet, 
    Tag, 
    Clock, 
    ExternalLink, 
    ShieldCheck, 
    ShoppingBag, 
    Sparkles, 
    ChevronRight,
    CheckCircle2
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');
    const [markingAll, setMarkingAll] = useState(false);

    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch('/api/notifications?limit=50', {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
            }
        } catch (e) {
            console.error('Failed to load notifications:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();

        // Realtime subscription
        let channel = null;
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session?.user) return;
            channel = supabase
                .channel(`page_notifications_${session.user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${session.user.id}`
                    },
                    (payload) => {
                        setNotifications(prev => [payload.new, ...prev]);
                    }
                )
                .subscribe();
        });

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, [fetchNotifications]);

    const markAsRead = async (id) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ id })
            });

            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (e) {
            console.error('Failed to mark read:', e);
        }
    };

    const markAllAsRead = async () => {
        try {
            setMarkingAll(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ all: true })
            });

            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (e) {
            console.error('Failed to mark all read:', e);
        } finally {
            setMarkingAll(false);
        }
    };

    const getNotificationLink = (n) => {
        if (!n.reference_type) return null;
        switch (n.reference_type) {
            case 'order':
            case 'order_status':
            case 'order_delivery':
            case 'shopping_order':
                return n.reference_id ? `/orders/${n.reference_id}` : '/orders';
            case 'gift_card':
            case 'giftcard':
                return '/my-giftcards';
            case 'wallet':
            case 'wallet_credit':
            case 'wallet_topup':
                return '/wallet';
            case 'rewards':
            case 'coins':
                return '/rewards';
            case 'kyc':
            case 'kyc_verified':
                return '/profile/kyc';
            case 'merchant':
            case 'merchant_approved':
                return '/merchant/dashboard';
            default:
                return null;
        }
    };

    const getNotificationIcon = (n) => {
        const type = n.reference_type || n.type || '';
        if (type.includes('order') || type.includes('delivery')) return <Package size={18} className="text-blue-600 dark:text-blue-400" />;
        if (type.includes('gift')) return <Gift size={18} className="text-purple-600 dark:text-purple-400" />;
        if (type.includes('wallet') || type.includes('credit')) return <Wallet size={18} className="text-emerald-600 dark:text-emerald-400" />;
        if (type.includes('rewards') || type.includes('coin')) return <Sparkles size={18} className="text-amber-500" />;
        if (type.includes('kyc') || type.includes('verify')) return <ShieldCheck size={18} className="text-teal-600 dark:text-teal-400" />;
        return <Bell size={18} className="text-blue-600 dark:text-blue-400" />;
    };

    const filtered = notifications.filter(n => {
        if (activeFilter === 'unread') return !n.read;
        if (activeFilter === 'orders') return n.reference_type?.includes('order') || n.reference_type?.includes('delivery');
        if (activeFilter === 'rewards') return n.reference_type?.includes('reward') || n.reference_type?.includes('gift') || n.reference_type?.includes('coin');
        return true;
    });

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="w-full max-w-3xl mx-auto space-y-6 pb-24">
            {/* Header with Navigation */}
            <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-700 dark:text-white transition-colors"
                        aria-label="Back"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                Notifications
                            </h1>
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-xs font-black">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            Updates on orders, wallet cashback, and local deals
                        </p>
                    </div>
                </div>

                {unreadCount > 0 && (
                    <button
                        onClick={markAllAsRead}
                        disabled={markingAll}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 text-xs font-bold flex items-center gap-1.5 transition-colors border border-blue-200/50 dark:border-blue-900/40"
                    >
                        <CheckCheck size={14} />
                        <span>Mark All Read</span>
                    </button>
                )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {[
                    { id: 'all', label: 'All Notifications' },
                    { id: 'unread', label: `Unread (${unreadCount})` },
                    { id: 'orders', label: 'Orders & Deliveries' },
                    { id: 'rewards', label: 'Cashback & Rewards' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveFilter(tab.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                            activeFilter === tab.id
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Notifications List */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(n => (
                        <div key={n} className="h-20 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="py-16 text-center rounded-3xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 p-8 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                        <Bell size={28} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {activeFilter === 'unread' ? 'You are all caught up!' : 'No notifications yet'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                        We will notify you here when your orders update, wallet cashbacks arrive, or special flash deals drop.
                    </p>
                    <Link
                        href="/shop"
                        className="mt-5 px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
                    >
                        Explore Deals & Shop
                    </Link>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {filtered.map(n => {
                        const targetHref = getNotificationLink(n);
                        const CardWrapper = targetHref ? Link : 'div';
                        const isUnread = !n.read;

                        return (
                            <CardWrapper
                                key={n.id}
                                href={targetHref || '#'}
                                onClick={() => {
                                    if (isUnread) markAsRead(n.id);
                                }}
                                className={`group flex items-start gap-3.5 p-4 rounded-2xl border transition-all ${
                                    isUnread
                                        ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-900/40 shadow-xs'
                                        : 'bg-white dark:bg-white/[0.02] border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'
                                }`}
                            >
                                <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-0.5 ${
                                    isUnread ? 'bg-blue-600/15 dark:bg-blue-500/20' : 'bg-slate-100 dark:bg-white/5'
                                }`}>
                                    {getNotificationIcon(n)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <h4 className={`text-xs font-bold truncate ${
                                            isUnread ? 'text-blue-950 dark:text-white' : 'text-slate-800 dark:text-slate-200'
                                        }`}>
                                            {n.title}
                                        </h4>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {isUnread && (
                                                <span className="w-2 h-2 rounded-full bg-blue-600" />
                                            )}
                                            <span className="text-[10px] text-slate-400 font-medium">
                                                {n.created_at ? new Date(n.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                                            </span>
                                        </div>
                                    </div>

                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                                        {n.body || n.message}
                                    </p>

                                    {targetHref && (
                                        <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 group-hover:underline">
                                            <span>View Details</span>
                                            <ChevronRight size={13} />
                                        </div>
                                    )}
                                </div>
                            </CardWrapper>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
