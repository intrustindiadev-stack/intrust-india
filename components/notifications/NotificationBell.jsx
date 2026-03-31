'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

/**
 * @typedef {{ id: string; title: string; body: string; type: string; read: boolean; reference_id: string | null; reference_type: string | null; created_at: string }} Notification
 */

/**
 * @param {{ apiPath: string; variant?: 'admin' | 'minimal' | 'header' | 'navbar' }} props
 */
export default function NotificationBell({ apiPath, variant = 'admin' }) {
    const [open, setOpen] = useState(false);
    /** @type {[Notification[], React.Dispatch<React.SetStateAction<Notification[]>>]} */
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [pos, setPos] = useState({ top: 0, right: 0 });
    const [mounted, setMounted] = useState(false);
    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);
    const pollRef = useRef(null);
    const router = useRouter();

    useEffect(() => { setMounted(true); }, []);

    const fetchNotifications = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const res = await fetch(apiPath, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            if (!res.ok) return;
            const data = await res.json();
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch {
            // silently fail on poll
        }
    }, [apiPath]);

    useEffect(() => {
        fetchNotifications();
        pollRef.current = setInterval(fetchNotifications, 30000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [fetchNotifications]);

    // Close on outside click
    useEffect(() => {
        /** @param {MouseEvent} e */
        function handleOutside(e) {
            const target = /** @type {Node} */ (e.target);
            if (
                dropdownRef.current && !dropdownRef.current.contains(target) &&
                buttonRef.current && !buttonRef.current.contains(target)
            ) {
                setOpen(false);
            }
        }
        if (open) {
            document.addEventListener('mousedown', handleOutside);
            return () => document.removeEventListener('mousedown', handleOutside);
        }
    }, [open]);

    const markRead = async (/** @type {string | null} */ id) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const body = id ? { id } : { all: true };
            await fetch(apiPath, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify(body),
            });
            fetchNotifications();
        } catch {
            // ignore
        }
    };

    const handleOpen = () => {
        if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setPos({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right,
            });
        }
        setOpen(prev => !prev);
    };

    /** @param {string} type */
    const typeIcon = (type) => {
        if (type === 'success') return 'check_circle';
        if (type === 'error') return 'cancel';
        if (type === 'warning') return 'warning';
        return 'info';
    };

    /** @param {string} type */
    const typeColor = (type) => {
        if (type === 'success') return 'text-emerald-500';
        if (type === 'error') return 'text-red-500';
        if (type === 'warning') return 'text-amber-500';
        return 'text-blue-400';
    };

    /** @param {Notification} n */
    const handleNotificationClick = (n) => {
        if (!n.read) markRead(n.id);

        setOpen(false); // Close dropdown

        if (!n.reference_type) return;

        // Determine user context from the API path used by this bell instance
        const isAdmin = apiPath.includes('/admin');
        const isMerchant = apiPath.includes('/merchant');

        switch (n.reference_type) {
            // ── Merchant onboarding ──────────────────────────────────────────
            case 'merchant_application':
                // Admin gets notified → go to admin merchants list
                router.push('/admin/merchants');
                break;

            case 'merchant_approved':
                // Customer/user gets notified → go to subscription payment page
                router.push('/merchant-subscribe');
                break;

            case 'merchant_subscription':
                // Merchant gets notified after subscription payment
                router.push('/merchant/dashboard');
                break;

            // ── Shopping orders ──────────────────────────────────────────────
            case 'order':
            case 'shopping_order':
                if (n.reference_id) {
                    if (isAdmin) {
                        router.push(`/admin/shopping/orders/${n.reference_id}`);
                    } else if (isMerchant) {
                        router.push(`/merchant/shopping/orders`);
                    } else {
                        router.push(`/orders/${n.reference_id}`);
                    }
                } else {
                    if (isAdmin) router.push('/admin/shopping/orders');
                    else if (isMerchant) router.push('/merchant/shopping/orders');
                    else router.push('/orders');
                }
                break;

            // ── Wallet & adjustments ─────────────────────────────────────────
            case 'wallet':
            case 'wallet_adjustment':
                if (isAdmin) router.push('/admin/wallet-adjustments');
                else if (isMerchant) router.push('/merchant/wallet');
                else router.push('/wallet');
                break;

            // ── Payout requests ──────────────────────────────────────────────
            case 'payout_request':
                if (isAdmin) router.push('/admin/payouts');
                else router.push('/merchant/wallet');
                break;

            // ── Bank verification ────────────────────────────────────────────
            case 'bank_verification':
                // Merchant gets notified
                router.push('/merchant/settings');
                break;

            // ── Udhari / Store credit ────────────────────────────────────────
            case 'udhari_request':
                // Merchant gets notified of a new store credit request
                router.push('/merchant/udhari');
                break;

            case 'udhari_approved':
            case 'udhari_denied':
            case 'udhari_completed':
            case 'udhari_reminder':
            case 'udhari_overdue_alert':
                // Customer gets notified about their store credit status
                if (isMerchant) router.push('/merchant/udhari');
                else router.push('/store-credits');
                break;

            // ── Wholesale / Inventory ────────────────────────────────────────
            case 'wholesale_purchase':
            case 'merchant_inventory':
                // Merchant gets notified
                router.push('/merchant/shopping/inventory');
                break;

            // ── Lockin / Growth fund ─────────────────────────────────────────
            case 'lockin_balance':
                // Merchant gets notified
                router.push('/merchant/lockin');
                break;

            // ── Loans ────────────────────────────────────────────────────────
            case 'loan':
                if (isAdmin) router.push('/admin');
                else router.push('/loans/personal');
                break;

            // ── Gift cards ───────────────────────────────────────────────────
            case 'GIFT_CARD_PURCHASE':
                router.push('/my-giftcards');
                break;

            // ── Fallback ─────────────────────────────────────────────────────
            default:
                // No known route — do nothing (notification is still marked read)
                break;
        }
    };

    const dropdown = open && mounted ? createPortal(
        <div
            ref={dropdownRef}
            style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 99999 }}
            className="w-80 sm:w-96 bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">Notifications</span>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <button
                            onClick={() => markRead(null)}
                            className="text-xs text-[#D4AF37] hover:underline font-semibold"
                        >
                            Mark all read
                        </button>
                    )}
                    <button onClick={fetchNotifications} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <span className={`material-icons-round text-sm ${loading ? 'animate-spin' : ''}`}>refresh</span>
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-black/5 dark:divide-white/5">
                {notifications.length === 0 ? (
                    <div className="py-10 text-center">
                        <span className="material-icons-round text-slate-300 dark:text-slate-600 text-4xl">notifications_none</span>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">No notifications yet</p>
                    </div>
                ) : (
                    notifications.map((n) => (
                        <button
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`w-full text-left px-4 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors flex gap-3 items-start ${!n.read ? 'bg-[#D4AF37]/5' : ''}`}
                        >
                            <span className={`material-icons-round text-lg mt-0.5 flex-shrink-0 ${typeColor(n.type)}`}>
                                {typeIcon(n.type)}
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <p className={`text-sm font-semibold ${!n.read ? 'text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'}`}>{n.title}</p>
                                    {!n.read && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-[#D4AF37] mt-1" />}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{n.body}</p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                                    {new Date(n.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>,
        document.body
    ) : null;

    const buttonClass = variant === 'navbar'
        ? 'relative p-2 rounded-full text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
        : variant === 'minimal'
        ? 'relative p-2 rounded-full text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors'
        : variant === 'header'
        ? 'relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-90 duration-200'
        : 'relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors';

    return (
        <>
            <button
                ref={buttonRef}
                onClick={handleOpen}
                className={buttonClass}
                title="Notifications"
            >
                <span className="material-icons-round text-slate-600 dark:text-slate-300 text-xl">notifications</span>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center leading-none">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>
            {dropdown}
        </>
    );
}
